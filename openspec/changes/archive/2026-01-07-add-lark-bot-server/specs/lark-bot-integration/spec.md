# 飞书机器人集成

## ADDED Requirements

### Requirement:通过 WebSocket 接收飞书消息

系统 SHALL 建立与飞书开放平台的 WebSocket 连接，实时接收用户消息。系统 MUST 过滤非文本消息，并从传入事件中提取用户的 open_id、chat_id 和消息内容。

#### Scenario:机器人接收用户消息

**假设** 飞书机器人服务器正在运行
**当** 用户在飞书中向机器人发送文本消息时
**那么** 系统接收到 `im.message.receive_v1` 事件
**并且** 提取用户的 `open_id`、`chat_id` 和消息内容
**并且** 过滤掉非文本消息（图片、文件等）

#### Scenario:WebSocket 连接建立

**假设** 服务器使用有效的 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 启动
**当** LarkWebSocketClient 初始化时
**那么** 它建立持久 WebSocket 连接
**并且** 注册 `im.message.receive_v1` 事件处理器
**并且** 记录连接状态

#### Scenario:WebSocket 连接错误处理

**假设** WebSocket 连接处于活动状态
**当** 发生网络错误或断开连接时
**那么** 系统记录错误
**并且** 5 秒后自动尝试重连
**并且** 重连后保持消息处理能力

---

### Requirement:使用 LangChain Agent 处理消息

系统 SHALL 使用现有的 LangChain Agent 处理接收到的消息并向用户返回响应。系统 MUST 使用 thread_id 维护对话上下文，并使用 MemorySaver 支持多轮对话。

#### Scenario:简单记账

**假设** 用户向机器人发送"昨天打车花了20元"
**当** MessageController 处理消息时
**那么** 它创建或获取用户的 thread_id
**并且** 向用户发送初始"思考中..."消息
**并且** 使用消息调用 LangChain Agent
**并且** Agent 调用 parseDateExpression 和 saveExpenseToLark 工具
**并且** 系统使用 Agent 的最终响应更新消息
**并且** 用户看到"已成功记录：昨天打车花了20元，分类：交通"

#### Scenario:信息缺失的多轮对话

**假设** 用户向机器人发送"花了50元"
**当** MessageController 处理消息时
**那么** 它使用用户现有的 thread_id（对话历史）
**并且** Agent 检测到缺少分类和日期信息
**并且** Agent 询问"请问这是什么类型的消费？"
**并且** 用户回复"餐饮"
**并且** Agent 处理完整信息
**并且** 将消费记录保存到飞书多维表格

#### Scenario:流式响应更新

**假设** Agent 正在生成响应
**当** Agent 产生流式 token 时
**那么** 系统每 200ms 节流更新一次消息
**并且** 使用累积内容更新飞书消息
**并且** 避免触及飞书 API 限流

---

### Requirement:向飞书发送响应

系统 SHALL 通过飞书 API 将 Agent 响应发送回用户，并支持消息更新。

#### Scenario:发送文本消息

**假设** Agent 已生成响应
**当** 系统向飞书发送响应时
**那么** 它使用飞书 API 的 `im.message.create` 端点
**并且** 将 `receive_id` 设置为用户的 chat_id
**并且** 将 `msg_type` 设置为 "text" 或 "interactive"
**并且** 将内容格式化为 JSON
**并且** 返回 message_id 以便后续更新

#### Scenario:更新卡片消息

**假设** 已使用 message_id 发送卡片消息
**当** Agent 产生额外内容时
**那么** 系统使用飞书 API 的 `im.message.patch` 端点
**并且** 使用新文本更新卡片内容
**并且** 用户看到消息原位更新

#### Scenario:处理 API 限流

**假设** 系统正在频繁发送更新
**当** 飞书 API 返回限流错误时
**那么** 系统等待指定的重试延迟时间
**并且** 重试请求
**并且** 记录限流事件以供监控

---

### Requirement:维护用户对话会话

系统 SHALL 使用 thread_id 管理每个用户的对话会话，以支持多轮对话。

#### Scenario:为新用户创建会话

**假设** open_id 为 "user_123" 的用户发送第一条消息
**当** MessageController 处理消息时
**那么** 它生成唯一的 thread_id: "thread_user_123_<时间戳>"
**并且** 将映射存储在内存中
**并且** 将 thread_id 传递给 Agent
**并且** Agent 使用 MemorySaver 维护对话状态

#### Scenario:复用现有会话

**假设** open_id 为 "user_123" 的用户有现有会话
**当** 用户发送后续消息时
**那么** MessageController 检索现有 thread_id
**并且** 将其传递给 Agent
**并且** Agent 回忆之前的对话上下文
**并且** 对话自然流畅，无需重复信息

#### Scenario:内存中的会话持久化

**假设** 服务器正在运行，有活跃用户会话
**当** 服务器重启时
**那么** 所有内存中的会话丢失
**并且** 用户必须开始新对话
**并且** 对于初始实现此行为可接受

---

### Requirement:错误处理和恢复

系统 SHALL 优雅地处理错误并向用户提供有意义的反馈。

#### Scenario:Agent 调用错误

**假设** MessageController 正在处理消息
**当** Agent 抛出异常（例如 LLM API 错误）时
**那么** 系统捕获异常
**并且** 更新消息为"发生错误，请稍后重试"
**并且** 记录详细错误以供调试
**并且** 继续处理其他消息

#### Scenario:无效消息内容

**假设** LarkWebSocketClient 接收到事件
**当** 消息内容为空或格式错误时
**那么** 系统记录警告
**并且** 不向用户发送响应
**并且** 继续处理其他事件

#### Scenario:飞书 API 认证失败

**假设** 服务器正在启动
**当** FEISHU_APP_ID 或 FEISHU_APP_SECRET 无效时
**那么** WebSocket 连接失败
**并且** 系统记录清晰的错误消息
**并且** 以非零状态码退出
**并且** 提供检查环境变量的说明

---

### Requirement:服务器生命周期管理

系统 SHALL 提供清晰的服务器启动和关闭流程。

#### Scenario:启动服务器

**假设** 所有环境变量已配置
**当** 用户运行 `pnpm dev:server` 时
**那么** Express 服务器在配置的 PORT（默认 3000）上启动
**并且** 与飞书的 WebSocket 连接已建立
**并且** 健康检查端点返回 `{ status: 'ok' }`
**并且** 控制台记录"🚀 Server running at http://localhost:3000"

#### Scenario:优雅关闭

**假设** 服务器正在运行
**当** 用户发送 SIGINT (Ctrl+C) 或 SIGTERM 时
**那么** 系统停止接受新消息
**并且** 完成处理进行中的消息
**并且** 关闭 WebSocket 连接
**并且** 优雅退出

#### Scenario:健康检查

**假设** 服务器正在运行
**当** 向 `/health` 发起 GET 请求时
**那么** 系统返回 HTTP 200
**并且** 响应体为 `{ status: 'ok', uptime: <seconds> }`

---

## MODIFIED Requirements

### Requirement:项目架构

代码库 SHALL 保持 Agent 层和 Server 层的清晰分离。Agent 层 MUST 保持独立可测试，无需 Server 依赖。Server 层 SHALL 通过良好定义的接口（AgentInvoker）调用 Agent，而不耦合到 Agent 实现细节。

#### Scenario:Server 和 Agent 分离

**假设** 代码库同时包含 Agent 和 Server 代码
**当** 检查目录结构时
**那么** `src/agent.ts`、`src/tools/`、`src/prompts.ts` 包含 Agent 逻辑
**并且** `src/server/` 包含所有 Server 逻辑
**并且** Server 从 `src/agent.ts` 导入 Agent
**并且** Agent 没有对 Server 代码的依赖
**并且** 两者可以独立测试

#### Scenario:Agent 集成接口

**假设** Server 需要调用 Agent
**当** MessageController 调用 AgentInvoker.chat() 时
**那么** 它传递 userId、message 和可选的 threadId
**并且** 接收 AgentResponse 的 AsyncGenerator
**并且** Agent 使用 LangChain 的 thread_id 进行会话管理
**并且** Agent 的 MemorySaver 维护对话状态
