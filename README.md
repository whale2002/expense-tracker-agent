# 智能记账 Agent

基于 LangChain 的智能记账助手，通过自然语言对话帮你记录每一笔消费和收入，并自动保存到飞书多维表格。

## ✨ 特性

- 🤖 **智能对话**：通过自然语言交互，无需手动填写表单
- 📝 **自动分类**：智能识别消费/收入类型和分类
- 📊 **飞书集成**：数据自动保存到飞书多维表格，方便管理和分析
- 💬 **多轮对话**：自动收集缺失信息，友好提醒
- 🔒 **类型安全**：使用 TypeScript + Zod 确保数据准确性

## 🚀 快速开始

### 1. 环境准备

确保你已安装 Node.js (v18+) 和 pnpm：

```bash
# 安装 pnpm（如果还没有）
npm install -g pnpm
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填入配置：

```bash
cp .env.example .env
```

需要配置以下内容：

#### API 配置（必填）

```env
# LLM API 配置
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
MODEL_NAME=doubao-seed-1-6-251015
```

**支持的服务商**：

- **字节跳动豆包**（推荐）

  - `OPENAI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3`
  - `MODEL_NAME=doubao-seed-1-6-251015`

- **OpenAI**
  - `OPENAI_BASE_URL=https://api.openai.com/v1`
  - `MODEL_NAME=gpt-4o-mini`

#### 飞书多维表格配置（必填）

1. 在[飞书开放平台](https://open.feishu.cn/)创建应用，获取 `app_id` 和 `app_secret`
2. 创建一个多维表格，添加以下字段：
   - `备注`（文本）
   - `分类`（单选：交通、零食、日用品、餐饮、教育、娱乐、旅游、衣服、工资、房租、购物、礼物、蔬果、个人护理、医疗）
   - `金额`（数字）
   - `收支`（单选：支出、收入）
   - `日期`（日期）
3. 从表格 URL 中提取 `app_token` 和 `table_id`

```env
FEISHU_APP_ID=your-feishu-app-id
FEISHU_APP_SECRET=your-feishu-app-secret
FEISHU_APP_TOKEN=your-bitable-app-token
FEISHU_TABLE_ID=your-table-id
```

#### LangSmith 追踪配置（可选）

用于调试和追踪 Agent 执行过程：

```env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_PROJECT=expense-tracker-agent
```

### 4. 启动项目

```bash
# 开发模式（热重载）
pnpm dev

# 生产模式
pnpm start
```

### 5. 开始记账

启动后，你可以通过自然语言与 Agent 对话：

```
你: 今天中午吃了肯德基，花了 55 元

Agent: 好的，我已经记录了这笔支出：
- 备注：今天中午吃了肯德基
- 分类：餐饮
- 金额：55 元
- 类型：支出
- 日期：2025-01-02 12:30:00

已成功保存到飞书多维表格！✅
```

## 📂 项目结构

```
expense-tracker-agent/
├── src/
│   ├── agent.ts           # Agent 主逻辑
│   ├── prompts.ts         # 系统提示词
│   ├── types.ts           # 类型定义
│   ├── tools/             # 工具函数
│   │   ├── index.ts
│   │   └── saveExpense.ts # 保存到飞书的工具
│   └── index.ts           # 入口文件
├── task/                  # 任务文档
├── .env                   # 环境变量配置（不提交）
├── .env.example           # 环境变量示例
└── package.json
```

## 🛠️ 技术栈

- **LangChain**：AI Agent 框架
- **LangGraph**：Agent 状态管理
- **Zod**：运行时类型校验
- **TypeScript**：类型安全
- **飞书开放平台**：数据存储

## 📝 支持的分类

- 支出类：交通、零食、日用品、餐饮、教育、娱乐、旅游、衣服、购物、礼物、蔬果、个人护理、医疗
- 收入类：工资、房租

## 🔧 开发

```bash
# 类型检查
pnpm build

# 运行 LangGraph Studio（可视化调试）
pnpm agent
```

## 📄 License

MIT
