/**
 * 类型定义文件
 * 定义记账 Agent 相关的所有类型
 */

/**
 * 分类枚举常量
 * 支持的所有消费/收入分类
 */
export const CATEGORIES = [
  "交通",
  "零食",
  "日用品",
  "餐饮",
  "教育",
  "娱乐",
  "旅游",
  "衣服",
  "工资",
  "房租",
  "购物",
  "礼物",
  "蔬果",
  "个人护理",
  "医疗",
] as const;

/**
 * 分类枚举类型
 * 支持的所有消费/收入分类
 */
export type Category = typeof CATEGORIES[number];

/**
 * 费用记录
 * 完整的费用信息，所有字段都是必填的
 */
export type Expense = {
  /** 备注 - 消费的简短描述 */
  remark: string;
  /** 日期 - 13 位时间戳（毫秒级） */
  date: number;
  /** 分类 - 必须是预定义的枚举值之一 */
  category: Category;
  /** 金额 - 单位元 */
  amount: number;
  /** 收支类型 - consume 支出 | income 收入 */
  type: "consume" | "income";
};

/**
 * 部分费用信息
 * 用于多轮对话中逐步收集信息的中间状态
 */
export type PartialExpense = Partial<Expense>;

/**
 * Agent 响应结果
 * Agent 处理用户输入后的返回结果
 */
export type AgentResponse =
  | {
      /** 信息是否完整，可以返回完整的 Expense */
      complete: true;
      /** 完整的费用记录 */
      expense: Expense;
    }
  | {
      /** 信息不完整，需要用户补充 */
      complete: false;
      /** 需要向用户展示的消息 */
      message: string;
    };

/**
 * 结构化输出的中间类型
 * LLM 返回的原始数据结构
 */
export type StructuredExpenseOutput = {
  /** 备注 - 消费的简短描述 */
  remark: string;
  /** 日期 - 13位时间戳，如果用户未提供则为 null */
  date: number | null;
  /** 分类 - 必须是预定义的枚举值之一 */
  category: Category;
  /** 金额 - 单位元 */
  amount: number;
  /** 收支类型 */
  type: "consume" | "income";
  /** 是否需要向用户澄清缺少的信息 */
  needsClarification: boolean;
  /** 需要向用户澄清的信息 */
  clarificationMessage?: string;
};
