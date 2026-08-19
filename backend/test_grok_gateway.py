"""Smoke test: GrokChat.send_message() routes through the OpenClaw gateway."""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(Path(__file__).parent / ".env")

from grok_client import GrokChat, UserMessage


async def main():
    chat = GrokChat(
        api_key=os.environ.get("OPENCLAW_GATEWAY_TOKEN"),
        session_id="smoke_test",
        system_message="You are a terse assistant. Reply in one short sentence.",
    )
    print(f"model: {chat.model}")
    print(f"base_url: {chat.client.base_url}")
    reply = await chat.send_message(UserMessage(text="Reply with exactly: PONG"))
    print(f"reply: {reply!r}")
    assert "PONG" in reply.upper(), f"Unexpected reply: {reply!r}"
    print("OK: GrokChat.send_message returned text via OpenClaw gateway")


if __name__ == "__main__":
    asyncio.run(main())
