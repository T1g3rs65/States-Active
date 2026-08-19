"""
Grok (xAI) API client using OpenAI-compatible interface.
Replaces emergentintegrations for self-hosted/centralized deployments.
"""

import os
from openai import AsyncOpenAI
from typing import Optional, List, Dict, Any
import json

class GrokChat:
    """
    Chat client for Grok API using OpenAI-compatible interface.
    Drop-in replacement for emergentintegrations LlmChat.
    """
    
    def __init__(
        self, 
        api_key: Optional[str] = None,
        session_id: str = "default",
        system_message: str = "You are a helpful assistant."
    ):
        self.api_key = api_key or os.environ.get("XAI_API_KEY")
        if not self.api_key:
            raise ValueError("XAI_API_KEY not provided and not found in environment")
        
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url="https://api.x.ai/v1"
        )
        
        self.session_id = session_id
        self.system_message = system_message
        self.model = "grok-3-latest"  # Default to Grok 3
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
        Maps OpenAI model names to Grok equivalents.
        """
        # Map common model names to Grok models
        model_mapping = {
            "gpt-4o": "grok-3-latest",
            "gpt-4": "grok-3-latest",
            "gpt-3.5-turbo": "grok-3-mini-latest",
        }
        
        self.model = model_mapping.get(model, "grok-3-latest")
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
