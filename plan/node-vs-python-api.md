# EdgeOne Memory & Session API — Node vs Python 对比

## 1. 获取 memory 对象

| | Node (TypeScript) | Python |
|---|---|---|
| 来源 | `context.store` | `ctx.store` (或 `getattr(ctx, "store", None)`) |
| 类型 | 对象，方法用 camelCase | `ConversationMemory` 实例，方法用 snake_case |
| 空值 | `context.store ?? null` | `getattr(ctx, "store", None)` |

---

## 2. 消息读写 (Memory CRUD)

### `appendMessage` — 追加消息

```typescript
// Node — 对象参数
await memory.appendMessage({
  conversationId: cid,
  role: 'user',           // 'user' | 'assistant' | 'system' | 'tool'
  content: 'Hello',
  metadata: {},           // 可选，run_id 自动注入
  userId: '',             // 可选，用于 user 维度索引
});
```

```python
# Python — 位置参数
await memory.append_message(
    cid,                  # conversation_id: str
    "user",               # role: str
    "Hello",              # content: Any
    metadata=None,        # 可选
    user_id=None,         # 可选
)
```

**关键差异**：Node 用**单个对象**传参，Python 用**位置参数**。

---

### `getMessages` — 读取消息

```typescript
// Node — 对象参数
const messages = await memory.getMessages({
  conversationId: cid,
  limit: 100,             // 默认 20，最大 100
  order: 'asc',           // 'asc' | 'desc'，默认 'asc'
  after: undefined,       // 分页 cursor (message_id)
  before: undefined,      // 分页 cursor (message_id)
});
// 返回: Array<{ messageId, role, content, createdAt, metadata? }>
```

```python
# Python — 位置 + 关键字参数
messages = await memory.get_messages(
    cid,                  # conversation_id: str
    limit=100,            # 默认 20，最大 100
    order="asc",          # 'asc' | 'desc'，默认 'asc'
    after=None,           # 分页 cursor
    before=None,          # 分页 cursor
)
# 返回: List[Message]  (message_id, role, content, created_at, metadata)
```

**关键差异**：
- Node 全部包在 `{}` 对象里；Python 第一个参数是位置参数
- 返回字段命名：Node `messageId`/`createdAt` (camelCase) vs Python `message_id`/`created_at` (snake_case)

---

### 其他 Memory 方法

| 操作 | Node | Python |
|---|---|---|
| 删除消息 | `memory.deleteMessage({ conversationId, messageId })` | `await memory.delete_message(cid, msg_id)` |
| 清空消息 | `memory.clearMessages({ conversationId })` | `await memory.clear_messages(cid)` |
| 更新消息 | `memory.updateMessage({ conversationId, messageId, content?, metadata? })` | `await memory.update_message(cid, msg_id, content=..., metadata=...)` |
| 获取会话 | `memory.getConversation({ conversationId })` | `await memory.get_conversation(cid)` |
| 列举会话 | `memory.listConversations({ limit, order, after, before, userId? })` | `await memory.list_conversations(limit=..., order=..., user_id=...)` |
| 删除会话 | `memory.deleteConversation({ conversationId })` | `await memory.delete_conversation(cid)` |

---

## 3. OpenAI Session (OpenAI Agents SDK 适配)

```typescript
// Node
const session = memory.openaiSession(conversationId, { maxItems: 100 });
// session 实现了 OpenAI Agents SDK Session 协议:
//   session.getItems(limit?)  → 读历史
//   session.addItems(items)   → 写本轮
//   session.popItem()         → 弹出最后一条
//   session.clearSession()    → 清空

// 用法：
import { run, Agent } from '@openai/agents';
const result = await run(agent, message, { session });
```

```python
# Python
session = memory.openai_session(cid, max_items=100)
# 别名: memory.session(cid) 也可以
# session 实现了 OpenAI Agents SDK Session 协议:
#   await session.get_items(limit?)
#   await session.add_items(items)
#   await session.pop_item()
#   await session.clear_session()

# 用法：
from agents import Runner
result = Runner.run_streamed(agent, input=message, session=session)
```

**关键差异**：
- Node `openaiSession(id, { maxItems })` — camelCase
- Python `openai_session(id, max_items=)` — snake_case
- 别名：Python 有 `memory.session()`，Node 没有

---

## 4. Claude Session Store (Claude Agent SDK 适配)

```typescript
// Node
const claudeSessionStore = memory.claudeSessionStore();
// claudeSessionStore 实现了 Claude Agent SDK SessionStore 协议

// 传给 SDK:
const options = {
  sessionStore: claudeSessionStore,  // SDK 字段名是 sessionStore
  // ...其他选项
};
query({ prompt, options });
```

```python
# Python
store = memory.claude_session_store()
# store 实现了 Claude Agent SDK SessionStore 协议

# 传给 SDK:
opts = ClaudeAgentOptions(...)
opts.session_store = store  # SDK 字段名是 session_store
ClaudeSDKClient(options=opts)
```

### SessionStore 接口方法

| 方法 | Node (camelCase) | Python (snake_case) |
|---|---|---|
| 追加 | `store.append(key, entries)` | `await store.append(key, entries)` |
| 加载 | `store.load(key)` | `await store.load(key)` |
| 列举 | `store.listSessions(projectKey)` | `await store.list_sessions(project_key)` |
| 删除 | `store.delete(key)` | `await store.delete(key)` |
| 子路径 | `store.listSubkeys(key)` | `await store.list_subkeys(key)` |

### SessionKey 结构

```typescript
// Node
{ projectKey: "...", sessionId: "...", subpath?: "..." }
```

```python
# Python
{"project_key": "...", "session_id": "...", "subpath": "..."}  # dict
```

**关键差异**：
- 获取方法名：Node `claudeSessionStore()` vs Python `claude_session_store()`
- 但 `context.store` 上的原始方法名都是 `claude_session_store()`（Node runtime 用下划线风格暴露）
- SDK 字段名：Node `sessionStore` vs Python `session_store`
- Key dict 字段：Node `projectKey`/`sessionId` vs Python `project_key`/`session_id`

---

## 5. 从 context 获取的属性对比

| 属性 | Node | Python |
|---|---|---|
| 会话 ID | `context.conversation_id` | `ctx.conversation_id` |
| 运行 ID | `context.run_id` | `ctx.run_id` |
| 请求体 | `context.request.body` | `ctx.request.body` |
| 取消信号 | `context.request.signal` (AbortSignal) | `ctx.request.signal` (asyncio.Event) |
| Store | `context.store` | `ctx.store` |
| 中断运行 | `context.utils.abortActiveRun(cid)` | `ctx.utils.abort_active_run(cid)` |

---

## 6. 速查：命名风格总结

| 概念 | Node | Python |
|---|---|---|
| 追加消息 | `appendMessage({...})` | `append_message(cid, role, content)` |
| 获取消息 | `getMessages({...})` | `get_messages(cid, ...)` |
| OpenAI Session | `openaiSession(id)` | `openai_session(id)` |
| Claude Store | `claudeSessionStore()` | `claude_session_store()` |
| 中断运行 | `abortActiveRun(cid)` | `abort_active_run(cid)` |
| 消息 ID | `messageId` | `message_id` |
| 创建时间 | `createdAt` | `created_at` |
| 参数风格 | **单个对象** `fn({ key: val })` | **位置 + 关键字** `fn(val, key=val)` |
