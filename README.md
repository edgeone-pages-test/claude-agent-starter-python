# Claude Agent Starter

基于 Anthropic Claude Agent SDK 的 EdgeOne 全栈项目模板。

## 功能

- **SSE 流式聊天**：逐 token 推送 `text_delta`，命中工具推 `tool_called`
- **会话持久化**：通过 `claude_session_store()` 保存 Claude transcript，支持跨请求上下文恢复
- **历史恢复**：刷新页面后 `/history` 自动恢复聊天记录
- **停止生成**：前端 + 后端双重取消机制，真正中断 LLM 请求
- **双语言后端**：Node.js (TypeScript) 和 Python 两套 EdgeOne Pages Functions 实现
- 3 个内置工具灯泡（Bash / WebFetch / TodoWrite）会在 Claude 调用时点亮

## 目录结构

```
claude-agent-starter/
├── src/                    # React + Vite + TypeScript 前端
│   ├── App.tsx             # 主应用（含 conversation_id 管理）
│   ├── api.ts              # /chat, /stop, /history 请求封装
│   └── components/         # ChatWindow, ChatInput, ToolIndicators 等
├── agents/                 # Node/TS EdgeOne Pages Functions
│   ├── chat/index.ts       # POST /chat — SSE 流式聊天
│   ├── stop/index.ts       # POST /stop — 中断 agent
│   ├── history/index.ts    # POST /history — 历史消息
│   ├── _model.ts           # 模型与环境变量配置
│   └── _logger.ts          # 日志工具
├── agents-python/          # Python EdgeOne Pages Functions
│   ├── chat/
│   │   ├── index.py        # POST /chat — SSE 流式聊天
│   │   ├── stop.py         # POST /chat/stop — 中断 agent
│   │   ├── _model.py       # 模型与环境变量配置
│   │   └── _logger.py      # 日志工具
│   ├── history/
│   │   └── index.py        # POST /history — 历史消息
│   └── config.json         # 路由配置
├── package.json            # 项目依赖（含 Claude JS SDK）
├── requirements.txt        # Python agents 依赖
├── .env.example            # 环境变量模板
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── uv.toml                 # Python 包管理镜像配置
```

## 快速开始

### 1) 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 API key
```

支持两种 provider：
- **anthropic_official**：直连 Anthropic API（推荐）
- **ai_gate**：通过 AI 网关（需兼容 Anthropic Messages API）

### 2) 安装依赖

```bash
npm install
```

Python agents 另需：
```bash
pip install -r requirements.txt
```

### 3) 本地开发

```bash
# EdgeOne Pages 本地开发（推荐，同时启动前后端）
npm run dev:agents

# 或仅启动前端 Vite dev server
npm run dev
```

### 4) 前提条件

Claude Agent SDK 依赖 Claude Code CLI：
```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/chat` | POST | SSE 流式聊天，header 带 `pages-agent-conversation-id` |
| `/stop` | POST | 中断正在执行的 agent，body 传 `conversation_id` |
| `/history` | POST | 获取历史消息，header 带 `pages-agent-conversation-id` |

### SSE 事件

```
event: text_delta     data: {"delta":"你好"}
event: tool_called    data: {"tool":"Bash"}
event: ping           data: {"ts":1710000000000}
event: error          data: {"message":"..."}
event: done           data: {"stopped":false}
```

## 实现要点

- **会话持久化**：通过 `ctx.store.append_message()` / `get_messages()` 保存和恢复对话历史
- **双重取消机制**：
  1. 前端 `AbortController.abort()` 停止 SSE 读取
  2. 后端 `context.utils.abortActiveRun()` 真正中断 LLM 请求
- **心跳保活**：每 15 秒发送 `ping` 事件，防止网关/CDN 超时断连
- Node 版使用 `query()` + diff 计算 text delta
- Python 版使用 `ClaudeSDKClient` + `receive_response()` 流式事件
