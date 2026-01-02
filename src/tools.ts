import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { CATEGORIES, type Expense } from "./types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 计算持久化文件路径（项目根目录下的 expenses.json）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const EXPENSES_FILE = path.join(projectRoot, "expenses.json");

/**
 * 完成的记账记录存储（内存缓存）
 */
const completedExpenses: Expense[] = [];

/**
 * 完成记账工具
 * 当所有必要信息收集完毕后调用
 */
export const saveExpense = tool(
  async ({ remark, category, amount, type, date }) => {
    // 填充默认值与日期（若模型未解析日期，则使用当前时间戳）
    const payload: Expense = {
      remark,
      category,
      amount,
      type: type ?? "consume",
      date: date ?? Date.now(),
    };

    // 内存保存
    completedExpenses.push(payload);

    // 文件持久化（以数组形式追加，文件不存在则创建）
    try {
      let existing: Expense[] = [];
      if (fs.existsSync(EXPENSES_FILE)) {
        const text = fs.readFileSync(EXPENSES_FILE, "utf-8");
        existing = JSON.parse(text || "[]");
      }
      existing.push(payload);
      fs.writeFileSync(EXPENSES_FILE, JSON.stringify(existing, null, 2), "utf-8");
    } catch {
      console.warn("保存 JSON 失败");
    }

    // 返回工具执行结果
    return JSON.stringify({ status: "success", data: payload });
  },
  {
    name: "save_expense",
    description:
      "保存完整费用记录为 JSON（追加写入 expenses.json）。当备注、分类、金额齐全时调用。日期未提供将自动补全为当前时间戳。",
    schema: z.object({
      remark: z.string().describe("备注，消费的简短描述。必须有值"),
      category: z.enum(CATEGORIES).describe("分类，必须是预定义的枚举值之一"),
      amount: z.number().describe("金额，单位元"),
      type: z.enum(["consume", "income"]).default("consume").describe("收支类型，默认为支出"),
      date: z.number().optional().describe("13 位时间戳，未提供则由系统自动填充"),
    }),
  }
);
