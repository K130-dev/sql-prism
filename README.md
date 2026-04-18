# SQL Prism

<div align="center">
  <img src="assets/sql-prism.png" alt="SQL Prism" width="100%" />
</div>

## 简介

SQL Prism 是一款现代化的 SQL 可视化分析工具，能够将复杂的嵌套 SQL 语句转化为清晰、可导航的树状结构。借助 AI 能力，它能够自动解析 SQL 语法树，识别查询组件，并渲染出交互式的依赖关系图——让任何复杂的查询一目了然。

**在线体验地址**：https://sql-prism.vercel.app

## 核心特性

- **AI 智能解析** — 基于 MiniMax 大模型深度理解 SQL 语义，精准提取查询结构
- **交互式 AST 检查器** — 点击图谱中的任意节点，即可查看详细信息、列来源及对应 SQL 片段
- **智能代码高亮** — 选中节点时，对应 SQL 代码块会以霓虹风格视觉提示突出显示
- **力导向可视化图** — 使用 D3.js 渲染查询依赖关系的动态交互图
- **可调节面板布局** — 三栏式布局（SQL 编辑器、检查器、可视化区域），支持拖拽调整宽度
- **赛博朋克暗色主题** — 精致的现代 UI，霓虹点缀，适合长时间开发工作

## 工作流程

1. **输入** — 将任意 SQL 查询（SELECT、WITH 子句、JOIN、子查询）粘贴至左侧编辑器
2. **分析** — 点击「解析」按钮，将查询发送至 AI 后端进行分析
3. **可视化** — 查询被解析为节点（CTE、子查询、JOIN、聚合等）并渲染为交互式图谱
4. **检查** — 点击任意节点，在检查器面板查看其 SQL 片段、列信息及元数据
5. **导航** — 选中节点时，编辑器会自动滚动并高亮对应的 SQL 代码

## 技术栈

- **前端**：React 19、TypeScript、Vite
- **可视化**：D3.js（力导向图）
- **AI**：MiniMax API（Anthropic 兼容模式）
- **后端代理**：Vercel Serverless Functions（解决跨域问题）
- **图标**：Lucide React
- **动画**：Framer Motion

## 快速开始

### 环境要求

- Node.js 18+
- MiniMax API Key

### 安装

```bash
npm install
```

### 配置

在项目根目录创建 `.env.local` 文件：

```bash
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

### 开发

```bash
npm run dev
```

在浏览器中打开 http://localhost:5173

### 构建

```bash
npm run build
```

## 项目结构

```
├── App.tsx                  # 主应用组件（欢迎页 & 查询分析器）
├── index.tsx               # React 入口
├── api/
│   └── analyze.ts          # Vercel 后端代理（处理 CORS & API 调用）
├── components/
│   ├── LandingPage.tsx     # 欢迎页（Logo & 开始按钮）
│   ├── QueryVisualizer.tsx # D3 力导向图可视化组件
│   └── AstInspector.tsx    # 右侧面板：节点元数据 & SQL 片段展示
├── services/
│   └── aiService.ts        # AI 服务集成（调用本地代理端点）
├── types.ts                # TypeScript 类型定义
├── metadata.json           # 应用元数据
└── assets/
    └── sql-prism.png        # 产品展示图
```

## 安全说明

- API Key 仅在 Vercel 环境变量中配置，不会随代码仓库暴露
- `.env` 文件已被 Git 忽略
- 本地开发时，API 请求通过 Vercel Functions 代理，避免前端直接暴露密钥

## License

MIT
