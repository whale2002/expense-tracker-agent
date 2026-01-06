/**
 * 日期解析功能测试脚本
 * 验证 parseDateFromStructuredInput 函数的正确性
 */

import { parseDateFromStructuredInput } from "./src/utils/date-parser";

console.log("🧪 测试日期解析功能\n");

// 测试用例
const testCases = [
  {
    name: "昨天",
    input: { type: "relative" as const, offset: -1, unit: "day" as const },
    expectedDesc: "昨天的 00:00:00",
  },
  {
    name: "今天",
    input: { type: "relative" as const, offset: 0, unit: "day" as const },
    expectedDesc: "当前时间（保留时分秒）",
  },
  {
    name: "明天",
    input: { type: "relative" as const, offset: 1, unit: "day" as const },
    expectedDesc: "明天的 00:00:00",
  },
  {
    name: "当年1月2日",
    input: { type: "absolute" as const, month: 1, day: 2 },
    expectedDesc: "当年1月2日 00:00:00",
  },
  {
    name: "2025年1月2日",
    input: { type: "absolute" as const, year: 2025, month: 1, day: 2 },
    expectedDesc: "2025年1月2日 00:00:00",
  },
];

// 运行测试
testCases.forEach((testCase) => {
  try {
    const timestamp = parseDateFromStructuredInput(testCase.input);
    const date = new Date(timestamp);
    const dateStr = date.toISOString().replace("T", " ").substring(0, 19);

    console.log(`✅ ${testCase.name}`);
    console.log(`   输入: ${JSON.stringify(testCase.input)}`);
    console.log(`   期望: ${testCase.expectedDesc}`);
    console.log(`   结果: ${dateStr} (${timestamp})`);
    console.log();
  } catch (error) {
    console.log(`❌ ${testCase.name}`);
    console.log(`   输入: ${JSON.stringify(testCase.input)}`);
    console.log(`   错误: ${error}`);
    console.log();
  }
});

console.log("✨ 测试完成！");
