# 设计文档：集成飞书机器人服务

## 架构概览

```
┌──────────────────────────────────────────────────────────────────┐
│                         飞书开放平台                               │
│                    Lark Open Platform                             │
│                                                                   │
│  用户发送消息 ──────────────────────────────────┐                │
│  User sends message                            │                 │
│                                                ▼                 │
│                                   ┌──────────────────────┐       │
│                                   │   WebSocket 连接      │       │
│                                   │  (持久连接)           │       │
│                                   └──────────┬───────────┘       │
└──────────────────────────────────────────────┼───────────────────┘
                                               │
                                               │ im.message.receive_v1
                                               │ (事件推送)
                                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Server Layer                              │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  LarkWebSocketClient                                       │  │
│  │  - 管理 WebSocket 连接                                      │  │
│  │  - 接收飞书事件                                              │  │
│  │  - 解析事件数据                                              │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                        │
│                           │ userId, chatId, message               │
│                           ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  MessageController                                          │  │
│  │  - 处理消息路由                                              │  │
│  │  - 管理用户会话                                              │  │
│  │  - 协调响应流程                                              │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                        │
│                           │ chat(userId, message)                 │
│                           ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  AgentInvoker                                               │  │
│  │  - 封装 Agent 调用                                           │  │
│  │  - 处理流式响应                                              │  │
│  │  - 格式转换                                                  │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                        │
└───────────────────────────┼────────────────────────────────────────┘
                            │
                            │ invoke(agent, message, threadId)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Agent Layer                                 │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  LangChain Agent (src/agent.ts)                            │  │
│  │  - ChatOpenAI 模型                                          │  │
│  │  - Tools: parseDateExpression, saveExpenseToLark           │  │
│  │  - Checkpointer: MemorySaver                                │  │
│  │  - System Prompt: EXPENSE_SYSTEM_PROMPT                    │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                        │
│                           │ AgentResponse (stream)                │
│                           ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Tool Execution                                             │  │
│  │  - parseDateExpression: 日期解析                            │  │
│  │  - saveExpenseToLark: 保存到飞书表格                         │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                        │
└───────────────────────────┼────────────────────────────────────────┘
                            │
                            │ AgentResponse
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Response Flow                                  │
│                                                                   │
│  AgentInvoker 转换响应 ────► MessageController ────► Lark API    │
│  (AgentResponse)           (飞书消息格式)        (发送/更新)      │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## 组件设计

### 1. LarkWebSocketClient

**文件：** `src/server/lark/client.ts`

**职责：**
- 管理 WebSocket 连接生命周期
- 监听飞书事件（使用 `@larksuiteoapi/node-sdk` 的 `EventDispatcher`）
- 解析事件数据，提取关键信息
- 错误处理和重连逻辑

**接口：**
```typescript
class LarkWebSocketClient {
  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
    private readonly eventHandler: MessageEventHandler
  ) {}

  // 启动 WebSocket 连接
  start(): void {
    const larkWsClient = new Lark_WSClient({
      appId: this.appId,
      appSecret: this.appSecret,
    });

    const dispatcher = new Lark.EventDispatcher({}).register({
      'im.message.receive_v1': async (event) => {
        const userId = event.sender?.sender_id?.open_id;
        const chatId = event.message.chat_id;
        const content = JSON.parse(event.message.content);

        await this.eventHandler({
          userId,
          chatId,
          message: content.text,
        });
      },
    });

    larkWsClient.start({ eventDispatcher: dispatcher });
  }

  // 停止连接
  stop(): void {
    // 清理资源
  }
}
```

**关键设计决策：**
- 使用 SDK 的 `EventDispatcher` 而非手动处理 WebSocket
- 依赖注入 `MessageEventHandler`，便于测试
- 只处理 `text` 类型消息，其他类型直接忽略

---

### 2. MessageController

**文件：** `src/server/controller/message.ts`

**职责：**
- 处理用户消息
- 管理用户会话（thread_id）
- 调用 AgentInvoker
- 发送初始响应和更新
- 处理错误和超时

**接口：**
```typescript
class MessageController {
  private userSessions = new Map<string, string>();

  constructor(
    private readonly agentInvoker: AgentInvoker,
    private readonly larkSender: LarkMessageSender
  ) {}

  async handleMessage({ userId, chatId, message }: MessageEvent): Promise<void> {
    // 1. 获取或创建 thread_id
    const threadId = this.getOrCreateThreadId(userId);

    // 2. 发送初始"思考中..."消息
    const { messageId } = await this.larkSender.sendTextMessage(
      chatId,
      '思考中...'
    );

    try {
      // 3. 调用 Agent（流式）
      const responseStream = this.agentInvoker.chat(userId, message, { threadId });

      // 4. 流式更新消息
      let fullContent = '';
      for await (const response of responseStream) {
        if (response.type === 'token') {
          fullContent += response.content;
          // 节流更新（每 200ms）
          await this.throttledUpdate(messageId, fullContent);
        } else if (response.type === 'final') {
          // 最终更新
          await this.larkSender.updateMessage(messageId, fullContent);
        }
      }
    } catch (error) {
      // 5. 错误处理
      await this.larkSender.updateMessage(
        messageId,
        `发生错误: ${error.message}`
      );
    }
  }

  private getOrCreateThreadId(userId: string): string {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, `thread_${userId}_${Date.now()}`);
    }
    return this.userSessions.get(userId)!;
  }

  private throttledUpdate = pThrottle(async (messageId: string, content: string) => {
    await this.larkSender.updateMessage(messageId, content);
  }, 200);
}
```

**关键设计决策：**
- 使用 `thread_id` 作为会话标识，利用 LangChain 的 MemorySaver
- 简单的内存存储会话，重启后丢失（可接受）
- 节流更新避免飞书 API 限流
- 错误时更新消息而非发送新消息（更好的用户体验）

---

### 3. AgentInvoker

**文件：** `src/server/service/agent-invoker.ts`

**职责：**
- 封装 LangChain Agent 调用
- 处理流式响应
- 转换响应格式

**接口：**
```typescript
interface AgentResponse {
  type: 'token' | 'tool' | 'final';
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
}

interface AgentInvoker {
  chat(
    userId: string,
    message: string,
    config?: { threadId?: string }
  ): AsyncGenerator<AgentResponse>;
}

class LangChainAgentInvoker implements AgentInvoker {
  constructor(private readonly agent: Agent) {}

  async *chat(
    userId: string,
    message: string,
    config?: { threadId?: string }
  ): AsyncGenerator<AgentResponse> {
    // 调用 agent.stream() 获取流式响应
    const stream = await this.agent.stream(
      { messages: [{ role: 'user', content: message }] },
      {
        configurable: {
          thread_id: config?.threadId || `thread_${userId}_${Date.now()}`,
        },
      }
    );

    // 处理流式响应
    for await (const chunk of stream) {
      // chunk 结构：
      // {
      //   messages: [{ role: 'assistant', content: '...' }],
      //   ...
      // }

      for (const msg of chunk.messages || []) {
        if (msg.content) {
          // 提取文本内容
          const content = this.extractTextContent(msg.content);
          yield {
            type: 'token',
            content,
          };
        }
      }
    }

    // 最终响应
    yield {
      type: 'final',
      content: '',
    };
  }

  private extractTextContent(content: any): string {
    // LangChain 消息内容可能是字符串或复杂对象
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map(item => {
          if (typeof item === 'string') return item;
          if (item.type === 'text') return item.text;
          return '';
        })
        .join('');
    }
    return '';
  }
}
```

**关键设计决策：**
- 使用 `agent.stream()` 而非 `agent.invoke()`，支持流式响应
- 使用 `thread_id` 作为会话标识，利用 MemorySaver
- AsyncGenerator 接口，便于流式处理
- 简化响应格式，只提取文本内容

---

### 4. LarkMessageSender

**文件：** `src/server/lark/sender.ts`

**职责：**
- 发送消息到飞书
- 更新已发送的消息
- 格式化消息内容

**接口：**
```typescript
class LarkMessageSender {
  constructor(
    private readonly appId: string,
    private readonly appSecret: string
  ) {
    this.larkClient = new Lark.Client({
      appId,
      appSecret,
    });
  }

  async sendTextMessage(
    chatId: string,
    text: string
  ): Promise<{ messageId: string }> {
    const response = await this.larkClient.im.message.create({
      data: {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
      },
    });

    return {
      messageId: response.data?.message_id,
    };
  }

  async updateMessage(
    messageId: string,
    text: string
  ): Promise<void> {
    // 注意：飞书 API 不支持直接更新文本消息
    // 实现：
    // 1. 删除旧消息
    // 2. 发送新消息
    // 或者使用卡片消息（支持更新）

    // 简化实现：发送新消息
    // await this.sendTextMessage(chatId, text);
  }

  async sendCardMessage(
    chatId: string,
    content: string
  ): Promise<{ messageId: string }> {
    const card = {
      schema: '2.0',
      body: {
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'plain_text',
              content,
            },
          },
        ],
      },
    };

    const response = await this.larkClient.im.message.create({
      data: {
        receive_id: chatId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      },
    });

    return {
      messageId: response.data?.message_id,
    };
  }

  async updateCardMessage(
    messageId: string,
    content: string
  ): Promise<void> {
    const card = {
      schema: '2.0',
      body: {
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'plain_text',
              content,
            },
          },
        ],
      },
    };

    await this.larkClient.im.message.patch({
      path: { message_id: messageId },
      data: {
        msg_type: 'interactive',
        content: JSON.stringify(card),
      },
    });
  }
}
```

**关键设计决策：**
- 文本消息不支持更新，使用卡片消息替代
- 卡片消息更灵活，支持流式更新
- 复用现有的 `@larksuiteoapi/node-sdk`

---

### 5. ServerApp

**文件：** `src/server/app.ts`

**职责：**
- 初始化 Express 服务器
- 连接所有组件
- 启动 HTTP 服务器和 WebSocket

**接口：**
```typescript
class ServerApp {
  private larkWsClient: LarkWebSocketClient;
  private messageController: MessageController;

  constructor() {
    const agentInvoker = new LangChainAgentInvoker(agent);
    const larkSender = new LarkMessageSender(
      process.env.FEISHU_APP_ID!,
      process.env.FEISHU_APP_SECRET!
    );

    this.messageController = new MessageController(
      agentInvoker,
      larkSender
    );

    this.larkWsClient = new LarkWebSocketClient(
      process.env.FEISHU_APP_ID!,
      process.env.FEISHU_APP_SECRET!,
      this.messageController.handleMessage.bind(this.messageController)
    );
  }

  async start(port: number = 3000): Promise<void> {
    const app = express();

    // 健康检查
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // 静态文件服务（可选）
    app.use('/static', express.static('public'));

    // 启动 HTTP 服务器
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });

    // 启动 WebSocket 连接
    this.larkWsClient.start();
  }

  async stop(): Promise<void> {
    this.larkWsClient.stop();
  }
}
```

**关键设计决策：**
- 简单的 Express 服务器，仅用于辅助功能（健康检查）
- 主要逻辑在 WebSocket
- 所有组件在构造函数中初始化
- 提供 `start()` 和 `stop()` 方法便于控制

---

## 数据流

### Message Processing Flow

```
1. 用户发送消息到飞书机器人
   User: "昨天打车花了20元"

2. 飞书推送事件到 WebSocket
   Event: {
     sender: { sender_id: { open_id: "user_123" } },
     message: {
       chat_id: "chat_456",
       content: "{\"text\":\"昨天打车花了20元\"}"
     }
   }

3. LarkWebSocketClient 解析事件
   userId = "user_123"
   chatId = "chat_456"
   message = "昨天打车花了20元"

4. MessageController 处理消息
   - 获取 thread_id: "thread_user_123_1234567890"
   - 发送初始消息: "思考中..."

5. AgentInvoker 调用 Agent
   agent.stream(
     { messages: [{ role: 'user', content: "昨天打车花了20元" }] },
     { configurable: { thread_id: "thread_user_123_1234567890" } }
   )

6. Agent 处理消息
   - 理解用户意图
   - 提取信息：20元，交通，昨天
   - 调用 parseDateExpression 工具
   - 调用 saveExpenseToLark 工具
   - 生成响应："已成功记录：昨天打车花了20元，分类：交通"

7. AgentInvoker 转换响应
   yield { type: 'token', content: '已成功记录：' }
   yield { type: 'token', content: '昨天打车花了20元，' }
   yield { type: 'token', content: '分类：交通' }
   yield { type: 'final' }

8. MessageController 流式更新消息
   - 更新 1: "已成功记录："
   - 更新 2: "已成功记录：昨天打车花了20元，"
   - 更新 3: "已成功记录：昨天打车花了20元，分类：交通"

9. 用户在飞书中看到响应
   Bot: "已成功记录：昨天打车花了20元，分类：交通"
```

---

## 错误处理策略

### 1. WebSocket 连接错误
**Strategy:** 自动重连
- 捕获连接错误
- 等待 5 秒后重试
- 记录错误日志

### 2. Agent 调用错误
**Strategy:** 友好错误消息
- 捕获异常
- 更新消息为错误提示
- 记录详细错误日志

### 3. 飞书 API 错误
**Strategy:** 重试 + 降级
- 网络错误：重试 3 次
- API 限流：等待后重试
- 其他错误：记录并跳过

### 4. 消息解析错误
**Strategy:** 忽略无效消息
- 记录警告日志
- 不发送响应

---

## 权衡与取舍

### 1. 会话存储：内存 vs 数据库
**Choice:** 内存存储
**Reason:**
- 简化实现
- 无需额外依赖
- 重启后丢失可接受（用户重新开始对话）

**Future:** 可以接入 Redis 或数据库

### 2. 消息格式：文本 vs 卡片
**Choice:** 卡片消息（支持更新）
**Reason:**
- 支持流式更新
- 更好的用户体验
- 飞书官方推荐

**Trade-off:** 实现稍复杂

### 3. 流式响应：实时 vs 批量
**Choice:** 流式更新（200ms 节流）
**Reason:**
- 更好的用户体验
- 避免 API 限流

**Trade-off:** 实现复杂度增加

### 4. Agent 调用：stream() vs invoke()
**Choice:** stream()
**Reason:**
- 支持流式响应
- 更好的用户体验

**Trade-off:** 需要处理 AsyncGenerator

---

## 安全考虑

1. **环境变量：** 敏感信息（APP_ID, APP_SECRET）通过环境变量配置
2. **输入验证：** 验证用户输入，防止注入攻击
3. **错误信息：** 不暴露敏感信息给用户
4. **日志记录：** 记录关键操作和错误，便于排查

---

## 性能考虑

1. **连接管理：** 单个 WebSocket 连接处理所有消息
2. **消息更新：** 节流（200ms）避免 API 限流
3. **会话管理：** 内存存储，快速访问
4. **并发处理：** 多用户消息并发处理（LangChain Agent 是线程安全的）

---

## 测试策略

1. **单元测试：**
   - LarkWebSocketClient: 事件解析
   - MessageController: 消息处理流程
   - AgentInvoker: 响应转换

2. **集成测试：**
   - 端到端流程：消息 → Agent → 响应
   - 使用 Mock Agent 避免实际调用

3. **手动测试：**
   - 连接飞书机器人
   - 发送测试消息
   - 验证响应

---

## 未来增强

1. **持久化会话：** 使用 Redis 存储会话
2. **多用户支持：** 增加用户认证和权限管理
3. **消息队列：** 使用队列处理高并发
4. **监控告警：** 添加性能监控和错误告警
5. **部署方案：** Docker 容器化，支持水平扩展