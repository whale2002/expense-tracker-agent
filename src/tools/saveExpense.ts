import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { Client, withTenantToken } from "@larksuiteoapi/node-sdk";
import { CATEGORIES, type Expense } from "../types";

// 从环境变量读取配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_APP_TOKEN = process.env.FEISHU_APP_TOKEN;
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID;

// 初始化飞书客户端
const client = new Client({
  appId: FEISHU_APP_ID || "",
  appSecret: FEISHU_APP_SECRET || "",
  disableTokenCache: true,
});

/**
 * 获取 tenant_access_token
 */
async function getTenantAccessToken(): Promise<string> {
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    throw new Error("缺少必要的环境变量: FEISHU_APP_ID 或 FEISHU_APP_SECRET");
  }

  const response = await client.request({
    url: "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    data: {
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    },
  });

  if (response.code === 0 && response.tenant_access_token) {
    return response.tenant_access_token;
  }

  throw new Error(`获取 token 失败: code=${response.code}, msg=${response.msg}`);
}

/**
 * 将费用记录保存到飞书多维表格
 */
async function saveExpenseToFeishu(expense: Expense): Promise<void> {
  if (!FEISHU_APP_TOKEN || !FEISHU_TABLE_ID) {
    throw new Error("缺少必要的环境变量: FEISHU_APP_TOKEN 或 FEISHU_TABLE_ID");
  }

  const token = await getTenantAccessToken();

  const fields = {
    "备注": expense.remark,
    "分类": expense.category,
    "金额": expense.amount,
    "收支": expense.type === "consume" ? "支出" : "收入",
    "日期": expense.date,
  };

  const response = await client.bitable.v1.appTableRecord.create(
    {
      path: {
        app_token: FEISHU_APP_TOKEN,
        table_id: FEISHU_TABLE_ID,
      },
      data: {
        fields,
      },
    },
    withTenantToken(token)
  );

  if (response.code !== 0) {
    throw new Error(`保存到飞书失败: ${response.msg} (code: ${response.code})`);
  }
}

/**
 * 完成记账工具
 * 当所有必要信息收集完毕后调用
 * 将记录保存到飞书多维表格
 */
export const saveExpenseToLark = tool(
  async ({ remark, category, amount, type, date }) => {
    // 填充默认值与日期（若模型未解析日期，则使用当前时间戳）
    const payload: Expense = {
      remark,
      category,
      amount,
      type: type ?? "consume",
      date: date ?? Date.now(),
    };

    try {
      // 保存到飞书多维表格
      await saveExpenseToFeishu(payload);

      // 返回工具执行结果
      return JSON.stringify({
        status: "success",
        message: "成功保存到飞书多维表格",
        data: payload
      });
    } catch (error) {
      console.error("保存费用记录失败:", error);
      return JSON.stringify({
        status: "error",
        message: error instanceof Error ? error.message : "保存失败",
        data: payload
      });
    }
  },
  {
    name: "save_expense_to_lark",
    description:
      "保存完整费用记录到飞书多维表格。当备注、分类、金额齐全时调用",
    schema: z.object({
      remark: z.string().describe("备注，消费的简短描述。必须有值"),
      category: z.enum(CATEGORIES).describe("分类，必须是预定义的枚举值之一"),
      amount: z.number().describe("金额，单位元"),
      type: z.enum(["consume", "income"]).default("consume").describe("收支类型，默认为支出"),
      date: z.number().optional().describe("13 位时间戳，未提供则由系统自动填充"),
    }),
  }
);
