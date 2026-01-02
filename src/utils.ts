/**
 * 工具函数文件
 * 提供日期处理等辅助功能
 */

import * as readline from "readline";

/**
 * 创建 readline 接口
 * 用于从命令行读取用户输入
 * @returns readline 接口
 */
export function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * 获取当前 13 位时间戳
 * @returns {number} 当前的 13 位时间戳（毫秒级）
 *
 * @example
 * ```ts
 * const timestamp = getCurrentTimestamp();
 * console.log(timestamp); // 1735785600000
 * ```
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * 格式化时间戳为可读的日期字符串
 * @param {number} timestamp - 13 位时间戳
 * @returns {string} 格式化后的日期字符串
 *
 * @example
 * ```ts
 * const formatted = formatTimestamp(1735785600000);
 * console.log(formatted); // "2025-01-02 12:00:00"
 * ```
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * 打印费用记录的友好格式
 * @param {import('./types.js').Expense} expense - 费用记录
 * @returns {string} 格式化后的字符串
 *
 * @example
 * ```ts
 * const expense = {
 *   remark: "吃烧烤",
 *   date: 1735785600000,
 *   category: "餐饮",
 *   amount: 100,
 *   type: "consume"
 * };
 * console.log(formatExpense(expense));
 * // 💰 吃烧烤
 * // 📅 2025-01-02 12:00:00
 * // 🏷️ 餐饮 | 💵 ¥100.00 | 📊 支出
 * ```
 */
export function formatExpense(expense: import("./types.js").Expense): string {
  const typeLabel = expense.type === "consume" ? "支出" : "收入";
  const typeEmoji = expense.type === "consume" ? "📊" : "💰";

  return `
💰 ${expense.remark}
📅 ${formatTimestamp(expense.date)}
🏷️ ${expense.category} | 💵 ¥${expense.amount.toFixed(2)} | ${typeEmoji} ${typeLabel}
  `.trim();
}
