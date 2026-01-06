/**
 * parse-date-expression.test.ts
 *
 * 测试日期解析工具 (LangChain Tool)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseDateExpression } from "./parse-date-expression";
import type { DateInput } from "../utils/date-parser";

describe("parseDateExpression (LangChain Tool)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("相对日期 (relative dates)", () => {
    it("应该返回包含时间戳、格式化日期和输入的 JSON 字符串", async () => {
      const input: DateInput = { type: "relative", offset: -1, unit: "day" };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);

      // 验证返回结构
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed).toHaveProperty("formattedDate");
      expect(parsed).toHaveProperty("input");
      expect(parsed.input).toEqual(input);

      // 验证时间戳是 13 位数字
      expect(parsed.timestamp).toBeTypeOf("number");
      expect(parsed.timestamp.toString()).toHaveLength(13);

      // 验证格式化日期格式
      expect(parsed.formattedDate).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it("应该正确解析昨天并返回格式化日期", async () => {
      const input: DateInput = { type: "relative", offset: -1, unit: "day" };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // 验证时间戳正确
      expect(parsed.timestamp).toBe(yesterday.getTime());

      // 验证格式化日期匹配预期格式
      expect(parsed.formattedDate).toMatch(/\d{4}-\d{2}-\d{2} 00:00:00/);
    });

    it("应该正确解析今天并返回当前时间", async () => {
      const input: DateInput = { type: "relative", offset: 0, unit: "day" };
      const beforeCall = Date.now();

      const result = await parseDateExpression.invoke(input);
      const afterCall = Date.now();

      const parsed = JSON.parse(result);

      // 验证时间戳在合理范围内
      expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(parsed.timestamp).toBeLessThanOrEqual(afterCall);

      // 验证格式化日期存在
      expect(parsed.formattedDate).toBeDefined();
    });

    it("应该正确解析明天", async () => {
      const input: DateInput = { type: "relative", offset: 1, unit: "day" };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      expect(parsed.timestamp).toBe(tomorrow.getTime());
      expect(parsed.formattedDate).toMatch(/\d{4}-\d{2}-\d{2} 00:00:00/);
    });

    it("应该正确解析前天 (offset: -2)", async () => {
      const input: DateInput = { type: "relative", offset: -2, unit: "day" };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);
      const now = new Date();
      const dayBeforeYesterday = new Date(now);
      dayBeforeYesterday.setDate(now.getDate() - 2);
      dayBeforeYesterday.setHours(0, 0, 0, 0);

      expect(parsed.timestamp).toBe(dayBeforeYesterday.getTime());
    });

    it("应该正确解析后天 (offset: 2)", async () => {
      const input: DateInput = { type: "relative", offset: 2, unit: "day" };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);
      const now = new Date();
      const dayAfterTomorrow = new Date(now);
      dayAfterTomorrow.setDate(now.getDate() + 2);
      dayAfterTomorrow.setHours(0, 0, 0, 0);

      expect(parsed.timestamp).toBe(dayAfterTomorrow.getTime());
    });
  });

  describe("绝对日期 (absolute dates)", () => {
    it("应该正确解析不含年份的绝对日期", async () => {
      const input: DateInput = { type: "absolute", month: 1, day: 2 };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), 0, 2, 0, 0, 0, 0);

      expect(parsed.timestamp).toBe(targetDate.getTime());
      expect(parsed.formattedDate).toMatch(/\d{4}-01-02 00:00:00/);
    });

    it("应该正确解析含年份的绝对日期", async () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 1, day: 2 };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);
      const targetDate = new Date(2025, 0, 2, 0, 0, 0, 0);

      expect(parsed.timestamp).toBe(targetDate.getTime());
      expect(parsed.formattedDate).toMatch(/2025-01-02 00:00:00/);
    });

    it("应该正确解析 12月31日", async () => {
      const input: DateInput = { type: "absolute", month: 12, day: 31 };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), 11, 31, 0, 0, 0, 0);

      expect(parsed.timestamp).toBe(targetDate.getTime());
      expect(parsed.formattedDate).toMatch(/\d{4}-12-31 00:00:00/);
    });
  });

  describe("错误处理", () => {
    it("应该在无效日期时返回当前时间（由 parseDateFromStructuredInput 处理）", async () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 2, day: 30 };
      const beforeCall = Date.now();

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await parseDateExpression.invoke(input);
      const afterCall = Date.now();

      const parsed = JSON.parse(result);

      // 验证回退到当前时间（由 parseDateFromStructuredInput 处理）
      expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(parsed.timestamp).toBeLessThanOrEqual(afterCall);

      // 验证返回结构完整（工具层不会添加 error 字段，因为底层已经处理）
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed).toHaveProperty("formattedDate");
      expect(parsed).toHaveProperty("input");

      // 验证输入被保留
      expect(parsed.input).toEqual(input);

      // 验证底层记录了警告
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("应该在非闰年的 2月29日时回退到当前时间", async () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 2, day: 29 };
      const beforeCall = Date.now();

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await parseDateExpression.invoke(input);
      const afterCall = Date.now();

      const parsed = JSON.parse(result);

      expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(parsed.timestamp).toBeLessThanOrEqual(afterCall);
      expect(parsed).toHaveProperty("formattedDate");

      consoleWarnSpy.mockRestore();
    });
  });

  describe("格式化日期", () => {
    it("应该返回符合 YYYY-MM-DD HH:mm:ss 格式的日期字符串", async () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 1, day: 15 };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);

      // 验证格式：YYYY-MM-DD HH:mm:ss
      expect(parsed.formattedDate).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(parsed.formattedDate).toBe("2025-01-15 00:00:00");
    });

    it("应该正确格式化相对日期", async () => {
      const input: DateInput = { type: "relative", offset: -1, unit: "day" };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);

      expect(parsed.formattedDate).toMatch(/^\d{4}-\d{2}-\d{2} 00:00:00$/);
    });
  });

  describe("时间戳格式", () => {
    it("应该返回 13 位毫秒级时间戳", async () => {
      const input: DateInput = { type: "relative", offset: -1, unit: "day" };
      const result = await parseDateExpression.invoke(input);

      const parsed = JSON.parse(result);

      // 13 位时间戳大约在 10^12 到 10^13 之间
      expect(parsed.timestamp).toBeGreaterThan(999999999999);
      expect(parsed.timestamp).toBeLessThan(99999999999999);
    });
  });

  describe("LangChain Tool 接口", () => {
    it("应该有正确的工具名称和描述", () => {
      expect(parseDateExpression.name).toBe("parseDateExpression");
      expect(parseDateExpression.description).toBeDefined();
      expect(parseDateExpression.description).toContain("时间戳");
    });

    it("应该接受 DateInput 类型的参数", async () => {
      const input: DateInput = { type: "relative", offset: 0, unit: "day" };

      // 不应该抛出类型错误
      const result = await parseDateExpression.invoke(input);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });
});
