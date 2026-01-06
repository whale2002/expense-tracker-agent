## 1. 实现日期解析核心函数

- [ ] 1.1 创建 `src/utils/dateParser.ts` 文件
- [ ] 1.2 定义 Zod schema：使用 `z.discriminatedUnion` 定义相对日期和绝对日期的联合类型
- [ ] 1.3 实现 `parseDateFromStructuredInput(input): number` 函数
- [ ] 1.4 支持相对日期计算：基于 `offset` 和 `unit` 计算时间戳
- [ ] 1.5 支持绝对日期计算：基于 `year/month/day` 构造 Date 对象
- [ ] 1.6 实现参数校验失败时回退到 `Date.now()` 的逻辑
- [ ] 1.7 添加详细的 JSDoc 注释和使用示例

## 2. 创建日期解析工具

- [ ] 2.1 创建 `src/tools/parseDateExpression.ts` 文件
- [ ] 2.2 使用 LangChain 的 `tool` 函数定义工具
- [ ] 2.3 定义工具 schema：使用 `z.discriminatedUnion("type", [RelativeDateSchema, AbsoluteDateSchema])`
- [ ] 2.4 相对日期 schema：`{ type: "relative", offset: number, unit: "day" }`
- [ ] 2.5 绝对日期 schema：`{ type: "absolute", year?: number, month: number, day: number }`
- [ ] 2.6 工具描述：说明该工具用于将结构化的时间语义数据转换为时间戳
- [ ] 2.7 工具实现：调用 `parseDateFromStructuredInput()` 函数并返回结果
- [ ] 2.8 导出工具：`export const parseDateExpression`

## 3. 集成到 Agent

- [ ] 3.1 在 `src/tools/index.ts` 中导出新工具（如果存在 index.ts）
- [ ] 3.2 修改 `src/agent.ts:26`，在工具列表中添加 `parseDateExpression`
- [ ] 3.3 确保工具列表为：`[parseDateExpression, saveExpenseToLark]`
- [ ] 3.4 移除 `src/agent.ts:31-34` 中的 `dynamicSystemPromptMiddleware` 时间注入逻辑
- [ ] 3.5 简化 agent 创建，不再需要动态格式化提示词
- [ ] 3.6 验证 agent 编译通过

## 4. 更新系统提示词

- [ ] 4.1 移除原有的日期计算指令（prompts.ts 中的第 3 条规则）
- [ ] 4.2 移除 `{{CURRENT_TIME}}` 占位符和相关说明
- [ ] 4.3 删除 `formatSystemPrompt()` 函数（不再需要动态格式化）
- [ ] 4.4 简化提示词：直接使用静态的系统提示词
- [ ] 4.5 添加新规则：要求 LLM 将日期语义转换为结构化数据
- [ ] 4.6 添加语义转换示例：
  - "昨天" → `{ type: "relative", offset: -1, unit: "day" }`
  - "1月2日" → `{ type: "absolute", month: 1, day: 2 }`
- [ ] 4.7 更新对话示例，展示两步调用流程
- [ ] 4.8 强调：LLM MUST NOT 自己计算时间戳或传递日期字符串

## 5. 添加单元测试

- [ ] 5.1 创建 `src/utils/dateParser.test.ts` 测试文件
- [ ] 5.2 测试相对日期：`{ type: "relative", offset: -1, unit: "day" }` → 昨天时间戳
- [ ] 5.3 测试绝对日期：`{ type: "absolute", month: 1, day: 2 }` → 当年1月2日时间戳
- [ ] 5.4 测试带年份的绝对日期：`{ type: "absolute", year: 2025, month: 1, day: 2 }`
- [ ] 5.5 测试参数校验：缺失必需字段时的回退逻辑
- [ ] 5.6 测试边缘情况：闰年、月末、年末等特殊日期
- [ ] 5.7 创建 `src/tools/parseDateExpression.test.ts` 测试文件
- [ ] 5.8 测试工具调用：验证返回值格式 `{ timestamp, input }`
- [ ] 5.9 确保所有测试通过

## 6. 手动测试验证

- [ ] 6.1 使用 `pnpm agent` 启动 LangGraph Studio
- [ ] 6.2 测试用例："昨天打车花了 20 元"
  - 验证 LLM 识别"昨天"语义，调用 `parseDateExpression({ type: "relative", offset: -1, unit: "day" })`
  - 验证返回的时间戳正确（昨天的 00:00:00）
  - 验证 LLM 再调用 `saveExpenseToLark`，使用获取的时间戳
- [ ] 6.3 测试用例："今天中午吃火锅 100 元"，验证时间戳准确性
- [ ] 6.4 测试用例："花了 50 元"（无时间），验证 LLM 直接调用 `saveExpenseToLark` 且不传 `date` 参数
- [ ] 6.5 测试用例："1 月 2 日买书 80 元"
  - 验证 LLM 调用 `parseDateExpression({ type: "absolute", month: 1, day: 2 })`
  - 验证年份默认为当前年
- [ ] 6.6 测试用例："2025 年 1 月 2 日买书 80 元"
  - 验证 LLM 调用 `parseDateExpression({ type: "absolute", year: 2025, month: 1, day: 2 })`
- [ ] 6.7 在飞书多维表格中验证保存的日期字段是否正确

## 7. 文档更新

- [ ] 7.1 更新 `CLAUDE.md` 中的"核心组件"章节
- [ ] 7.2 添加 `parseDateExpression` 工具的说明
- [ ] 7.3 更新"日期处理策略"章节：
  - 说明 LLM 不再依赖当前时间
  - 说明 Tool 内部使用 `Date.now()` 获取当前时间
  - 说明两步工具调用流程
- [ ] 7.4 移除"动态系统提示中间件"相关的描述
- [ ] 7.5 更新架构说明，添加新工具

## 8. 代码清理和验证

- [ ] 8.1 检查 TypeScript 类型定义准确
- [ ] 8.2 运行 `pnpm build` 确保编译通过
- [ ] 8.3 验证 `saveExpenseToLark` 工具确实未被修改
- [ ] 8.4 确认向后兼容性：旧的对话流程仍然可用
- [ ] 8.5 验证移除时间注入后，LLM 仍能正确理解相对日期语义
- [ ] 8.6 确认提示词中不再有 `{{CURRENT_TIME}}` 相关内容
