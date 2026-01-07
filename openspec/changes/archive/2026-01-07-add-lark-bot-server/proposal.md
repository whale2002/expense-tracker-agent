# 提案：集成飞书机器人服务

## 概要

集成飞书机器人服务，通过 WebSocket 连接接收用户消息，并使用现有的 LangChain Agent 处理记账请求。Server 与 Agent 代码完全分离，通过清晰的接口进行通信。

## why

当前 Agent 只能在 LangGraph Studio 中调试，无法实际部署和用户使用。需要：

1. **实际可用性**：将 Agent 集成到飞书机器人，让用户可以通过飞书聊天使用
2. **架构清晰**：Agent 逻辑与 Server 逻辑分离，便于维护和测试
3. **简化实现**：使用 WebSocket 而非 Webhook，避免内网穿透等复杂配置
4. **保留独立性**：Agent 可以独立运行和测试，不依赖 Server

## 解决方案

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                         飞书 / Lark                          │
│                    用户发送消息 / User Message               │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server Layer (New)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    LarkWebSocketClient (WebSocket 连接管理)          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    MessageController (消息路由和处理)                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    AgentService (调用 Agent，处理流式响应)           │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ Simple Interface
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Layer (Existing)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │    LangChain Agent Graph                              │  │
│  │    - Tools: parseDateExpression, saveExpenseToLark   │  │
│  │    - Checkpointer: MemorySaver                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. **Server 层** (新增)

**LarkWebSocketClient** (`src/server/lark/client.ts`)

- 管理 WebSocket 连接
- 监听飞书事件（`im.message.receive_v1`）
- 事件分发到 MessageController

**MessageController** (`src/server/controller/message.ts`)

- 处理接收到的消息
- 提取用户 ID、聊天 ID、消息内容
- 调用 AgentService

**AgentService** (`src/server/service/agent.ts`)

- 封装 LangChain Agent 调用
- 处理流式响应更新
- 管理多用户会话状态

**ServerApp** (`src/server/app.ts`)

- Express 服务器（用于辅助功能）
- 静态文件服务
- 路由注册

#### 2. **Agent 层** (现有，少量修改)

**暴露 Agent 配置** (`src/agent.ts`)

- 导出 `agent` 实例（已存在）
- 添加类型定义用于 server 调用

#### 3. **集成层**

**AgentInvoker** (`src/server/service/agent-invoker.ts`)

- 简单的封装层
- 提供 `chat(userId, message, config)` 接口
- 处理 agent 的流式响应
- 将响应转换为飞书卡片消息格式

### 职责分离

**Server 职责：**

- WebSocket 连接管理
- 消息接收和发送
- 用户会话管理
- 消息格式转换（飞书格式 ↔ Agent 格式）

**Agent 职责：**

- 自然语言理解
- 工具调用（日期解析、保存到飞书表格）
- 对话状态管理（通过 MemorySaver）
- 生成响应

**接口定义：**

```typescript
interface AgentInvoker {
  chat(
    userId: string,
    message: string,
    config?: {
      threadId?: string;
    }
  ): AsyncGenerator<AgentResponse>;
}

interface AgentResponse {
  type: "token" | "tool" | "final";
  content: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: any;
}
```

### 简化设计选择

相比参考项目，我们采用更简化的设计：

1. **不需要 OAuth 认证**：

   - 机器人直接接收消息，无需用户授权
   - 如果需要区分用户，使用飞书的 `open_id`

2. **不需要 MCP 客户端**：

   - Agent 工具直接在代码中定义
   - 不需要动态加载工具

3. **使用简单消息格式**：

   - 不需要复杂的卡片消息
   - 使用文本消息即可

4. **会话管理简化**：
   - 使用 `thread_id` 作为会话标识
   - 不需要复杂的上下文管理服务

## 实施计划

详见 `tasks.md`。

详见 `design.md`。

## 备选方案

### 方案 1：使用 Webhook 模式

**优点：**

- 支持 Lark（飞书海外版）
- 不需要保持长连接

**缺点：**

- 需要内网穿透（ngrok 等）
- 本地开发复杂
- 部署时需要公网可访问的地址

**决策：** 采用 WebSocket 模式，更简单且适合国内使用

### 方案 2：完全复用参考项目的架构

**优点：**

- 成熟的架构
- 功能完整

**缺点：**

- 过度设计（OAuth、MCP 等不需要）
- 与现有 Agent 架构不兼容
- 需要大量改动

**决策：** 灵活借鉴，简化实现

### 方案 3：直接将 Agent 嵌入 Server

**优点：**

- 代码更集中

**缺点：**

- Agent 无法独立测试
- 违反单一职责原则
- 难以维护

**决策：** 保持 Agent 和 Server 分离

## 影响评估

### 破坏性变更

无。这是一个新功能，不影响现有代码。

### 依赖项

新增依赖：

- `express`: HTTP 服务器
- `@types/express`: TypeScript 类型定义

已存在依赖：

- `@larksuiteoapi/node-sdk`: 用于飞书 API

### 性能

- WebSocket 连接：轻量级，单个连接即可处理所有消息
- Agent 调用：与现有性能相同
- 会话管理：内存存储，重启后丢失（可接受）

## 待解决问题

1. **是否需要用户认证？**

   - 建议：暂不需要，机器人直接接收消息
   - 如果需要区分用户，使用 `open_id`

2. **是否需要持久化会话？**

   - 建议：暂不需要，使用内存存储
   - 后续可以接入数据库或 Redis

3. **是否需要流式响应？**
   - 建议：是，提升用户体验
   - 实现方式：发送初始消息 → 更新消息内容

## 参考资料

- 飞书开放平台文档: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/message
- 飞书机器人开发指南: https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/bot-add
- 参考实现: https://github.com/larksuite/lark-samples/tree/main/mcp_larkbot_demo/nodejs
