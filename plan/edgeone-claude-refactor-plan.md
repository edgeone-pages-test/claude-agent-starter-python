# Claude Agent Starter 改造成 EdgeOne 全栈项目方案

## 1. 改造目标

参考项目：`/Users/wenyiqing/Desktop/agents/agent-example/openAI-agent-starter`

目标项目：`/Users/wenyiqing/Desktop/agents/agent-example/claude-agent-starter`

本次改造目标：

1. 将当前嵌套在 `frontend/` 下的全栈内容迁移到项目根目录，形成和 `openAI-agent-starter` 类似的 EdgeOne 全栈项目结构。
2. 删除旧的本地 FastAPI / Express 示例，避免和 EdgeOne Pages Functions 路由混淆。
3. 为 Claude Python agents 添加：
   - `POST /chat`
   - `POST /chat/stop`
   - `POST /history`
   - Claude Agent SDK `session_store` 持久化机制
4. 为 Claude Node agents 添加：
   - `POST /chat`
   - `POST /stop`
   - `POST /history`
   - Claude Agent SDK `sessionStore` 持久化机制
5. 前端接入 `conversation_id`、历史恢复、停止生成逻辑，和 OpenAI 项目前端保持一致。

---

## 2. 当前项目现状

当前 `claude-agent-starter` 结构大致为：

```text
claude-agent-starter/
├── agents/                      # 本地 Python FastAPI 示例，不是 EdgeOne route 结构
│   ├── tools.py
│   ├── model.py
│   └── requirements.txt
├── agents-js/                   # 本地 Node Express 示例，不是 EdgeOne route 结构
│   ├── tools.js
│   ├── model.js
│   └── package.json
├── frontend/                    # 当前真正的全栈项目内容
│   ├── src/                     # React + Vite 前端
│   ├── agents-python/           # EdgeOne Python agents
│   │   └── chat/index.py
│   ├── agents/                  # 当前是 Express 风格，不是 OpenAI 项目那种 route 文件结构
│   │   ├── tools.js
│   │   └── _model.js
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── uv.toml
├── plan/
├── main.py
└── README.md
```

主要问题：

- `frontend/` 这一层不需要，应该把里面的全栈内容搬到项目根目录。
- 根目录已有 `agents/`、`agents-js/`，但它们是本地服务示例，不是 EdgeOne Pages Functions 结构。
- Python agent 当前只有 `chat/index.py`，没有 `stop` 和 `history`。
- Node agent 当前是 Express server，应该改造成 `openAI-agent-starter/agents/` 那种文件即路由结构。
- 当前 Claude chat 没有接入 `ctx.store.claude_session_store()`，无法跨请求恢复 Claude SDK transcript。
- 前端当前没有 `conversation_id`、`/history`、`/stop` 逻辑。
- `frontend/agents/_model.js`、`agents-js/model.js` 中存在硬编码测试 key 和 baseURL，改造时应改为环境变量。

---

## 3. 目标目录结构

改造后建议结构：

```text
claude-agent-starter/
├── src/                         # 从 frontend/src 搬到根目录
│   ├── App.tsx
│   ├── api.ts
│   ├── types.ts
│   └── components/
├── agents/                      # Node/TS EdgeOne Pages Functions
│   ├── chat/
│   │   └── index.ts             # POST /chat
│   ├── stop/
│   │   └── index.ts             # POST /stop
│   ├── history/
│   │   └── index.ts             # POST /history
│   ├── _model.ts                # Claude 模型与环境变量配置
│   └── _logger.ts               # 日志工具
├── agents-python/               # Python EdgeOne Pages Functions
│   ├── chat/
│   │   ├── index.py             # POST /chat
│   │   ├── stop.py              # POST /chat/stop
│   │   ├── _model.py            # Claude 模型与环境变量配置
│   │   └── _logger.py           # 日志工具
│   └── history/
│       └── index.py             # POST /history
├── plan/
│   └── edgeone-claude-refactor-plan.md
├── index.html                   # 从 frontend/index.html 搬出
├── package.json                 # 从 frontend/package.json 搬出并补充 agent 依赖
├── package-lock.json            # 从 frontend/package-lock.json 搬出
├── tsconfig.json                # 从 frontend/tsconfig.json 搬出
├── vite.config.ts               # 从 frontend/vite.config.ts 搬出
├── uv.toml                      # 从 frontend/uv.toml 搬出
├── requirements.txt             # Python agents 依赖
├── .env.example                 # 环境变量示例，不放真实 key
└── README.md
```

迁移注意：

- 不迁移 `frontend/node_modules/`。
- 不迁移 `frontend/dist/`。
- 不迁移 `frontend/.edgeone/` 作为源码；它是构建/运行产物，可重新生成。
- 根目录旧 `agents/`、`agents-js/` 确认无用后直接删除，不再保留归档目录。

---

## 4. 前端改造方案

前端以 `openAI-agent-starter/src` 为参考，把当前 `frontend/src` 改造成支持会话的版本。

### 4.1 `conversation_id`

在 `src/App.tsx` 中增加：

```ts
const CONVERSATION_ID_STORAGE_KEY = 'eo_conversation_id';

function getOrCreateConversationId(): string {
  const cached = localStorage.getItem(CONVERSATION_ID_STORAGE_KEY);
  if (cached) return cached;

  const conversationId = crypto.randomUUID();
  localStorage.setItem(CONVERSATION_ID_STORAGE_KEY, conversationId);
  return conversationId;
}
```

用途：

- 每个浏览器会话绑定一个 `conversation_id`。
- `/chat` 请求通过 header `pages-agent-conversation-id` 传给 EdgeOne runtime。
- `/history` 用同一个 header 恢复历史。
- `/stop` body 中传 `{ conversation_id }`。

### 4.2 `src/api.ts`

参考 OpenAI 项目改成：

```ts
export const API = {
  chat: '/chat',
  chatStop: '/stop',
  history: '/history',
} as const;
```

需要提供：

- `fetchConversationHistory(conversationId)`
- `sendMessageStream(message, callbacks, conversationId)`
- `stopAgent(conversationId)`

注意：

- `/chat` 请求带 `pages-agent-conversation-id`。
- `/history` 请求带 `pages-agent-conversation-id`。
- `/stop` 不带 `pages-agent-conversation-id` header，避免 runtime 覆盖目标 chat 请求的 signal；目标会话 ID 只放 body。

### 4.3 `src/App.tsx`

增加：

- `historyLoading` 状态。
- 首次加载调用 `/history` 恢复消息。
- `abortCtrlRef` 保存前端流读取的 `AbortController`。
- `handleStop()`：
  1. 先 `abortCtrlRef.current.abort()` 停止前端读取；
  2. 再 `await stopAgent(conversationIdRef.current)` 通知后端真正中断；
  3. UI 追加“已停止生成”提示。
- `handleClearHistory()`：生成新的 `conversation_id` 并清空 UI。

---

## 5. Claude Python agents 改造方案

目标目录：`agents-python/`

### 5.1 `agents-python/chat/index.py`

以当前 `frontend/agents-python/chat/index.py` 为基础，参考 OpenAI Python 的流式结构补齐：

- 读取 `ctx.request.body["message"]`。
- 读取 `ctx.conversation_id`。
- 读取 `ctx.request.signal` 作为取消信号。
- 每 15 秒发送 `ping` 心跳。
- 使用 `ClaudeSDKClient` 或 `query()` 流式输出 Claude 消息。
- 捕获 Claude partial message，转换为前端 SSE：
  - `text_delta`
  - `tool_called`
  - `ping`
  - `error`
  - `done`

### 5.2 Python session store 接入

EdgeOne 已提供：

```python
store = ctx.store.claude_session_store()
```

Claude SDK 的 `ClaudeAgentOptions` 支持：

- `session_store`
- `session_id`
- `resume`
- `continue_conversation`
- `load_timeout_ms`

建议策略：

```python
cid = ctx.conversation_id
store = ctx.store.claude_session_store()
project_key = get_project_key_for_current_agent()
existing = await store.load({"project_key": project_key, "session_id": cid})

options = build_agent_options()
options.session_store = store

if existing:
    options.resume = cid
else:
    options.session_id = cid
```

原因：

- 新会话：用 `session_id=cid`，让 Claude CLI 生成固定 session transcript。
- 旧会话：用 `resume=cid`，Claude SDK 会先从 `session_store.load()` 恢复 JSONL transcript，再继续对话。
- `conversation_id` 应使用 UUID。前端 `crypto.randomUUID()` 正好满足 Claude SDK 对 session id 的 UUID 要求。

`project_key` 需要和 SDK 写入 store 时使用的 key 一致。可选方案：

1. 优先使用 Claude SDK 内部的 `project_key_for_directory(options.cwd)`；
2. 或在 `_model.py` 中固定 `cwd`，并统一通过同一个 helper 计算 project key；
3. 不建议在 chat 和 history 中各自硬编码不同 project key。

### 5.3 `agents-python/chat/stop.py`

参考：`openAI-agent-starter/agents-python/chat/stop.py`

实现：

```python
async def handler(context):
    body = context.request.body or {}
    conversation_id = body.get("conversation_id")
    if not conversation_id:
        return {"status_code": 400, "body": {"message": "conversation_id is required"}}

    result = context.utils.abort_active_run(conversation_id)
    return {
        "status": "aborting" if result.aborted else "idle",
        "conversationId": result.conversation_id or conversation_id,
        "runId": result.run_id,
        "aborted": result.aborted,
    }
```

chat 流式循环中需要监听 `ctx.request.signal`，一旦 signal 被 set：

- 停止读取 Claude SDK stream；
- 关闭 async generator / client；
- 释放 Claude CLI 子进程或上游请求；
- 最终发送 `done`，其中 `stopped=true`。

### 5.4 `agents-python/history/index.py`

Claude history 不应读取 OpenAI message memory，而应读取 Claude transcript store：

```python
store = context.store.claude_session_store()
entries = await store.load({"project_key": project_key, "session_id": context.conversation_id})
```

返回给前端时需要把 Claude transcript entries 转换成统一 `Message[]`：

```json
{
  "conversation_id": "...",
  "messages": [
    {
      "id": "...",
      "role": "user",
      "content": "...",
      "timestamp": 0
    },
    {
      "id": "...",
      "role": "assistant",
      "content": "...",
      "timestamp": 0
    }
  ]
}
```

过滤规则：

- 只返回前端可展示的 `user` / `assistant` 文本。
- 跳过：
  - `system`
  - `tool_use`
  - `tool_result`
  - `result`
  - `summary`
  - subagent 内部 transcript
- `assistant.message.content` 中只提取 `type == "text"` 的文本。
- `user.message.content` 支持 string 或 list block。
- timestamp 可优先使用 entry 的 `timestamp`，否则退回 `mtime` 或 `0`。

---

## 6. Claude Node agents 改造方案

目标目录：`agents/`

当前 `frontend/agents/tools.js` 是 Express app，需要拆成 EdgeOne Pages Functions 路由文件。

### 6.1 `agents/chat/index.ts`

参考：`openAI-agent-starter/agents/chat/index.ts`

职责：

- `onRequest(context)` 作为 `POST /chat` 入口。
- 读取 `context.request.body.message`。
- 读取 `context.conversation_id`。
- 读取 `context.request.signal`。
- 使用 `context.store.claude_session_store()` 获取 Claude session store。
- 将 `sessionStore` / `resume` / `sessionId` 传给 Claude Agent SDK。
- 通过 `ReadableStream` 输出 SSE。
- 心跳保活。
- signal aborted 时停止流式读取。

伪代码：

```ts
export async function onRequest(context: any) {
  const message = context.request.body?.message;
  const conversationId = context.conversation_id;
  const signal = context.request.signal;
  const store = context.store?.claude_session_store?.();

  const sessionExists = await hasClaudeSession(store, conversationId);

  const options = buildAgentOptions({
    sessionStore: store,
    sessionId: sessionExists ? undefined : conversationId,
    resume: sessionExists ? conversationId : undefined,
  });

  const stream = new ReadableStream({
    async start(controller) {
      // query({ prompt: message, options, abortSignal: signal })
      // 将 Claude SDK message 转成 SSE
    }
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
}
```

具体字段名需以当前 `@anthropic-ai/claude-agent-sdk` JS 版本为准：

- Python 字段是 `session_store` / `session_id` / `resume`。
- JS/TS SDK 通常使用 camelCase：`sessionStore` / `sessionId` / `resume`。

### 6.2 `agents/stop/index.ts`

参考：`openAI-agent-starter/agents/stop/index.ts`

职责：

- 路由：`POST /stop`
- body：`{ "conversation_id": "..." }`
- 调用：`context.utils.abortActiveRun(conversationId)`
- 返回：

```json
{
  "status": "aborting",
  "conversationId": "...",
  "runId": "...",
  "aborted": true
}
```

注意：

- 不再使用 Express 里的全局 `activeRuns` Map。
- EdgeOne runtime 已提供跨路由的 active run 管理。
- stop 请求不要带 `pages-agent-conversation-id` header。

### 6.3 `agents/history/index.ts`

职责：

- 路由：`POST /history`
- 从 `context.store.claude_session_store()` 读取 transcript。
- 将 Claude transcript entries 转成前端 `Message[]`。

伪代码：

```ts
export async function onRequest(context: any) {
  const conversationId = context.conversation_id ?? '';
  const store = context.store?.claude_session_store?.();
  if (!store || !conversationId) {
    return json({ conversation_id: conversationId, messages: [] });
  }

  const projectKey = getProjectKeyForCurrentAgent();
  const entries = await store.load({ project_key: projectKey, session_id: conversationId });
  const messages = transcriptEntriesToFrontendMessages(entries ?? []);

  return json({ conversation_id: conversationId, messages });
}
```

### 6.4 `agents/_model.ts`

从当前 `frontend/agents/_model.js` 拆出配置，但必须移除硬编码 key：

```ts
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
```

环境变量建议：

```text
ACTIVE_PROVIDER=anthropic_official
ANTHROPIC_API_KEY=
ANTHROPIC_BASE_URL=
ANTHROPIC_CUSTOM_HEADERS=
ANTHROPIC_SMALL_FAST_MODEL=
AI_GATE_API_KEY=
AI_GATE_BASE_URL=
AI_GATE_MODEL=
AI_GATE_SMALL_MODEL=
```

### 6.5 `agents/_logger.ts`

参考 OpenAI 项目，提供：

```ts
export function createLogger(tag: string) {
  return {
    log: (...args: unknown[]) => console.log(`[${tag}]`, ...args),
    error: (...args: unknown[]) => console.error(`[${tag}]`, ...args),
  };
}
```

---

## 7. Claude SessionStore 机制说明

EdgeOne 中 Claude session store 使用：

```python
store = ctx.store.claude_session_store()
```

它应满足 Claude SDK `SessionStore` 接口：

```python
await store.append(key, entries)
await store.load(key)
await store.list_sessions(project_key)
await store.list_subkeys(key)
await store.delete(key)
```

key 结构：

```python
{
  "project_key": "...",
  "session_id": "...",
  # 可选，subagent transcript 使用
  "subpath": "subagents/agent-reviewer"
}
```

使用原则：

- `conversation_id` 对应 Claude `session_id`。
- `session_store` 保存的是 Claude CLI transcript JSONL，不是普通 chat message。
- `/history` 是业务展示接口，需要从 transcript 中过滤和格式化 user/assistant 文本。
- 不要把 Claude transcript 同时写入 OpenAI `memory.session()`，避免两套 memory 混淆。
- 不要手动 append 本轮 user/assistant 到 store；Claude SDK 会通过 `session_store` mirror transcript。
- `session_store.append()` 可能批量写入多种事件，history 需要过滤系统事件和工具事件。

---

## 8. API 定义

### 8.1 `POST /chat`

请求头：

```text
pages-agent-conversation-id: <conversation_id>
```

请求体：

```json
{
  "message": "你好"
}
```

响应：SSE。

事件：

```text
event: text_delta
data: {"delta":"你好"}

```

```text
event: tool_called
data: {"tool":"Bash"}

```

```text
event: ping
data: {"ts": 1710000000000}

```

```text
event: error
data: {"message":"..."}

```

```text
event: done
data: {"stopped": false}

```

### 8.2 `POST /stop`

请求体：

```json
{
  "conversation_id": "<conversation_id>"
}
```

响应：

```json
{
  "status": "aborting",
  "conversationId": "<conversation_id>",
  "runId": "<run_id>",
  "aborted": true
}
```

### 8.3 `POST /history`

请求头：

```text
pages-agent-conversation-id: <conversation_id>
```

响应：

```json
{
  "conversation_id": "<conversation_id>",
  "messages": [
    {
      "id": "msg-id",
      "role": "user",
      "content": "你好",
      "timestamp": 1710000000000
    }
  ]
}
```

---

## 9. 分阶段实施计划

### 阶段一：目录迁移

1. 将 `frontend/src` 移到根目录 `src`。
2. 将 `frontend/index.html`、`package.json`、`package-lock.json`、`tsconfig.json`、`vite.config.ts`、`uv.toml` 移到根目录。
3. 将 `frontend/agents-python` 移到根目录 `agents-python`。
4. 删除 `frontend/agents`，后续按 OpenAI 项目结构重建 `agents/`。
5. 根目录旧 `agents/`、`agents-js/` 确认无用后直接删除。
6. 删除空的 `frontend/`。

验收：

- 根目录 `npm run build` 可运行。
- 根目录具备 `src/`、`agents/`、`agents-python/` 三个主要目录。

### 阶段二：前端会话能力

1. 在 `src/App.tsx` 增加 `conversation_id` 管理。
2. 在 `src/api.ts` 增加 `/history` 和 `/stop`。
3. 发送 `/chat` 时带 `pages-agent-conversation-id`。
4. 页面加载时从 `/history` 恢复消息。
5. ChatInput 支持 stop 和 clear history。

验收：

- 刷新页面后能恢复历史。
- 点击停止能触发 `/stop`。
- 清空历史后生成新的 `conversation_id`。

### 阶段三：Python agents

1. 拆出 `_logger.py`。
2. 完善 `_model.py`，移除硬编码 key。
3. 改造 `chat/index.py`：接入 `ctx.store.claude_session_store()`。
4. 新增 `chat/stop.py`。
5. 新增 `history/index.py`。

验收：

- `POST /chat` 支持 Claude 流式输出。
- 同一 `conversation_id` 下第二轮可以继承上下文。
- `POST /chat/stop` 可以中断正在输出的 Claude run。
- `POST /history` 能从 Claude transcript 恢复 user/assistant 文本。

### 阶段四：Node agents

1. 用 OpenAI 项目的 Node agents 结构重建 `agents/`。
2. 新增 `agents/chat/index.ts`。
3. 新增 `agents/stop/index.ts`。
4. 新增 `agents/history/index.ts`。
5. 新增 `agents/_model.ts`、`agents/_logger.ts`。
6. 在 `package.json` 中补充 Claude JS SDK 依赖。

验收：

- Node agents 不再依赖 Express server。
- `POST /chat`、`POST /stop`、`POST /history` 路由与前端联通。
- sessionStore 写入和恢复正常。

### 阶段五：文档与清理

1. 更新 `README.md`。
2. 新增 `.env.example`。
3. 新增或更新 `requirements.txt`。
4. 清理旧目录和无用入口。
5. 确认没有提交真实密钥。

验收：

- 新用户可以按 README 启动项目。
- `.env.example` 只有变量名，没有真实 key。
- `npm run build` 通过。
- Python agents 依赖可安装。

---

## 10. 风险与注意事项

1. **Claude session_id 必须是 UUID**
   - 前端使用 `crypto.randomUUID()`。
   - 不要使用普通字符串如 `conv-123` 作为 Claude `resume/session_id`。

2. **project_key 必须一致**
   - chat 写入 store 和 history 读取 store 必须使用同一个 `project_key`。
   - 否则 `/history` 会读不到 transcript。

3. **不要混用 OpenAI memory 和 Claude session store**
   - OpenAI 使用 `memory.session()` / `openai_session()`。
   - Claude 使用 `memory.claude_session_store()`。

4. **不要手动重复写入 transcript**
   - Claude SDK 设置 `session_store` 后会 mirror transcript。
   - 业务代码不要再手动 append user/assistant，避免重复历史。

5. **stop 不是只断开前端连接**
   - 前端 abort 只能停止读取。
   - 后端必须调用 `context.utils.abort_active_run()` 才能通知 runtime 中断目标 run。

6. **Node 版本不要继续使用 Express app**
   - EdgeOne Pages Functions 应使用 `export async function onRequest(context)`。
   - 文件路径决定路由。

7. **密钥管理**
   - 当前 Claude JS 示例中有硬编码 `apiKey` / `baseURL`，需要全部改为环境变量。
   - `.env.example` 不允许放真实 key。

---

## 11. 最小可用版本验收清单

- [ ] 项目根目录可以直接作为 EdgeOne 全栈项目运行。
- [ ] 不再需要 `frontend/` 包裹层。
- [ ] 前端可以发送 `/chat` 并收到 `text_delta`。
- [ ] 前端可以点击 stop，中断正在生成的回答。
- [ ] 同一 `conversation_id` 下 Claude 能继续上下文。
- [ ] 刷新页面后 `/history` 可以恢复 user/assistant 消息。
- [ ] Node agents 和 Python agents 都具备 chat / stop / history 能力。
- [ ] Claude session 使用 `ctx.store.claude_session_store()`。
- [ ] 没有提交真实 API key。
- [ ] README、`.env.example`、依赖文件完成更新。
