/**
 * LangChain Agent Graph
 *
 * This module exports the main agent using LangChain's createAgent.
 * The agent is built on LangGraph and supports:
 * - Tool calling
 * - Streaming responses
 * - Middleware for customization
 * - Human-in-the-loop workflows
 */

import { createAgent } from "langchain";
import { TOOLS } from "./tools.js";
import { SYSTEM_PROMPT } from "./prompts.js";

/**
 * The main agent instance.
 *
 * Uses createAgent from LangChain, which provides:
 * - A simpler interface for building agents
 * - Built-in middleware support for customization
 * - Automatic tool binding and execution
 * - Runs on LangGraph for durable execution
 *
 * @example
 * ```typescript
 * const result = await agent.invoke({
 *   messages: [{ role: "user", content: "What's 2 + 2?" }],
 * });
 * console.log(result.content);
 * ```
 */
export const agent = createAgent({
  // The model to use - supports "provider:model" format
  // Uses ANTHROPIC_API_KEY or OPENAI_API_KEY from environment
  model: "anthropic:claude-haiku-4-5",

  // Tools available to the agent
  tools: TOOLS,

  // System prompt defining agent behavior
  systemPrompt: SYSTEM_PROMPT,

  // Optional: Add middleware for advanced customization
  // middleware: [
  //   summarizationMiddleware({
  //     model: "anthropic:claude-haiku-4-5",
  //     trigger: { tokens: 4000 },
  //   }),
  //   humanInTheLoopMiddleware({
  //     interruptOn: { sensitive_tool: { allowedDecisions: ["approve", "reject"] } },
  //   }),
  // ],
});
