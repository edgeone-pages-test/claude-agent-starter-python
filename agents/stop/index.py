"""
Stop handler — EdgeOne Makers

Route: POST /stop
Aborts an active agent run by conversation ID.
"""

from .._logger import create_logger

logger = create_logger("stop")


async def handler(context):
    """Abort the active agent run."""
    body = context.request.body or {}
    conversation_id = body.get('conversation_id')

    logger.log(f"conversation_id: {conversation_id!r}")

    if not conversation_id:
        logger.error("Missing conversation_id")
        return {
            'status_code': 400,
            'body': {
                'status': 'error',
                'message': 'conversation_id is required',
            }
        }

    result = context.utils.abort_active_run(conversation_id)
    logger.log(
        f"abort_active_run result: aborted={getattr(result, 'aborted', None)!r}, "
        f"conversation_id={getattr(result, 'conversation_id', None)!r}, "
        f"run_id={getattr(result, 'run_id', None)!r}"
    )

    return {
        "status": "aborting" if result.aborted else "idle",
        "conversationId": result.conversation_id or conversation_id,
        "runId": result.run_id,
        "aborted": result.aborted,
    }
