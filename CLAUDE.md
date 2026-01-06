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

# Direct TypeScript execution (for development)
npx tsx src/index.ts
```

## Architecture

### Core Components

**Agent Graph** (`src/agent.ts`)
- Uses LangChain's `createAgent` API to build the conversational agent
- Implements `dynamicSystemPromptMiddleware` for real-time date/time injection into system prompts
- Configured with ChatOpenAI model (supports OpenAI-compatible APIs like ByteDance's Doubao)
- Uses `MemorySaver` checkpointer for conversation state management
- Single tool: `saveExpenseToLark`

**Dynamic System Prompt** (`src/prompts.ts`)
- System prompt contains `{{CURRENT_TIME}}` placeholder that gets replaced at runtime
- Lists all 15 supported categories (交通, 零食, 日用品, 餐饮, 教育, 娱乐, 旅游, 衣服, 工资, 房租, 购物, 礼物, 蔬果, 个人护理, 医疗)
- Defines multi-turn conversation workflow for collecting missing information
- Includes date handling rules for absolute dates, relative dates, and defaults

**Type System** (`src/types.ts`)
- `CATEGORIES`: Const array of all valid category names
- `Expense`: Complete record with remark, date, category, amount, type
- Date is stored as 13-millisecond timestamp
- Type field: "consume" (支出) or "income" (收入)

**Feishu Integration** (`src/tools/saveExpense.ts`)
- Tool definition with Zod schema for type-safe parameters
- Manual tenant_access_token acquisition via `getTenantAccessToken()`
- Uses `@larksuiteoapi/node-sdk` with `withTenantToken` for authenticated requests
- Maps to Feishu Bitable fields: 备注, 分类, 金额, 收支, 日期
- Returns structured JSON with status/message/data

### Data Flow

1. User provides natural language input (e.g., "今天中午吃了肯德基，花了55元")
2. LLM extracts structured information guided by system prompt
3. Agent validates completeness (required: remark, category, amount)
4. If incomplete: asks user for missing info without calling tools
5. If complete: calls `save_expense_to_lark` tool
6. Tool saves to Feishu and returns formatted confirmation

### Date Handling Strategy

The agent handles three date scenarios:
- **No time mentioned**: Use current timestamp (via `getCurrentDateTime()` in utils)
- **Absolute time** ("2025年1月2日"): Convert directly to timestamp
- **Relative time** ("昨天", "今天上午"): Calculate relative to current time injected in prompt

Current time is dynamically inserted into system prompt on each request via middleware.

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
