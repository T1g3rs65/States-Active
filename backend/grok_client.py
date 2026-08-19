"""
OpenClaw gateway chat client using OpenAI-compatible interface.

Replaces the x.ai (Grok) client so the game's AI features route through
OpenClaw's local gateway (self-host friendly, no external API key needed).
"""

import os
from openai import AsyncOpenAI
from typing import Optional, List, Dict, Any
import json

# OpenClaw gateway OpenAI-compatible endpoint.
GATEWAY_BASE_URL = os.environ.get("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:18789/v1")
DEFAULT_MODEL = "openclaw/default"
CODE_MODEL = "openclaw/coding"


class GrokChat:
    """
    Chat client for the OpenClaw gateway using OpenAI-compatible interface.
    Drop-in replacement for emergentintegrations LlmChat.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        session_id: str = "default",
        system_message: str = "You are a helpful assistant.",
        model: Optional[str] = None,
    ):
        self.api_key = api_key or os.environ.get("OPENCLAW_GATEWAY_TOKEN")
        if not self.api_key:
            raise ValueError(
                "OPENCLAW_GATEWAY_TOKEN not provided and not found in environment"
            )

        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=GATEWAY_BASE_URL,
        )

        self.session_id = session_id
        self.system_message = system_message
        self.model = model or DEFAULT_MODEL
        self.messages: List[Dict[str, str]] = []

        # Add system message
        if system_message:
            self.messages.append({
                "role": "system",
                "content": system_message
            })

    def with_model(self, provider: str, model: str) -> "GrokChat":
        """
        Set the model to use. For compatibility with emergentintegrations.
        Maps common model names to OpenClaw gateway models.
        """
        model_mapping = {
            "gpt-4o": DEFAULT_MODEL,
            "gpt-4": DEFAULT_MODEL,
            "gpt-3.5-turbo": DEFAULT_MODEL,
            "grok-3-latest": DEFAULT_MODEL,
            "grok-3-mini-latest": DEFAULT_MODEL,
            "grok-4": DEFAULT_MODEL,
            "grok-4.3": DEFAULT_MODEL,
            "code": CODE_MODEL,
            "coding": CODE_MODEL,
        }
        self.model = model_mapping.get(model, DEFAULT_MODEL)
        return self
    
    async def send_message(self, message: "UserMessage") -> str:
        """
        Send a message and get a response.
        Compatible with emergentintegrations UserMessage.
        """
        # Add user message to history
        self.messages.append({
            "role": "user",
            "content": message.text
        })
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=self.messages,
                temperature=0.7,
                max_tokens=4096
            )
            
            assistant_message = response.choices[0].message.content
            
            # Add assistant response to history
            self.messages.append({
                "role": "assistant",
                "content": assistant_message
            })
            
            return assistant_message
            
        except Exception as e:
            print(f"Grok API error: {e}")
            raise


class UserMessage:
    """
    User message wrapper for compatibility with emergentintegrations.
    """
    def __init__(self, text: str):
        self.text = text


# Alias for drop-in replacement
LlmChat = GrokChat
