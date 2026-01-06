# Change: 新增日期解析工具，将日期计算逻辑从 LLM 转移到专用工具

## Why

当前实现中，LLM 负责将相对时间（如"昨天"、"今天上午"）计算为 13 位时间戳。但在实际使用中发现，即使通过 `dynamicSystemPromptMiddleware` 动态注入当前时间到系统提示词中，LLM 生成的时间戳仍然不可靠，经常出现错误的日期计算。

这导致用户输入"昨天打车花了20元"时，保存到飞书的日期可能是错误的，严重影响记账数据的准确性。

**根本原因**：
- LLM 不擅长精确的日期算术运算
- 即使提供了当前时间，LLM 在计算相对时间时仍可能出错
- 日期解析逻辑分散在提示词中，难以测试和维护

**解决方案**：
新增一个专门的日期解析工具 `parseDateExpression`，采用结构化语义架构：
- LLM 负责语义理解（自然语言 → 结构化数据），不涉及时间计算
- Tool 负责纯计算（结构化数据 → 时间戳），内部使用 `Date.now()` 获取当前时间
- 完全解除 LLM 对运行时状态的依赖

## What Changes

- **新增工具**：创建 `parseDateExpression` 工具，接收结构化的时间语义数据，返回 13 位时间戳
  - 工具参数：`{ type: "relative" | "absolute", ...fields }`
  - LLM 负责将自然语言转换为结构化数据
  - Tool 是纯计算函数，基于结构化输入计算时间戳
- **集成到 Agent**：将新工具添加到 agent 的工具列表中，与 `saveExpenseToLark` 并列
- **保持现有工具不变**：`saveExpenseToLark` 工具保持原样，仍然接收数字时间戳
- **简化 LLM 职责**：LLM 只负责语义理解（自然语言 → 结构化数据），不涉及时间计算
- **增强可测试性**：日期解析逻辑在独立的工具中，可以编写单元测试

## Impact

- **受影响的规范**：`date-handling`（新增）
- **受影响的代码**：
  - `src/tools/parseDateExpression.ts`（新增）- 日期解析工具
  - `src/utils/dateParser.ts`（新增）- 日期解析核心函数
  - `src/agent.ts:26` - 修改工具列表，添加新工具
  - `src/prompts.ts:12-77` - 更新日期处理规则，要求调用工具
  - `src/agent.ts:31-34` - 移除 `dynamicSystemPromptMiddleware` 中的时间注入逻辑
- **破坏性变更**：无（`saveExpenseToLark` 接口不变，仅增加新工具）
- **LLM 行为变化**：LLM 将日期语义转换为结构化数据，调用工具获取时间戳
- **架构优势**：
  - LLM 不碰时间计算，完全解除对运行时状态的依赖
  - Tool 是纯函数，职责清晰分离
  - 不再需要动态注入当前时间，简化了系统设计
