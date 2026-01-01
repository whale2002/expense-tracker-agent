# LangChain Agent Starter

[![Open in - LangGraph Studio](https://img.shields.io/badge/Open_in-LangGraph_Studio-00324d.svg?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4NS4zMzMiIGhlaWdodD0iODUuMzMzIiB2ZXJzaW9uPSIxLjAiIHZpZXdCb3g9IjAgMCA2NCA2NCI+PHBhdGggZD0iTTEzIDcuOGMtNi4zIDMuMS03LjEgNi4zLTYuOCAyNS43LjQgMjQuNi4zIDI0LjUgMjUuOSAyNC41QzU3LjUgNTggNTggNTcuNSA1OCAzMi4zIDU4IDcuMyA1Ni43IDYgMzIgNmMtMTIuOCAwLTE2LjEuMy0xOSAxLjhtMzcuNiAxNi42YzIuOCAyLjggMy40IDQuMiAzLjQgNy42cy0uNiA0LjgtMy40IDcuNkw0Ny4yIDQzSDE2LjhsLTMuNC0zLjRjLTQuOC00LjgtNC44LTEwLjQgMC0xNS4ybDMuNC0zLjRoMzAuNHoiLz48cGF0aCBkPSJNMTguOSAyNS42Yy0xLjEgMS4zLTEgMS43LjQgMi41LjkuNiAxLjcgMS44IDEuNyAyLjcgMCAxIC43IDIuOCAxLjYgNC4xIDEuNCAxLjkgMS40IDIuNS4zIDMuMi0xIC42LS42LjkgMS40LjkgMS41IDAgMi43LS41IDIuNy0xIDAtLjYgMS4xLS44IDIuNi0uNGwyLjYuNy0xLjgtMi45Yy01LjktOS4zLTkuNC0xMi4zLTExLjUtOS44TTM5IDI2YzAgMS4xLS45IDIuNS0yIDMuMi0yLjQgMS41LTIuNiAzLjQtLjUgNC4yLjguMyAyIDEuNyAyLjUgMy4xLjYgMS41IDEuNCAyLjMgMiAyIDEuNS0uOSAxLjItMy41LS40LTMuNS0yLjEgMC0yLjgtMi44LS44LTMuMyAxLjYtLjQgMS42LS41IDAtLjYtMS4xLS4xLTEuNS0uNi0xLjItMS42LjctMS43IDMuMy0yLjEgMy41LS41LjEuNS4yIDEuNi4zIDIuMiAwIC43LjkgMS40IDEuOSAxLjYgMi4xLjQgMi4zLTIuMy4yLTMuMi0uOC0uMy0yLTEuNy0yLjUtMy4xLTEuMS0zLTMtMy4zLTMtLjUiLz48L3N2Zz4=)](https://langgraph-studio.vercel.app/templates/open?githubUrl=https://github.com/langchain-ai/react-agent-js)

A modern starter template for building agentic applications using **LangChain** and `createAgent`. This template provides a clean foundation for building AI agents with tool calling, middleware support, and seamless LangGraph integration.

![Graph view in LangGraph studio UI](./.github/assets/studio_ui.png)

## ✨ Features

- **LangChain API** - Uses `createAgent` for a clean, simple interface
- **Built-in Tools** - Calculator, time, weather, and knowledge search examples
- **Middleware Ready** - Easily add summarization, human-in-the-loop, and more
- **TypeScript First** - Full type safety with Zod schemas
- **LangSmith Studio Compatible** - Visualize and debug your agent
- **LangSmith Integration** - Automatic tracing for debugging and evaluation

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/langchain-ai/react-agent-js.git
cd react-agent-js
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Add your API key to `.env`:

```bash
# For Claude models (recommended)
ANTHROPIC_API_KEY=your-key-here

# OR for GPT models
OPENAI_API_KEY=your-key-here
```

### 3. Run the Agent

```bash
# Run the example script
pnpm start

# Or use LangGraph Studio
# Open the project folder in LangGraph Studio
```

## 📁 Project Structure

```txt
src/
├── agent.ts      # Main agent using createAgent
├── tools.ts      # Tool definitions with Zod schemas
├── prompts.ts    # System prompts and templates
└── index.ts      # CLI entry point for testing
```

## 🛠 Customizing Your Agent

### Adding New Tools

Create tools in `src/tools.ts` using the `tool` function:

```typescript
import { tool } from "langchain";
import { z } from "zod";

const myTool = tool(
  async ({ query }) => {
    // Your tool logic here
    return `Result for: ${query}`;
  },
  {
    name: "my_tool",
    description: "Description of what this tool does",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);

// Add to TOOLS array
export const TOOLS = [myTool, ...otherTools];
```

### Changing the Model

Update `src/agent.ts`:

```typescript
export const agent = createAgent({
  // Anthropic models
  model: "anthropic:claude-sonnet-4-5-20250929",
  
  // Or OpenAI models
  // model: "openai:gpt-4o",
  // model: "openai:gpt-4-turbo",
  
  tools: TOOLS,
  systemPrompt: SYSTEM_PROMPT,
});
```

### Adding Middleware

LangChain supports middleware for advanced customization:

```typescript
import { 
  createAgent, 
  summarizationMiddleware,
  humanInTheLoopMiddleware 
} from "langchain";

export const agent = createAgent({
  model: "anthropic:claude-sonnet-4-5",
  tools: TOOLS,
  systemPrompt: SYSTEM_PROMPT,
  middleware: [
    // Auto-summarize long conversations
    summarizationMiddleware({
      model: "anthropic:claude-sonnet-4-5",
      trigger: { tokens: 4000 },
    }),
    // Require approval for sensitive operations
    humanInTheLoopMiddleware({
      interruptOn: {
        send_email: { allowedDecisions: ["approve", "reject"] },
      },
    }),
  ],
});
```

### Customizing the System Prompt

Edit `src/prompts.ts` to change the agent's behavior:

```typescript
export const SYSTEM_PROMPT = `You are a helpful AI assistant...`;
```

## 🔍 Using LangSmith Studio

[LangSmith Studio](https://docs.langchain.com/langsmith/studio) provides a visual interface for:

- **Visualizing** your agent's graph structure
- **Debugging** tool calls and agent decisions
- **Testing** with interactive conversations
- **Editing** state to debug specific scenarios

Simply open this project folder in LangSmith Studio to get started.

## 📊 LangSmith Tracing

Enable [LangSmith](https://smith.langchain.com/) for observability:

```bash
# In your .env file
LANGSMITH_API_KEY=your-key-here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=my-agent-project
```

All agent invocations will automatically be traced, showing:

- Model calls and responses
- Tool invocations and results
- Token usage and latency

## 📚 Resources

- [LangChain Documentation](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangGraph Documentation](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangSmith Documentation](https://docs.langchain.com/langsmith/home)
- [LangChain v1 Migration Guide](https://docs.langchain.com/oss/javascript/migrate/langchain-v1)

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.
