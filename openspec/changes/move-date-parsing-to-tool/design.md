## Context

当前系统在处理用户输入中的日期信息时，依赖 LLM 进行日期解析和计算。具体流程是：

1. 系统通过 `dynamicSystemPromptMiddleware` 将当前时间注入到提示词的 `{{CURRENT_TIME}}` 占位符
2. LLM 阅读用户输入（如"昨天打车花了20元"），结合当前时间计算出时间戳
3. LLM 将计算好的时间戳传递给 `saveExpenseToLark` 工具

**问题**：LLM 在进行日期算术运算时不可靠，即使提供了当前时间，仍然可能计算出错误的时间戳。这导致记账数据中的日期字段不准确。

**现有工具约束**：`saveExpenseToLark` 工具已经稳定运行，其接口定义为接收数字时间戳。修改该工具可能引入风险。

## Goals / Non-Goals

**Goals**：
- 实现可靠的日期解析，确保时间戳计算 100% 准确
- 将日期解析逻辑从 LLM 转移到确定性代码中
- 保持用户接口不变（用户仍然用自然语言输入）
- 保持现有工具 `saveExpenseToLark` 不变（不修改其接口和实现）
- 提供可测试的日期解析工具函数
- 简化 LLM 的职责，使其只需协调工具调用而非进行算术运算

**Non-Goals**：
- 不支持复杂的日期表达（如"下个月的第三个星期五"）
- 不修改用户交互方式（用户仍然用自然语言输入）
- 不改变 `saveExpenseToLark` 工具的接口和行为
- 不修改飞书多维表格的数据结构

## Decisions

### Decision 1: 新增独立的日期解析工具

**选择**：创建新的 `parseDateExpression` 工具，而不是修改 `saveExpenseToLark`

**原因**：
- **职责分离**：日期解析和数据保存是两个独立的职责，应该由不同的工具处理
- **最小化变更**：不修改现有工具，降低引入 bug 的风险
- **可测试性**：独立的工具更容易编写单元测试
- **可复用性**：日期解析工具未来可以在其他场景中使用
- **向后兼容**：`saveExpenseToLark` 保持不变，旧代码不受影响

**工具设计**：
```typescript
// src/tools/parseDateExpression.ts
import { z } from "zod";
import { tool } from "@langchain/core/tools";

// 定义日期类型的字面量类型
const DateTypeSchema = z.enum(["relative", "absolute"]);
const DateUnitSchema = z.enum(["day"]);

// 相对日期的 schema
const RelativeDateSchema = z.object({
  type: z.literal("relative"),
  offset: z.number().describe("相对天数偏移：-1=昨天, 0=今天, 1=明天, -2=前天"),
  unit: z.literal("day").describe("时间单位，目前只支持 'day'"),
});

// 绝对日期的 schema
const AbsoluteDateSchema = z.object({
  type: z.literal("absolute"),
  year: z.number().optional().describe("年份，不传则使用当前年"),
  month: z.number().min(1).max(12).describe("月份（1-12）"),
  day: z.number().min(1).max(31).describe("日期（1-31）"),
});

// 联合类型
const DateInputSchema = z.discriminatedUnion("type", [
  RelativeDateSchema,
  AbsoluteDateSchema,
]);

export const parseDateExpression = tool(
  async (input) => {
    const timestamp = parseDateFromStructuredInput(input);
    return JSON.stringify({
      timestamp,
      input,
    });
  },
  {
    name: "parseDateExpression",
    description: "将结构化的时间语义数据转换为 13 位时间戳。支持相对日期（如昨天、今天）和绝对日期（如1月2日）",
    schema: DateInputSchema,
  }
);

// 工具内部实现：纯函数计算
function parseDateFromStructuredInput(input: z.infer<typeof DateInputSchema>): number {
  if (input.type === "relative") {
    // 计算相对日期
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + input.offset);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.getTime();
  } else {
    // 计算绝对日期
    const now = new Date();
    const year = input.year ?? now.getFullYear();
    const date = new Date(year, input.month - 1, input.day, 0, 0, 0, 0);
    return date.getTime();
  }
}
```

### Decision 2: LLM 两步工具调用流程

**选择**：LLM 先调用 `parseDateExpression` 获取时间戳，再调用 `saveExpenseToLark` 保存记录

**原因**：
- **可靠性**：时间戳由工具计算，不依赖 LLM 的算术能力
- **清晰度**：LLM 的职责是协调工具调用，逻辑清晰
- **可验证性**：每一步工具调用都可以在 LangGraph Studio 中验证

**对话流程示例**：
```
用户: 昨天打车花了20元

LLM 识别语义: 昨天 = 相对日期，偏移 -1 天
LLM: 调用 parseDateExpression({ type: "relative", offset: -1, unit: "day" })
工具返回: { "timestamp": 1704115200000, "input": { type: "relative", offset: -1, unit: "day" } }

LLM: 调用 saveExpenseToLark(remark: "打车", category: "交通", amount: 20, date: 1704115200000)
工具返回: { "status": "success", ... }

LLM: ✅ 记账成功！...
```

**系统提示词更新**：
```markdown
## 日期处理规则

当需要处理日期信息时，必须按以下步骤操作：

1. 如果用户提及了相对日期（如"昨天"、"前天"、"明天"），将语义转换为结构化数据：
   - "昨天" → `{ type: "relative", offset: -1, unit: "day" }`
   - "前天" → `{ type: "relative", offset: -2, unit: "day" }`
   - "今天" → `{ type: "relative", offset: 0, unit: "day" }`
   - "明天" → `{ type: "relative", offset: 1, unit: "day" }`

2. 如果用户提及了绝对日期（如"1月2日"、"2025年1月2日"），转换为：
   - "1月2日" → `{ type: "absolute", month: 1, day: 2 }`
   - "2025年1月2日" → `{ type: "absolute", year: 2025, month: 1, day: 2 }`

3. 调用 `parseDateExpression` 工具，传入结构化数据，获取时间戳

4. 将时间戳传递给 `saveExpenseToLark` 工具的 `date` 参数

5. 如果用户未提及日期，直接调用 `saveExpenseToLark`，不传递 `date` 参数

**重要**：
- 严禁自己计算时间戳或传递日期字符串
- LLM 的职责是语义理解（自然语言 → 结构化数据）
- Tool 的职责是纯计算（结构化数据 → 时间戳）
```

### Decision 3: 工具实现为纯函数

**选择**：工具接收结构化输入，进行确定性计算，返回时间戳

**原因**：
- **职责清晰**：LLM 负责语义理解，Tool 负责纯计算
- **可测试性**：输入结构化，输出确定，易于单元测试
- **无歧义**：结构化数据消除了解析自然语言的歧义性
- **可扩展**：未来添加新的日期类型只需扩展 schema

**实现策略**：
- 使用 Zod discriminated union 确保类型安全
- 相对日期：基于 `Date.now()` + offset 计算
- 绝对日期：基于 year/month/day 构造 Date 对象
- 参数校验失败时回退到 `Date.now()`

**架构优势**：
```
自然语言 → LLM(语义理解) → 结构化数据 → Tool(纯计算) → 时间戳
         ↑ 职责分离，不碰计算            ↑ 确定性，易于测试
         ↑ 不依赖运行时状态              ↑ 内部使用 Date.now()
```

**解除运行时依赖**：
- 旧架构：LLM 需要知道当前时间才能计算相对日期
- 新架构：LLM 完全不需要知道当前时间，Tool 内部使用 `Date.now()`
- 优势：不再需要动态注入当前时间到系统提示词，简化了系统设计

### Decision 4: 工具返回格式设计

**选择**：工具返回 JSON 对象 `{ timestamp: number, input: object }`

**原因**：
- **透明性**：返回原始输入和计算结果，便于调试
- **可验证性**：可以验证 LLM 传入的结构化数据是否正确
- **扩展性**：未来可以添加更多元数据

**返回示例**：
```json
{
  "timestamp": 1704115200000,
  "input": {
    "type": "relative",
    "offset": -1,
    "unit": "day"
  }
}
```

### Decision 5: 相对日期的默认时间

**选择**：
- "今天"：返回当前时间戳（`Date.now()`）
- "昨天"、"前天"等：返回对应日期的 00:00:00 时间戳

**原因**：
- "今天"通常代表"现在"，保留时分秒信息更符合用户预期
- 历史日期的时分秒通常不重要，统一用 00:00:00 便于聚合查询

## Risks / Trade-offs

### Risk 1: LLM 可能不理解两步调用流程

**风险**：LLM 可能仍然尝试自己计算时间戳，或忘记调用 `parseDateExpression`

**缓解措施**：
- 在系统提示词中明确强调："严禁自己计算时间戳，必须使用工具"
- 提供详细的对话示例，展示正确的调用流程
- 在 LangGraph Studio 中测试和调试提示词

### Risk 2: 两步调用增加延迟

**风险**：每次记账需要调用两个工具，可能增加响应时间

**缓解措施**：
- 日期解析工具的计算成本极低（< 1ms）
- 相比准确的日期数据，轻微的延迟增加是可以接受的
- 未来可以考虑优化 LLM 的推理速度

### Risk 3: 日期解析覆盖不全

**风险**：用户可能使用未预料的日期表达（如"大前天"、"本周一"），导致解析失败

**缓解措施**：
- 初始实现支持常见表达（昨天、今天、明天、X月X日）
- 通过日志监控解析失败情况，逐步扩展支持的日期表达
- 在提示词中引导用户使用标准表达

### Trade-off: 移除时间注入 vs. LLM 理解能力

**权衡**：不再注入当前时间，LLM 是否还能正确理解相对日期？

**决定**：接受这个权衡，完全移除时间注入，原因如下：
- LLM 只需做语义转换："昨天" → `offset: -1`，不需要知道当前日期
- Tool 负责所有时间计算，内部使用 `Date.now()` 获取当前时间
- 这样实现了真正的职责分离：LLM 理解语义，Tool 处理计算
- 减少了系统复杂度：不需要动态提示词、不需要时间注入中间件
- 降低了 token 消耗：提示词更短，每次请求节省 token

### Trade-off: 额外的工具调用 vs. 数据准确性

**权衡**：引入新工具增加了调用步骤，但换取了数据的准确性

**决定**：接受这个权衡，因为：
- 记账数据的核心价值是准确性，错误的日期比轻微的延迟更严重
- 两步调用对用户是透明的，不影响用户体验
- 通过工具化，日期解析逻辑可测试、可维护

## Migration Plan

**步骤**：
1. 实现新的 `parseDateExpression` 工具（纯函数，内部使用 `Date.now()`）
2. 在 agent 中注册新工具，与 `saveExpenseToLark` 并列
3. 移除 `dynamicSystemPromptMiddleware` 中的时间注入逻辑
4. 删除 `formatSystemPrompt()` 函数，简化为静态提示词
5. 更新系统提示词，指导 LLM 使用结构化语义调用工具
6. 通过测试验证新工具的正确性
7. 在 LangGraph Studio 中手动测试完整的对话流程
8. 部署后监控日志，确保 LLM 正确使用新工具

**回滚方案**：
- 如果新方案出现问题，可以快速从 agent 中移除 `parseDateExpression` 工具
- 恢复原有的 `dynamicSystemPromptMiddleware` 时间注入逻辑
- 恢复原有的提示词，LLM 回到自己计算时间戳
- `saveExpenseToLark` 工具未被修改，不会受到影响

## Open Questions

1. **是否需要支持时分秒？**
   - 例如："今天下午3点"、"昨天中午12:30"
   - 初步决定：不需要，因为记账场景通常不精确到小时
   - 但可以在设计时预留扩展性

2. **"今天"应该返回当前时间还是 00:00:00？**
   - 建议返回当前时间（`Date.now()`），因为"今天"通常意味着"现在"
   - 如果用户需要"今天的开始"，可以说"今天凌晨"（但暂不支持）

3. **如何处理未来日期？**
   - 例如："明天预发工资"、"下周一的票"
   - 初步决定：支持，因为预记账或计划支出是合理场景
   - `parseDateExpression` 应该能够正确计算未来日期的时间戳

4. **工具名称是否需要调整？**
   - 当前：`parseDateExpression`
   - 已采用小驼峰命名法，符合 TypeScript 命名规范
