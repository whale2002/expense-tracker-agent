# date-handling Specification

## Purpose
TBD - created by archiving change move-date-parsing-to-tool. Update Purpose after archive.
## Requirements
### Requirement: 日期解析工具

系统 MUST 提供独立的日期解析工具 `parseDateExpression`，接收结构化的时间语义数据，返回 13 位毫秒级时间戳。

#### Scenario: 解析相对日期（昨天）

- **WHEN** LLM 调用 `parseDateExpression` 工具，传入 `{ type: "relative", offset: -1, unit: "day" }`
- **THEN** 工具返回昨天的 00:00:00 对应的时间戳
- **AND** 时间戳为 13 位数字（毫秒级）

#### Scenario: 解析相对日期（今天）

- **WHEN** LLM 调用 `parseDateExpression` 工具，传入 `{ type: "relative", offset: 0, unit: "day" }`
- **THEN** 工具返回今天的 00:00:00 对应的时间戳
- **AND** 时间戳为 13 位数字（毫秒级）

#### Scenario: 解析绝对日期（无年份）

- **WHEN** LLM 调用 `parseDateExpression` 工具，传入 `{ type: "absolute", month: 1, day: 2 }`
- **THEN** 工具返回当年 1 月 2 日 00:00:00 对应的时间戳
- **AND** 时间戳为 13 位数字（毫秒级）

#### Scenario: 解析绝对日期（有年份）

- **WHEN** LLM 调用 `parseDateExpression` 工具，传入 `{ type: "absolute", year: 2025, month: 1, day: 2 }`
- **THEN** 工具返回 2025 年 1 月 2 日 00:00:00 对应的时间戳
- **AND** 时间戳为 13 位数字（毫秒级）

#### Scenario: 参数校验失败

- **WHEN** LLM 传递无效参数（如 `{ type: "relative" }` 但缺少 `offset`）
- **THEN** 工具返回当前时间戳作为安全回退
- **AND** 工具返回结果中包含警告信息

### Requirement: Agent 工具集成

系统 SHALL 将 `parseDateExpression` 工具添加到 agent 的工具列表中，使 LLM 能够调用该工具获取时间戳。

#### Scenario: 工具列表包含日期解析工具

- **WHEN** Agent 初始化
- **THEN** 工具列表中包含 `parseDateExpression` 和 `saveExpenseToLark` 两个工具
- **AND** LLM 可以在对话中根据需要调用任一工具

### Requirement: LLM 语义理解与结构化输出

LLM 在处理包含日期信息的用户输入时，SHALL 将自然语言的日期表达转换为结构化的时间语义数据，调用 `parseDateExpression` 工具获取时间戳，再将时间戳传递给 `saveExpenseToLark` 工具。

#### Scenario: 用户输入包含相对日期

- **WHEN** 用户输入"昨天打车花了 20 元"
- **THEN** LLM 识别"昨天"的语义，调用 `parseDateExpression({ type: "relative", offset: -1, unit: "day" })`
- **AND** 工具返回时间戳后，LLM 调用 `saveExpenseToLark(remark: "打车", category: "交通", amount: 20, date: <timestamp>)`
- **AND** LLM MUST NOT 自己计算时间戳

#### Scenario: 用户输入包含绝对日期

- **WHEN** 用户输入"1 月 2 日买书花了 80 元"
- **THEN** LLM 识别日期语义，调用 `parseDateExpression({ type: "absolute", month: 1, day: 2 })`
- **AND** 工具返回时间戳后，LLM 调用 `saveExpenseToLark` 保存记录
- **AND** LLM MUST NOT 自己计算时间戳

#### Scenario: 用户输入不包含日期

- **WHEN** 用户输入"花了 50 元"（无日期信息）
- **THEN** LLM 直接调用 `saveExpenseToLark`，不传递 `date` 参数
- **AND** `saveExpenseToLark` 工具内部使用 `Date.now()` 作为当前时间戳
- **AND** LLM MUST NOT 调用 `parseDateExpression` 或自己计算时间戳

### Requirement: 保持 saveExpenseToLark 工具不变

`saveExpenseToLark` 工具的接口和行为 SHALL 保持不变，仍然接收数字类型的时间戳参数。

#### Scenario: 工具参数定义不变

- **WHEN** `saveExpenseToLark` 工具被调用
- **THEN** 工具的 `date` 参数仍然定义为 `z.number().optional()`
- **AND** 工具实现逻辑不变：`date: date ?? Date.now()`
- **AND** 工具最终传递给飞书的仍然是 13 位数字时间戳

#### Scenario: 向后兼容性

- **WHEN** LLM 直接传递数字时间戳给 `saveExpenseToLark`
- **THEN** 工具正常工作，不做任何修改
- **AND** 现有的对话流程和提示词仍然有效

