"""AQI Buddy chatbot route."""

import os
import logging
from typing import List
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from google import genai

from .firebase_auth import get_current_user

logger = logging.getLogger("uvicorn.error")
router = APIRouter()

# ─── Schemas ──────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # 'user' or 'model'
    content: str

class BuddyRequest(BaseModel):
    messages: List[ChatMessage]

class BuddyResponse(BaseModel):
    reply: str

# ─── Lazy Client Initialization ───────────────────────────────────────────────

_client = None

def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY environment variable is not configured.")
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY environment variable not configured on backend."
            )
        _client = genai.Client(api_key=api_key)
    return _client

# ─── Route ──────────────────────────────────────────────────────────────────────

@router.post("/api/buddy", response_model=BuddyResponse)
async def buddy_chat(request: BuddyRequest, user: dict = Depends(get_current_user)):
    """Interact with AQI Buddy chatbot, maintaining history stateless-style."""
    try:
        client = _get_client()

        # Format conversation history
        formatted_input = ""
        for msg in request.messages[:-1]:
            role = msg.role
            # Map role names ('user' and 'model')
            if role == "user":
                formatted_input += f"User: {msg.content}\n"
            else:
                formatted_input += f"AQI Buddy: {msg.content}\n"

        # Add the latest user message
        if request.messages:
            last_msg = request.messages[-1]
            if last_msg.role == "user":
                formatted_input += f"User: {last_msg.content}\n"
            else:
                formatted_input += f"User: {last_msg.content}\n"
        else:
            raise HTTPException(
                status_code=400,
                detail="Messages list cannot be empty."
            )

        generation_config = {
            'temperature': 1,
            'max_output_tokens': 65536,
            'top_p': 0.95,
            'thinking_level': 'high',
        }

        system_instruction = """You are AQI Buddy, an AI assistant that only answers questions related to Air Quality Index (AQI), air pollution, pollutants, weather conditions affecting air quality, health impacts of air pollution, and air quality forecasts.

Your responsibilities:
- Explain AQI values and categories.
- Interpret pollutants such as PM2.5, PM10, CO, NO₂, SO₂, and O₃.
- Provide health recommendations and precautions based on AQI.
- Answer questions about air pollution, its causes, effects, and prevention.
- Explain AQI trends and forecasts when data is available.
- Keep responses accurate, concise, and easy to understand.
- If information is uncertain or unavailable, clearly say so instead of guessing.
- Do not provide medical diagnoses or emergency advice.

Strict Rule:
If a user's question is not related to AQI, air pollution, pollutants, environmental air quality, or associated health guidance, politely refuse and respond only with:

"I'm AQI Buddy, and I can only help with questions related to Air Quality Index (AQI), air pollution, pollutants, air quality forecasts, and their health impacts. Please ask me an AQI-related question." """

        # Invoke Gemini API
        interaction = client.interactions.create(
            model='models/gemini-3-flash-preview',
            input=formatted_input,
            system_instruction=system_instruction,
            generation_config=generation_config,
        )

        return BuddyResponse(reply=interaction.output_text)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AQI Buddy error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AQI Buddy error: {str(e)}"
        )
