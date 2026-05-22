# 首页右侧 CodeViewer 展示代码草案

这份代码用于首页右侧 `CodeViewer` 展示，目标是**简洁表达 EdgeOne 上创建 Claude Agent Python 版的关键流程**，不要求直接运行。重点展示：

- `context.store`：保存用户/助手消息，支持历史恢复；
- `store.claude_session_store()`：注入 Claude Agent SDK 会话记忆；
- `context.tools.all()`：获取 EdgeOne 沙箱工具；
- `SdkMcpTool` + `create_sdk_mcp_server()`：把 EdgeOne tools 包装成 Claude MCP Server；
- `query()`：启动 Claude Agent。

```python
from claude_agent_sdk import ClaudeAgentOptions, SdkMcpTool, create_sdk_mcp_server, query

from .._model import collect_gateway_env, resolve_model_name

SYSTEM_PROMPT = "..."

async def handler(context):
    message = context.request.body.get("message", "")
    conversation_id = context.conversation_id
    store = context.store

    # 1. EdgeOne Store：保存用户消息，供历史恢复
    await store.append_message(conversation_id, "user", message)

    # 2. EdgeOne Store：注入 Claude Agent SDK 会话记忆
    session_store = store.claude_session_store()

    # 3. EdgeOne Tools：读取平台沙箱工具
    platform_tools = context.tools.all()

    commands = SdkMcpTool(
        name="commands",
        description="Execute shell commands in EdgeOne sandbox",
        input_schema={"type": "object", "properties": {"cmd": {"type": "string"}}},
        handler=lambda args: call_edgeone_tool(platform_tools, "commands", args),
    )

    # files / code_interpreter / browser 同理，这里省略

    # 4. 注册 EdgeOne MCP Server
    edgeone = create_sdk_mcp_server(
        name="edgeone",
        tools=[commands],
    )

    # 5. 创建 Claude Agent 运行参数
    options = ClaudeAgentOptions(
        model=resolve_model_name(),
        system_prompt=SYSTEM_PROMPT,
        session_store=session_store,
        mcp_servers={"edgeone": edgeone},
        allowed_tools=["mcp__edgeone__commands"],
        permission_mode="bypassPermissions",
        max_turns=10,
        env=collect_gateway_env(),
    )

    # 6. 启动 Claude Agent
    result = query(prompt=message, options=options)

    # 这里省略 SSE、text_delta、tool_called 等流式细节
    assistant_text = await collect_assistant_text(result)

    # 7. EdgeOne Store：保存助手回复，供 /history 恢复
    await store.append_message(conversation_id, "assistant", assistant_text)

    return {"answer": assistant_text}

async def call_edgeone_tool(platform_tools, name, args):
    target = next(
        tool for tool in platform_tools
        if getattr(tool, "name", None) == name or getattr(getattr(tool, "function", None), "name", None) == name
    )
    execute = getattr(target, "execute", None) or getattr(target, "handler", None) or getattr(target, "invoke", None)
    return await execute(args)

async def collect_assistant_text(result):
    # 伪代码：消费 Claude Agent SDK 输出并拼接 assistant 文本
    return "..."
```

## 建议在 CodeViewer 中突出展示的流程

1. `context.store`：读写用户/助手消息；
2. `store.claude_session_store()`：为 Claude Agent SDK 注入会话记忆；
3. `context.tools.all()`：获取 EdgeOne 沙箱工具；
4. `SdkMcpTool`：把 EdgeOne tools 包装成 Claude Agent SDK MCP tools；
5. `create_sdk_mcp_server()`：注册 EdgeOne MCP Server；
6. `allowed_tools`：只允许调用 EdgeOne 工具；
7. `query(prompt, options)`：启动 Claude Agent；
8. `store.append_message()`：保存助手回复，支持历史恢复。
