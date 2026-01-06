/**
 * 记账 Agent 主逻辑文件
 * 使用 LangChain createAgent API 实现
 */

import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { parseDateExpression } from './tools/parse-date-expression'
import { saveExpenseToLark } from './tools/save-expense'
import { EXPENSE_SYSTEM_PROMPT } from "./prompts";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
    logger: console,
  },
})

/**
 * 创建记账 Agent Graph
 * 使用 langchain 的 createAgent API
 */
export const agent = createAgent({
  model,
  systemPrompt: EXPENSE_SYSTEM_PROMPT,
  tools: [parseDateExpression, saveExpenseToLark],
  checkpointer: new MemorySaver(),
});
