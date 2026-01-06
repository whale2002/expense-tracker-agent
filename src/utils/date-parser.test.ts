/**
 * date-parser.test.ts
 *
 * 测试日期解析工具函数
 */

import { describe, it, expect, vi } from "vitest";
import { parseDateFromStructuredInput, type DateInput } from "./date-parser";

describe("parseDateFromStructuredInput", () => {
  describe("相对日期 (relative dates)", () => {
    it("应该正确解析昨天 (offset: -1)", () => {
      const input: DateInput = { type: "relative", offset: -1, unit: "day" };
      const result = parseDateFromStructuredInput(input);

      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      expect(result).toBe(yesterday.getTime());
    });

    it("应该正确解析今天 (offset: 0)", () => {
      const input: DateInput = { type: "relative", offset: 0, unit: "day" };
      const beforeCall = Date.now();
      const result = parseDateFromStructuredInput(input);
      const afterCall = Date.now();

      // 今天应该返回当前时间（在时间窗口内）
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it("应该正确解析明天 (offset: 1)", () => {
      const input: DateInput = { type: "relative", offset: 1, unit: "day" };
      const result = parseDateFromStructuredInput(input);

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      expect(result).toBe(tomorrow.getTime());
    });

    it("应该正确解析前天 (offset: -2)", () => {
      const input: DateInput = { type: "relative", offset: -2, unit: "day" };
      const result = parseDateFromStructuredInput(input);

      const now = new Date();
      const dayBeforeYesterday = new Date(now);
      dayBeforeYesterday.setDate(now.getDate() - 2);
      dayBeforeYesterday.setHours(0, 0, 0, 0);

      expect(result).toBe(dayBeforeYesterday.getTime());
    });

    it("应该正确解析后天 (offset: 2)", () => {
      const input: DateInput = { type: "relative", offset: 2, unit: "day" };
      const result = parseDateFromStructuredInput(input);

      const now = new Date();
      const dayAfterTomorrow = new Date(now);
      dayAfterTomorrow.setDate(now.getDate() + 2);
      dayAfterTomorrow.setHours(0, 0, 0, 0);

      expect(result).toBe(dayAfterTomorrow.getTime());
    });

    it("应该正确解析更早的日期 (offset: -7)", () => {
      const input: DateInput = { type: "relative", offset: -7, unit: "day" };
      const result = parseDateFromStructuredInput(input);

      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      expect(result).toBe(weekAgo.getTime());
    });
  });

  describe("绝对日期 (absolute dates)", () => {
    it("应该正确解析当年的绝对日期（不含 year）", () => {
      const input: DateInput = { type: "absolute", month: 1, day: 2 };
      const result = parseDateFromStructuredInput(input);

      const now = new Date();
      const targetDate = new Date(now.getFullYear(), 0, 2, 0, 0, 0, 0);

      expect(result).toBe(targetDate.getTime());
    });

    it("应该正确解析指定年份的绝对日期（含 year）", () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 1, day: 2 };
      const result = parseDateFromStructuredInput(input);

      const targetDate = new Date(2025, 0, 2, 0, 0, 0, 0);

      expect(result).toBe(targetDate.getTime());
    });

    it("应该正确解析 12月31日", () => {
      const input: DateInput = { type: "absolute", month: 12, day: 31 };
      const result = parseDateFromStructuredInput(input);

      const now = new Date();
      const targetDate = new Date(now.getFullYear(), 11, 31, 0, 0, 0, 0);

      expect(result).toBe(targetDate.getTime());
    });

    it("应该正确解析闰年的 2月29日", () => {
      const input: DateInput = { type: "absolute", year: 2024, month: 2, day: 29 };
      const result = parseDateFromStructuredInput(input);

      const targetDate = new Date(2024, 1, 29, 0, 0, 0, 0);

      expect(result).toBe(targetDate.getTime());
    });

    it("应该正确解析非闰年的 2月28日", () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 2, day: 28 };
      const result = parseDateFromStructuredInput(input);

      const targetDate = new Date(2025, 1, 28, 0, 0, 0, 0);

      expect(result).toBe(targetDate.getTime());
    });
  });

  describe("错误处理", () => {
    it("应该在无效日期时回退到当前时间（2月30日）", () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 2, day: 30 };
      const beforeCall = Date.now();
      const result = parseDateFromStructuredInput(input);
      const afterCall = Date.now();

      // 应该回退到当前时间
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it("应该在无效月份时回退到当前时间（月份 13）", () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 13, day: 1 };
      const beforeCall = Date.now();
      const result = parseDateFromStructuredInput(input);
      const afterCall = Date.now();

      // 应该回退到当前时间
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it("应该在无效日期时回退到当前时间（日期 0）", () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 1, day: 0 };
      const beforeCall = Date.now();
      const result = parseDateFromStructuredInput(input);
      const afterCall = Date.now();

      // 应该回退到当前时间
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it("应该在无效日期时回退到当前时间（日期 32）", () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 1, day: 32 };
      const beforeCall = Date.now();
      const result = parseDateFromStructuredInput(input);
      const afterCall = Date.now();

      // 应该回退到当前时间
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it("应该在非闰年的 2月29日时回退到当前时间", () => {
      const input: DateInput = { type: "absolute", year: 2025, month: 2, day: 29 };
      const beforeCall = Date.now();
      const result = parseDateFromStructuredInput(input);
      const afterCall = Date.now();

      // 应该回退到当前时间（2025年不是闰年）
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it("应该打印警告信息到控制台", () => {
      const consoleSpy = vi.spyOn(console, "warn");

      const input: DateInput = { type: "absolute", year: 2025, month: 2, day: 30 };
      parseDateFromStructuredInput(input);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain("解析日期失败");

      consoleSpy.mockRestore();
    });
  });

  describe("边界情况", () => {
    it("应该正确处理月末日期（1月31日）", () => {
      const input: DateInput = { type: "absolute", month: 1, day: 31 };
      const result = parseDateFromStructuredInput(input);

      const now = new Date();
      const targetDate = new Date(now.getFullYear(), 0, 31, 0, 0, 0, 0);

      expect(result).toBe(targetDate.getTime());
    });

    it("应该正确处理小月（4月30日）", () => {
      const input: DateInput = { type: "absolute", month: 4, day: 30 };
      const result = parseDateFromStructuredInput(input);

      const now = new Date();
      const targetDate = new Date(now.getFullYear(), 3, 30, 0, 0, 0, 0);

      expect(result).toBe(targetDate.getTime());
    });

    it("应该正确处理跨年边界（去年12月31日）", () => {
      const now = new Date();
      const lastYear = now.getFullYear() - 1;

      const input: DateInput = { type: "absolute", year: lastYear, month: 12, day: 31 };
      const result = parseDateFromStructuredInput(input);

      const targetDate = new Date(lastYear, 11, 31, 0, 0, 0, 0);

      expect(result).toBe(targetDate.getTime());
    });
  });

  describe("时间戳格式", () => {
    it("应该返回 13 位毫秒级时间戳", () => {
      const input: DateInput = { type: "relative", offset: -1, unit: "day" };
      const result = parseDateFromStructuredInput(input);

      // 13 位时间戳大约在 10^12 到 10^13 之间
      expect(result).toBeGreaterThan(999999999999);
      expect(result).toBeLessThan(99999999999999);
    });
  });
});
