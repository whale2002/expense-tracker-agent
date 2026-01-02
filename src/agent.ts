/**
 * 记账 Agent 主逻辑文件
 * 使用 LangChain createAgent API 实现
 */

import { createAgent, dynamicSystemPromptMiddleware } from "langchain";
import { formatSystemPrompt } from "./prompts";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { saveExpenseToLark } from "./tools";
import { getCurrentDateTime } from "./utils";

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
  checkpointer: new MemorySaver(),
  tools: [saveExpenseToLark],
  middleware: [
    dynamicSystemPromptMiddleware(() => {
      const currentDateTime = getCurrentDateTime();
      return formatSystemPrompt(currentDateTime);
    }),
  ],
});
