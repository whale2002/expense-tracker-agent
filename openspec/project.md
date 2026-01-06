# Project Context

## Purpose

An AI-powered expense tracking agent that enables natural language bookkeeping in Chinese. Users record expenses and income through conversational input, and the agent automatically extracts structured data and persists it to Feishu (Lark) multi-dimensional tables.

**Goals:**
- Frictionless expense tracking via natural language (no form-filling)
- Support for 15 predefined expense/income categories
- Intelligent date handling (no time mentioned, absolute dates, relative dates)
- Multi-turn conversation for collecting missing information

## Tech Stack

### Core Framework
- **LangChain** (v1.2.3) - AI agent framework with tool orchestration
- **LangGraph** (v1.0.7) - Agent graph construction and state management
- **LangChain OpenAI** (v1.2.0) - OpenAI-compatible API integration (supports ByteDance Doubao)

### Language & Runtime
- **TypeScript** (v5.9.3) - Type-safe development
- **Node.js** - Runtime environment
- **pnpm** (v10.26.2) - Package manager

### External Services
- **Feishu/Lark SDK** (@larksuiteoapi/node-sdk v1.56.0) - Multi-dimensional table API
- **ByteDance Doubao** - LLM provider (OpenAI-compatible API)

### Development Tools
- **tsx** (v4.19.0) - Direct TypeScript execution
- **LangGraph CLI** (@langchain/langgraph-cli v1.1.2) - Visual debugging with LangGraph Studio
- **ESLint** + TypeScript ESLint - Linting
- **Zod** (v4.2.1) - Schema validation for tool parameters

## Project Conventions

### Code Style

**Naming Conventions:**
- **Files**: kebab-case (e.g., `saveExpense.ts`, `agent.ts`)
- **Variables/Functions**: camelCase (e.g., `saveExpenseToLark`, `getCurrentDateTime`)
- **Types/Interfaces**: PascalCase (e.g., `Expense`, `CATEGORIES`)
- **Constants**: UPPER_SNAKE_CASE or PascalCase for exported consts

**Type Safety:**
- All functions must have explicit type annotations
- Use Zod schemas for external data validation (tool parameters, API responses)
- Prefer `const` assertions for type narrowing

**File Organization:**
```
src/
├── agent.ts          # Agent graph configuration
├── prompts.ts        # System prompts and templates
├── types.ts          # Type definitions and constants
├── utils/            # Helper functions
└── tools/            # LangChain tool definitions
```

### Architecture Patterns

**Agent Pattern:**
- Use `createAgent` API from LangChain for conversational agent setup
- Single-tool architecture: `saveExpenseToLark` does all data persistence
- Dynamic system prompt middleware injects current time on every request
- `MemorySaver` checkpointer for multi-turn conversation state

**Tool Definition:**
- Tools defined in `src/tools/` with Zod schemas
- Manual Feishu tenant_access_token acquisition (explicit error handling)
- Use `withTenantToken` wrapper for authenticated API calls

**Date Handling:**
- All dates stored as 13-millisecond timestamps
- Three scenarios: no time (use current), absolute time (parse directly), relative time (calculate from current)
- Current time injected via `{{CURRENT_TIME}}` placeholder in system prompt

**Error Handling:**
- Tools return structured JSON: `{ status: "success" | "error", message: string, data?: any }`
- Explicit token acquisition rather than SDK caching for better control

### Testing Strategy

**Primary Testing Method:**
- **LangGraph Studio** (`pnpm agent`) - Visual debugging and agent testing
- Interactive testing of multi-turn conversations
- Tool call inspection and state checkpoint visualization

**Manual Testing Workflow:**
1. Start LangGraph Studio: `pnpm agent`
2. Input natural language expressions in Chinese
3. Verify: information extraction, multi-turn prompts, tool calls, Feishu persistence

**Future Considerations:**
- Unit tests for utility functions (date parsing, validation)
- Integration tests for Feishu API calls
- E2E tests for complete conversation flows

### Git Workflow

**Branching:**
- `main` - Primary development branch
- Feature branches: use descriptive names like `add-category-validation`, `fix-date-parsing`

**Commit Conventions:**
- Format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`
- Examples:
  - `feat(agent): add dynamic time processing`
  - `fix(tools): handle Feishu API rate limiting`
  - `refactor(prompts): extract date handling logic`

**Recent Commit Pattern:**
- Commits focus on feature additions and integrations
- Bilingual commit messages (English + Chinese context)

## Domain Context

**Supported Categories (15 total):**
- **支出**: 交通, 零食, 日用品, 餐饮, 教育, 娱乐, 旅游, 衣物, 购物, 礼物, 蔬果, 个人护理, 医疗
- **收入**: 工资, 房租

**Transaction Types:**
- `consume` (支出) - Expense
- `income` (收入) - Income

**Data Model:**
```
Expense {
  remark: string      // User-provided description
  category: string    // One of 15 predefined categories
  amount: number      // Transaction amount
  type: "consume" | "income"
  date: number        // 13-millisecond timestamp
}
```

**Multi-turn Conversation Pattern:**
1. User provides partial information (e.g., "花了55元")
2. Agent validates and asks for missing fields (category, date, remark)
3. User provides missing info
4. Agent calls `saveExpenseToLark` when all required fields present

## Important Constraints

**LLM Constraints:**
- Model must support Chinese language processing
- Must handle tool calling with structured parameters
- Current time dependency requires dynamic prompt injection

**Feishu Table Constraints:**
- Table must have exactly 5 fields: 备注, 分类, 金额, 收支, 日期
- Classification field must use exact category names from `CATEGORIES` const
- Date field must be configured as Date type in Feishu

**Data Persistence:**
- No local database - all data stored in Feishu
- Conversation state stored in-memory (MemorySaver) - lost on restart

**Language:**
- All user-facing text in Chinese
- Category names must match predefined list exactly
- Code comments and documentation in English/Chinese mixed (technical terms in English)

## External Dependencies

### ByteDance Doubao (LLM)
**Purpose:** Conversational understanding and structured data extraction
**Configuration:**
```env
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
MODEL_NAME=doubao-seed-1-6-251015
```

### Feishu Multi-dimensional Tables
**Purpose:** Persistent storage for expense records
**Configuration:**
```env
FEISHU_APP_ID=app-id
FEISHU_APP_SECRET=app-secret
FEISHU_APP_TOKEN=app-token-from-url
FEISHU_TABLE_ID=table-id-from-url
```
**Required Permissions:**
- 新增记录
- 查看表格

### Optional: LangSmith Tracing
**Purpose:** Agent execution debugging and performance monitoring
**Configuration:**
```env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=langsmith-key
LANGCHAIN_PROJECT=expense-tracker-agent
```

## OpenSpec Workflow

This project uses **OpenSpec** for spec-driven development. Key points:

**When to Create Proposals:**
- New features or capabilities (e.g., add new category)
- Breaking changes (API, schema, data model)
- Architecture changes (e.g., add database layer)
- Performance/security changes

**Skip Proposals For:**
- Bug fixes (restoring intended behavior)
- Typos, formatting, comments
- Non-breaking dependency updates
- Configuration changes

**Command Reference:**
```bash
openspec list                  # View active changes
openspec list --specs          # View capabilities
openspec validate <change> --strict
openspec archive <change-id> --yes
```

See `openspec/AGENTS.md` for complete workflow details.
