# 任务清单：集成飞书机器人服务

## 阶段 1：项目结构与基础设施

### 1.1 安装依赖
- [x] 添加 `express` 依赖
- [x] 添加 TypeScript 类型定义 `@types/express`
- [x] 更新 `package.json` scripts（添加 `dev:server` 命令）

**验证标准：** `pnpm install` 成功，无依赖冲突

### 1.2 创建 Server 目录结构
- [x] 创建 `src/server/` 目录
- [x] 创建子目录：`src/server/lark/`, `src/server/controller/`, `src/server/service/`
- [x] 添加 `src/server/types.ts` 用于类型定义

**验证标准：** 目录结构符合设计文档

### 1.3 环境变量配置
- [x] 更新 `.env.example`，添加服务器配置（PORT）
- [x] 文档说明飞书应用配置步骤

**验证标准：** 环境变量文档完整

---

## 阶段 2：飞书 WebSocket 客户端

### 2.1 实现 LarkWebSocketClient
- [x] 创建 `src/server/lark/client.ts`
- [x] 使用 `@larksuiteoapi/node-sdk` 的 `EventDispatcher`
- [x] 监听 `im.message.receive_v1` 事件
- [x] 提取用户 ID、聊天 ID、消息内容
- [x] 过滤非文本消息
- [x] 错误处理和日志记录

**验证标准：**
- 单元测试：能正确解析飞书事件
- 手动测试：能接收飞书消息

### 2.2 实现消息发送功能
- [x] 创建 `src/server/lark/sender.ts`
- [x] 实现 `sendTextMessage()` 方法
- [x] 实现 `sendCardMessage()` 方法（可选）
- [x] 实现 `updateMessage()` 方法

**验证标准：**
- 单元测试：消息格式正确
- 手动测试：能发送消息到飞书

---

## 阶段 3：Agent 集成层

### 3.1 创建 AgentInvoker 接口
- [x] 创建 `src/server/service/agent-invoker.ts`
- [x] 定义 `AgentInvoker` 接口
- [x] 定义 `AgentResponse` 类型
- [x] 实现 `LangChainAgentInvoker` 类

**验证标准：** 类型定义完整，TypeScript 编译通过

### 3.2 实现 Agent 调用逻辑
- [x] 导入现有的 `agent` 实例
- [x] 实现 `chat()` 方法：
  - 使用 `agent.invoke()` 或 `agent.stream()`
  - 传递 `thread_id` 作为 `config.configurable.thread_id`
  - 处理流式响应
- [x] 实现 `chat()` 的 AsyncGenerator 版本

**验证标准：**
- 单元测试：能调用 agent 并返回响应
- 手动测试：与现有 agent 行为一致

### 3.3 处理 Agent 响应
- [x] 解析 Agent 输出格式
- [x] 提取最终消息内容
- [x] 处理工具调用结果
- [x] 转换为飞书消息格式

**验证标准：**
- 单元测试：响应格式正确
- 手动测试：工具调用结果显示正确

---

## 阶段 4：消息控制器

### 4.1 创建 MessageController
- [x] 创建 `src/server/controller/message.ts`
- [x] 实现 `handleMessage()` 方法
- [x] 调用 AgentInvoker 处理消息
- [x] 发送响应到飞书

**验证标准：**
- 单元测试：消息处理流程正确
- 集成测试：端到端流程可用

### 4.2 实现流式响应
- [x] 发送初始"思考中..."消息
- [x] 使用 AsyncGenerator 流式更新消息
- [x] 节流更新（200ms 间隔，避免 API 限流）
- [x] 完成后发送最终消息

**验证标准：**
- 手动测试：能看到流式更新
- 性能测试：更新频率合理

---

## 阶段 5：Server 应用入口

### 5.1 创建 ServerApp
- [x] 创建 `src/server/app.ts`
- [x] 初始化 Express 应用
- [x] 配置静态文件服务（可选）
- [x] 注册辅助路由（健康检查等）

**验证标准：** 服务器能正常启动

### 5.2 连接组件
- [x] 初始化 LarkWebSocketClient
- [x] 初始化 MessageController
- [x] 注册事件监听器
- [x] 启动 HTTP 服务器

**验证标准：**
- 服务器无错误启动
- WebSocket 连接成功

### 5.3 添加启动脚本
- [x] 创建 `src/server/index.ts`
- [x] 实现 `startServer()` 函数
- [x] 错误处理和优雅关闭

**验证标准：** `pnpm dev:server` 能正常启动

---

## 阶段 6：测试与文档

### 6.1 集成测试
- [x] 测试完整对话流程：
  - 用户：昨天打车花了20元
  - Agent：成功保存到飞书表格
- [x] 测试多轮对话：
  - 用户：花了50元
  - Agent：询问分类
  - 用户：交通
  - Agent：成功保存
- [x] 测试工具调用：
  - 日期解析工具
  - 保存到飞书表格工具

**验证标准：** 所有测试场景通过

### 6.2 错误处理测试
- [x] 测试网络错误
- [x] 测试飞书 API 错误
- [x] 测试 Agent 错误
- [x] 测试并发消息

**验证标准：** 错误被正确处理和记录

### 6.3 更新文档
- [x] 更新 `CLAUDE.md`：添加 Server 架构说明
- [x] 更新 `README.md`：添加部署和使用指南
- [x] 添加飞书应用配置指南
- [x] 添加环境变量说明

**验证标准：** 文档清晰完整

---

## 阶段 7：优化与清理

### 7.1 代码审查
- [x] 检查代码风格一致性
- [x] 检查类型安全
- [x] 检查错误处理
- [x] 移除未使用的代码

**验证标准：** ESLint 无错误，TypeScript 编译通过

### 7.2 性能优化
- [x] 检查内存泄漏
- [x] 优化消息更新频率
- [x] 添加日志记录（可选）

**验证标准：** 长时间运行无性能问题

### 7.3 安全检查
- [x] 检查敏感信息泄露
- [x] 验证环境变量使用
- [x] 检查依赖漏洞

**验证标准：** 安全扫描通过

---

## 依赖关系

- **阶段 1 → 阶段 2**: 必须先创建目录结构
- **阶段 2 → 阶段 3**: 必须先实现 WebSocket 客户端
- **阶段 3 → 阶段 4**: 必须先实现 Agent 调用
- **阶段 4 → 阶段 5**: 必须先实现消息控制器
- **阶段 5 → 阶段 6**: 必须先完成应用入口

## 并行任务

以下任务可以并行开发：
- **2.1 & 3.1**: WebSocket 客户端和 Agent 接口可以同时开发
- **2.2 & 3.2**: 消息发送和 Agent 调用可以同时开发
- **6.2 & 6.3**: 错误测试和文档编写可以同时进行

## 总计

- **总任务数**: 39 个
- **预估工作量**: 3-5 天
- **关键里程碑**:
  - 第 1 天: 阶段 1-2 完成（基础设施和 WebSocket）
  - 第 2 天: 阶段 3-4 完成（Agent 集成和消息控制）
  - 第 3 天: 阶段 5 完成（应用入口）
  - 第 4 天: 阶段 6 完成（测试和文档）
  - 第 5 天: 阶段 7 完成（优化和清理）
