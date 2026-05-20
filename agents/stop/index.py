"""
Stop handler — EdgeOne Pages Functions
========================================

文件路径 agents-python/stop/index.py 自动映射到 **POST /stop**

与 agents-python/chat/stop.py (POST /chat/stop) 功能相同，
提供 /stop 路由以匹配前端 API 和 Node agents 的路由结构。
"""

from ._logger import create_logger

logger = create_logger("stop")


async def handler(context):
    """中断正在执行的 agent run。"""
    body = context.request.body or {}
    conversation_id = body.get('conversation_id')
    logger.log(f"conversation_id: {conversation_id}")

    if not conversation_id:
        logger.error('conversation_id is required')
        return {
            'status_code': 400,
            'body': {
                'status': 'error',
                'message': 'conversation_id is required',
            }
        }

    result = context.utils.abort_active_run(conversation_id)
    logger.log("abort_active_run result:", {
        "aborted": result.aborted,
        "conversation_id": result.conversation_id,
        "run_id": result.run_id,
    })

    return {
        "status": "aborting" if result.aborted else "idle",
        "conversationId": result.conversation_id or conversation_id,
        "runId": result.run_id,
        "aborted": result.aborted,
    }
