<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered expense tracking agent that uses LangChain and LangGraph to enable natural language bookkeeping with automatic data persistence to Feishu (Lark) multi-dimensional tables. Users can record expenses and income through conversational input in Chinese.

The project consists of two main components:
1. **Agent Layer**: A LangChain-based conversational agent that processes natural language and manages bookkeeping logic
2. **Server Layer**: A Lark (Feishu) bot server that provides WebSocket-based real-time messaging interface

Users can interact with the agent either through the Lark bot (recommended) or via command-line interface (for debugging).

## File Naming Convention

**Kebab-case Naming**:
- All source files MUST use kebab-case (lowercase with hyphens)
- Examples: `agent.ts`, `parse-date-expression.ts`, `save-expense.ts`
- Counter-examples: `parseDateExpression.ts`, `dateParser.ts`

**Type Definitions**:
- **Files**: kebab-case (e.g., `save-expense.ts`)
- **Variables/Functions**: camelCase (e.g., `saveExpenseToLark`, `parseDateExpression`)
- **Types/Interfaces**: PascalCase (e.g., `Expense`, `DateInput`)
- **Constants**: UPPER_SNAKE_CASE or PascalCase for exported consts

## Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Compile TypeScript to JavaScript
pnpm build

# Clean build artifacts
pnpm clean

# Start LangGraph Studio for visual debugging and agent testing
pnpm agent

# Start the server with Lark bot integration
pnpm dev:server

# Direct TypeScript execution (for development)
npx tsx src/index.ts
```

## Architecture

### Core Components

**Agent Graph** (`src/agent.ts`)
- Uses LangChain's `createAgent` API to build the conversational agent
- Configured with ChatOpenAI model (supports OpenAI-compatible APIs like ByteDance's Doubao)
- Uses `MemorySaver` checkpointer for conversation state management
- Tools: `parseDateExpression`, `saveExpenseToLark`

**System Prompt** (`src/prompts.ts`)
- Static system prompt (no dynamic time injection)
- Lists all 15 supported categories (交通, 零食, 日用品, 餐饮, 教育, 娱乐, 旅游, 衣服, 工资, 房租, 购物, 礼物, 蔬果, 个人护理, 医疗)
- Defines multi-turn conversation workflow for collecting missing information
- **Date handling** requires LLM to call `parseDateExpression` tool with structured semantic data
- LLM MUST NOT calculate timestamps itself

**Type System** (`src/types.ts`)
- `CATEGORIES`: Const array of all valid category names
- `Expense`: Complete record with remark, date, category, amount, type
- Date is stored as 13-millisecond timestamp
- Type field: "consume" (支出) or "income" (收入)

**Date Parsing Tool** (`src/tools/parseDateExpression.ts` & `src/utils/dateParser.ts`)
- **Architecture**: Structured semantic approach - LLM understands semantics, Tool does calculation
- **Input**: Structured data (e.g., `{ type: "relative", offset: -1, unit: "day" }` for yesterday)
- **Output**: 13-bit millisecond timestamp
- **Features**:
  - Relative dates: yesterday (`offset: -1`), today (`offset: 0`), tomorrow (`offset: 1`)
  - Absolute dates: `{ type: "absolute", month: 1, day: 2 }` for January 2nd
  - Uses `Date.now()` internally for current time (no runtime dependency)
- **Error handling**: Falls back to `Date.now()` on invalid input

**Feishu Integration** (`src/tools/saveExpense.ts`)
- Tool definition with Zod schema for type-safe parameters
- Manual tenant_access_token acquisition via `getTenantAccessToken()`
- Uses `@larksuiteoapi/node-sdk` with `withTenantToken` for authenticated requests
- Maps to Feishu Bitable fields: 备注, 分类, 金额, 收支, 日期
- Returns structured JSON with status/message/data

**Server Layer** (`src/server/`)
- **LarkWebSocketClient** (`src/server/lark/client.ts`): WebSocket 连接管理，接收飞书事件
- **LarkMessageSender** (`src/server/lark/sender.ts`): 发送和更新飞书消息
- **MessageController** (`src/server/controller/message.ts`): 处理消息路由和用户会话
- **AgentInvoker** (`src/server/service/agent-invoker.ts`): 封装 Agent 调用，处理流式响应
- **ServerApp** (`src/server/app.ts`): 集成所有组件，启动 HTTP 服务器和 WebSocket

**Architecture Principles**:
- Agent 层和 Server 层完全分离
- Agent 可以独立运行和测试（LangGraph Studio）
- Server 层通过 AgentInvoker 接口调用 Agent
- 使用 WebSocket 长连接接收飞书事件（无需内网穿透）
- 支持流式响应更新（卡片消息）
- 内存存储用户会话（thread_id）

### Server Layer Architecture

The Server layer (`src/server/`) provides the Lark bot integration:

**Components**:

1. **LarkWebSocketClient** (`src/server/lark/client.ts`):
   - Establishes and manages WebSocket connection with Lark
   - Subscribes to `im.message.receive_v1` events
   - Handles connection errors and automatic reconnection (5s retry)
   - Forwards received events to MessageController

2. **LarkMessageSender** (`src/server/lark/sender.ts`):
   - Sends text messages to Lark using `im.message.create` API
   - Updates existing messages using `im.message.patch` API
   - Implements throttling (200ms) to avoid API rate limits
   - Handles API errors and retries

3. **MessageController** (`src/server/controller/message.ts`):
   - Routes incoming messages to appropriate handlers
   - Extracts user_id (open_id), chat_id, and message content
   - Manages user sessions using thread_id mapping
   - Coordinates AgentInvoker and LarkMessageSender
   - Filters non-text messages (images, files, etc.)

4. **AgentInvoker** (`src/server/service/agent-invoker.ts`):
   - Encapsulates LangChain Agent invocation
   - Processes streaming responses from Agent
   - Converts Agent events to Lark message format
   - Returns AsyncGenerator for real-time updates

5. **ServerApp** (`src/server/app.ts`):
   - Initializes Express server (for health checks)
   - Starts LarkWebSocketClient
   - Registers graceful shutdown handlers
   - Manages server lifecycle

**Session Management**:
- Each user gets a unique thread_id: `thread_<open_id>_<timestamp>`
- Thread IDs are stored in-memory (Map: open_id → thread_id)
- Lost on server restart (acceptable for initial implementation)
- Agent uses MemorySaver to maintain conversation state per thread

**Message Flow**:
1. User sends message in Lark → WebSocket event
2. LarkWebSocketClient receives event → MessageController
3. MessageController gets/creates thread_id → AgentInvoker
4. AgentInvoker streams responses → MessageController
5. MessageController sends updates via LarkMessageSender → Lark
6. User sees real-time message updates in Lark

### Data Flow

1. User provides natural language input (e.g., "昨天打车花了20元")
2. LLM extracts and **converts date semantics to structured data**
   - "昨天" → `{ type: "relative", offset: -1, unit: "day" }`
   - "1月2日" → `{ type: "absolute", month: 1, day: 2 }`
3. LLM calls `parseDateExpression` tool with structured data
4. Tool calculates and returns timestamp
5. LLM calls `saveExpenseToLark` with timestamp from step 4
6. Tool saves to Feishu and returns formatted confirmation

**Key**: LLM never calculates timestamps - it only understands semantics and converts to structured data. All time calculations happen in the tool.

### Date Handling Strategy

The agent uses a **structured semantic architecture** for date handling:

- **No time mentioned**: Don't pass `date` parameter to `saveExpenseToLark` (uses `Date.now()` internally)
- **Relative time** ("昨天", "前天", "明天"): LLM calls `parseDateExpression` with `{ type: "relative", offset: N, unit: "day" }`
- **Absolute time** ("1月2日", "2025年1月2日"): LLM calls `parseDateExpression` with `{ type: "absolute", month: 1, day: 2 }`

**Important**: LLM MUST NOT calculate timestamps itself or pass date strings. All timestamp calculations happen in the `parseDateExpression` tool using `Date.now()`.

**Architectural Benefits**:
- LLM is completely decoupled from runtime state (no current time dependency)
- Tool is a pure function: deterministic input → deterministic output
- Easily testable and maintainable
- No dynamic prompt middleware needed

## Environment Configuration

Required environment variables (see `.env.example`):

```env
# LLM API Configuration
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3  # ByteDance Doubao
MODEL_NAME=doubao-seed-1-6-251015

# Feishu Multi-dimensional Table
FEISHU_APP_ID=app-id
FEISHU_APP_SECRET=app-secret
FEISHU_APP_TOKEN=app-token-from-url
FEISHU_TABLE_ID=table-id-from-url

# Optional: LangSmith tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=langsmith-key
LANGCHAIN_PROJECT=expense-tracker-agent
```

The Feishu table requires these exact fields:
- `备注` (Text)
- `分类` (Single-select: the 15 categories)
- `金额` (Number)
- `收支` (Single-select: 支出, 收入)
- `日期` (Date)

## Key Technical Decisions

**Why dynamic system prompts?**
Current time must be injected at runtime for accurate relative date calculations. The middleware pattern in `createAgent` ensures the prompt is regenerated on each request with fresh timestamp.

**Why manual token acquisition?**
Feishu SDK's token caching is disabled (`disableTokenCache: true`) in favor of manual `getTenantAccessToken()` calls for more explicit error handling.

**Why MemorySaver?**
In-memory checkpointing enables multi-turn conversations where the agent remembers context across messages (e.g., user says "花了50元" in first message, agent asks category, user replies "餐饮").

## Feishu Table Setup

To configure the Feishu integration:
1. Create app at https://open.feishu.cn/
2. Create multi-dimensional table with the 5 required fields
3. Extract `app_token` and `table_id` from table URL
4. Grant app permissions for "新增记录" (add records) and "查看表格" (view table)

## Testing and Debugging

Use `pnpm agent` to launch LangGraph Studio, which provides:
- Visual representation of the agent graph
- Message-by-message execution inspection
- Tool call debugging
- State checkpoint visualization

This is the recommended way to test changes to prompts, tool definitions, or agent behavior.

## Usage Patterns

### Development Workflow

1. **Agent Development**:
   - Use `pnpm agent` to open LangGraph Studio
   - Test agent logic, prompts, and tools in isolation
   - Verify tool calls and responses
   - Debug conversation flow

2. **Server Integration Testing**:
   - Use `pnpm dev:server` to start the full server
   - Send messages via Lark bot
   - Check server logs for errors
   - Verify WebSocket connection stability

3. **Production Deployment**:
   - Ensure all environment variables are set
   - Start server with `pnpm dev:server`
   - Monitor logs for connection errors
   - Configure process manager (PM2, systemd, etc.)

### Common Issues

**WebSocket Connection Fails**:
- Check `FEISHU_APP_ID` and `FEISHU_APP_SECRET`
- Verify network connectivity to Lark API
- Check server logs for authentication errors

**Agent Not Responding**:
- Check `OPENAI_API_KEY` and `OPENAI_BASE_URL`
- Verify model availability
- Test with `pnpm dev` (CLI mode) to isolate Server issues

**Messages Not Saving to Feishu**:
- Verify `FEISHU_APP_TOKEN` and `FEISHU_TABLE_ID`
- Check table has all required fields
- Ensure app has permissions for "新增记录" and "查看表格"

**Session Lost After Restart**:
- This is expected behavior (in-memory storage)
- Users need to start new conversation after restart
- For persistence, implement database/Redis backend
