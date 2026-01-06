/**
 * 日期解析工具
 * 将结构化的时间语义数据转换为 13 位时间戳
 */

import { tool } from "@langchain/core/tools";
import {
  DateInputSchema,
  parseDateFromStructuredInput,
  type DateInput,
} from "../utils/date-parser";

/**
 * parseDateExpression 工具
 *
 * 用于将结构化的时间语义数据（由 LLM 从自然语言中提取）转换为精确的时间戳。
 *
 * LLM 的职责：
 * - 理解自然语言中的日期表达
 * - 将其转换为结构化数据（如 { type: "relative", offset: -1, unit: "day" }）
 *
 * Tool 的职责：
 * - 接收结构化数据
 * - 进行确定性计算，返回时间戳
 *
 * @example
 * ```
 * 用户: "昨天打车花了20元"
 * LLM: parseDateExpression({ type: "relative", offset: -1, unit: "day" })
 * Tool: 返回昨天的 00:00:00 时间戳
 * ```
 */
export const parseDateExpression = tool(
  async (input: DateInput) => {
    try {
      const timestamp = parseDateFromStructuredInput(input);

      // 返回结果，包含时间戳和原始输入（便于调试）
      return JSON.stringify({
        timestamp,
        input,
      });
    } catch (error) {
      // 错误处理：返回当前时间作为安全回退
      console.error(
        `[parseDateExpression] 解析失败: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
      return JSON.stringify({
        timestamp: Date.now(),
        input,
        error: error instanceof Error ? error.message : "未知错误",
      });
    }
  },
  {
    name: "parseDateExpression",
    description: `将结构化的时间语义数据转换为 13 位时间戳。支持相对日期和绝对日期。

**相对日期示例**：
- 昨天 → { type: "relative", offset: -1, unit: "day" }
- 前天 → { type: "relative", offset: -2, unit: "day" }
- 今天 → { type: "relative", offset: 0, unit: "day" }
- 明天 → { type: "relative", offset: 1, unit: "day" }

**绝对日期示例**：
- 1月2日 → { type: "absolute", month: 1, day: 2 }
- 2025年1月2日 → { type: "absolute", year: 2025, month: 1, day: 2 }

**注意**：
- 相对日期（非今天）返回当天的 00:00:00 时间戳
- 今天（offset: 0）返回当前时间（保留时分秒）
- 绝对日期统一返回 00:00:00 时间戳
- 不传年份时默认使用当前年份`,
    schema: DateInputSchema,
  }
);
