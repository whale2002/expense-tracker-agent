/**
 * 记账 Agent 主逻辑文件
 * 使用 LangChain createAgent API 实现
 */

import { createAgent } from "langchain";
import { EXPENSE_SYSTEM_PROMPT } from "./prompts.js";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { saveExpense } from "./tools.js";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})


/**
 * 创建记账 Agent Graph
 * 使用 langchain 的 createAgent API
 */
export const agent = createAgent({
  model,
  systemPrompt: EXPENSE_SYSTEM_PROMPT,
  checkpointer: new MemorySaver(),
  tools: [saveExpense],
});
