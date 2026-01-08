import asyncio
import json
import logging
import re
from typing import Optional, Callable

import openai
import anthropic
from groq import Groq
from google import genai

from ai.vault import Vault
from configs.settings import settings

logger = logging.getLogger("orchestrator.provider")


class Provider:
    """Contract-first AI gateway. Returns valid JSON or an empty string."""

    SYSTEM_PROMPT = (
        "You are a deterministic automation engine.\n"
        "Rules:\n"
        "1. Output ONLY valid JSON\n"
        "2. No markdown or explanations\n"
        "3. Follow the requested schema exactly\n"
    )

    @staticmethod
    async def generate(
        prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        encrypted_key: Optional[str] = None,
    ) -> str:
        provider = (provider or settings.AI_PROVIDER).lower()
        api_key = await asyncio.to_thread(Vault.decrypt_key, encrypted_key) if encrypted_key else None

        callers: dict[str, Callable[..., str]] = {
            "openai": Provider._openai,
            "anthropic": Provider._anthropic,
            "gemini": Provider._gemini,
            "groq": Provider._groq,
            "sonar": Provider._sonar,
        }

        fn = callers.get(provider)
        if not fn:
            logger.error(f"Unsupported provider: {provider}")
            return ""

        try:
            raw = await asyncio.to_thread(fn, prompt, api_key, model)
            return Provider._extract_json(raw)
        except Exception as e:
            logger.exception(f"[{provider}] generation failed: {e}")
            return ""

    @staticmethod
    def _extract_json(text: str) -> str:
        if not text:
            return ""

        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
        text = re.sub(r"```(?:json)?\s*([\s\S]*?)\s*```", r"\1", text).strip()

        try:
            json.loads(text)
            return text
        except json.JSONDecodeError:
            pass

        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                json.loads(match.group(0))
                return match.group(0)
            except json.JSONDecodeError:
                pass

        logger.warning(f"Invalid JSON dropped: {text[:200]}...")
        return ""

    @staticmethod
    def _openai(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        client = openai.OpenAI(api_key=key or settings.OPENAI_API_KEY)
        res = client.chat.completions.create(
            model=model or settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": Provider.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        return res.choices[0].message.content

    @staticmethod
    def _anthropic(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        client = anthropic.Anthropic(api_key=key or settings.ANTHROPIC_API_KEY)
        res = client.messages.create(
            model=model or settings.ANTHROPIC_MODEL,
            max_tokens=4096,
            system=Provider.SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": "{"},
            ],
            temperature=0.1,
        )
        return "{" + res.content[0].text

    @staticmethod
    def _gemini(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        client = genai.Client(api_key=key or settings.GEMINI_API_KEY)
        model_id = model or settings.GEMINI_MODEL

        res = client.models.generate_content(
            model=f"models/{model_id}",
            contents=prompt,
            config={
                "system_instruction": Provider.SYSTEM_PROMPT,
                "response_mime_type": "application/json",
                "temperature": 0.1,
            },
        )
        return res.text or ""

    @staticmethod
    def _groq(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        client = Groq(api_key=key or settings.GROQ_API_KEY)
        res = client.chat.completions.create(
            model=model or settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": Provider.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        return res.choices[0].message.content

    @staticmethod
    def _sonar(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        client = openai.OpenAI(
            api_key=key or settings.PERPLEXITY_API_KEY,
            base_url="https://api.perplexity.ai",
        )
        res = client.chat.completions.create(
            model=model or settings.PERPLEXITY_MODEL,
            messages=[
                {"role": "system", "content": Provider.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )
        return res.choices[0].message.content
