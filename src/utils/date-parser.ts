/**
 * 日期解析工具函数
 * 将结构化的时间语义数据转换为 13 位毫秒级时间戳
 */

import { z } from "zod";

// ============ Schema 定义 ============

/**
 * 相对日期的 Schema
 * @example { type: "relative", offset: -1, unit: "day" } 表示昨天
 */
export const RelativeDateSchema = z.object({
  type: z.literal("relative"),
  offset: z.number().describe("相对天数偏移：-1=昨天, 0=今天, 1=明天, -2=前天"),
  unit: z.literal("day").describe("时间单位，目前只支持 'day'"),
});

/**
 * 绝对日期的 Schema
 * @example { type: "absolute", month: 1, day: 2 } 表示当年1月2日
 * @example { type: "absolute", year: 2025, month: 1, day: 2 } 表示2025年1月2日
 */
export const AbsoluteDateSchema = z.object({
  type: z.literal("absolute"),
  year: z.number().optional().describe("年份，不传则使用当前年"),
  month: z.number().min(1).max(12).describe("月份（1-12）"),
  day: z.number().min(1).max(31).describe("日期（1-31）"),
});

/**
 * 日期输入的联合类型 Schema
 * 使用 discriminatedUnion 确保类型安全和良好的 TypeScript 推断
 */
export const DateInputSchema = z.discriminatedUnion("type", [
  RelativeDateSchema,
  AbsoluteDateSchema,
]);

export type DateInput = z.infer<typeof DateInputSchema>;

// ============ 核心解析函数 ============

/**
 * 将结构化的时间语义数据转换为 13 位毫秒级时间戳
 *
 * @param input - 结构化的日期输入数据
 * @returns 13 位毫秒级时间戳
 *
 * @example
 * ```typescript
 * // 相对日期：昨天
 * parseDateFromStructuredInput({ type: "relative", offset: -1, unit: "day" })
 * // => 1736054400000 (昨天的 00:00:00)
 *
 * // 绝对日期：当年1月2日
 * parseDateFromStructuredInput({ type: "absolute", month: 1, day: 2 })
 * // => 1735689600000 (当年1月2日 00:00:00)
 *
 * // 绝对日期：2025年1月2日
 * parseDateFromStructuredInput({ type: "absolute", year: 2025, month: 1, day: 2 })
 * // => 1735689600000 (2025年1月2日 00:00:00)
 * ```
 */
export function parseDateFromStructuredInput(input: DateInput): number {
  const now = new Date();

  try {
    if (input.type === "relative") {
      // 计算相对日期
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + input.offset);

      // 对于非"今天"的相对日期，设置时间为 00:00:00
      // "今天"（offset: 0）保留当前时间
      if (input.offset !== 0) {
        targetDate.setHours(0, 0, 0, 0);
      }

      return targetDate.getTime();
    } else {
      // 计算绝对日期
      const year = input.year ?? now.getFullYear();
      const month = input.month - 1; // JavaScript 月份从 0 开始
      const day = input.day;

      // 验证日期有效性
      if (month < 0 || month > 11) {
        throw new Error(`无效的月份: ${input.month}`);
      }
      if (day < 1 || day > 31) {
        throw new Error(`无效的日期: ${input.day}`);
      }

      const date = new Date(year, month, day, 0, 0, 0, 0);

      // 检查日期是否有效（处理 2月30日 这种情况）
      if (date.getMonth() !== month || date.getDate() !== day) {
        throw new Error(`无效的日期: ${year}-${input.month}-${input.day}`);
      }

      return date.getTime();
    }
  } catch (error) {
    // 参数校验失败时回退到当前时间
    console.warn(
      `[dateParser] 解析日期失败: ${error instanceof Error ? error.message : String(error)}, 输入: ${JSON.stringify(input)}, 使用当前时间`
    );
    return Date.now();
  }
}
