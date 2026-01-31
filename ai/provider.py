import asyncio
import json
import logging
import re
from typing import Optional

import openai
import anthropic
from groq import Groq
from google import genai

from ai.vault import Vault
from configs.settings import settings

logger = logging.getLogger("orchestrator.AIProvider")


class AIProvider:
    SYSTEM_PROMPT = (
        "You are a deterministic automation engine. "
        "Respond ONLY with a valid JSON object or array as requested. "
        "No markdown, no commentary."
    )

    @staticmethod
    async def generate(
        prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        encrypted_key: Optional[str] = None,
        json_mode: bool = True
    ) -> str:
        """
        Generate AI response from configured provider.

        Args:
            prompt: The prompt to send to the AI
            provider: AI provider (openai, anthropic, gemini, groq, sonar)
            model: Specific model to use
            encrypted_key: Encrypted API key (optional)
            json_mode: Whether to extract/validate JSON from response

        Returns:
            AI-generated response (JSON string if json_mode=True)
        """
        provider = (provider or settings.AI_PROVIDER).lower()
        api_key = await asyncio.to_thread(Vault.decrypt_key, encrypted_key) if encrypted_key else None

        callers = {
            "openai": AIProvider._openai,
            "anthropic": AIProvider._anthropic,
            "gemini": AIProvider._gemini,
            "groq": AIProvider._groq,
            "sonar": AIProvider._sonar,
        }

        fn = callers.get(provider)
        if not fn:
            logger.error(f"Unknown provider: {provider}")
            return ""

        try:
            raw = await asyncio.to_thread(fn, prompt, api_key, model)

            if not json_mode:
                return raw

            extracted = AIProvider._extract_json(raw)
            if not extracted:
                logger.warning(f"[{provider}] Failed to extract valid JSON from response")

            return extracted

        except Exception as e:
            logger.exception(f"[{provider}] generation failed: {e}")
            return ""

    @staticmethod
    def _extract_json(text: str) -> str:
        """Extract and validate JSON from AI response text."""
        if not text:
            return ""

        # Remove thinking tags and markdown code blocks
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
        text = re.sub(r"```(?:json)?\s*([\s\S]*?)\s*```", r"\1", text)

        # Find JSON boundaries
        obj_start = text.find('{')
        arr_start = text.find('[')

        # Determine which comes first
        if obj_start != -1 and (obj_start < arr_start or arr_start == -1):
            first_idx = obj_start
            last_idx = text.rfind('}')
        elif arr_start != -1:
            first_idx = arr_start
            last_idx = text.rfind(']')
        else:
            logger.warning(f"No JSON structures found in response: {text[:100]}...")
            return ""

        if first_idx == -1 or last_idx == -1:
            return ""

        json_str = text[first_idx:last_idx + 1].strip()

        # Validate JSON
        try:
            json.loads(json_str)
            return json_str
        except json.JSONDecodeError as e:
            logger.error(f"JSON validation failed: {e} | Snippet: {json_str[:200]}")
            return ""

    @staticmethod
    def _openai(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        """OpenAI API handler."""
        client = openai.OpenAI(api_key=key or settings.OPENAI_API_KEY)
        res = client.chat.completions.create(
            model=model or settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": AIProvider.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )
        return res.choices[0].message.content or ""

    @staticmethod
    def _anthropic(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        """Anthropic Claude API handler."""
        client = anthropic.Anthropic(api_key=key or settings.ANTHROPIC_API_KEY)
        res = client.messages.create(
            model=model or settings.ANTHROPIC_MODEL,
            max_tokens=4096,
            system=AIProvider.SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        return res.content[0].text

    @staticmethod
    def _gemini(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        """Google Gemini API handler."""
        from google.genai import types

        client = genai.Client(
            api_key=key or settings.GEMINI_API_KEY,
            http_options={'api_version': 'v1'}
        )

        model_id = (model or settings.GEMINI_MODEL).replace("models/", "")
        res = client.models.generate_content(
            model=model_id,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=AIProvider.SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        return res.text or ""

    @staticmethod
    def _groq(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        """Groq API handler."""
        final_key = key if (key and key.strip()) else settings.GROQ_API_KEY
        if not final_key:
            logger.error("Groq API key not provided")
            return ""

        # Auto-upgrade to latest model
        target_model = model or settings.GROQ_MODEL
        if "llama-3.1-70b" in target_model:
            target_model = "llama-3.3-70b-versatile"

        client = Groq(api_key=final_key)

        res = client.chat.completions.create(
            model=target_model,
            messages=[
                {"role": "system", "content": AIProvider.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        return res.choices[0].message.content or ""

    @staticmethod
    def _sonar(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        """Perplexity Sonar API handler."""
        client = openai.OpenAI(
            api_key=key or settings.PERPLEXITY_API_KEY,
            base_url="https://api.perplexity.ai",
        )

        res = client.chat.completions.create(
            model=model or settings.PERPLEXITY_MODEL,
            messages=[
                {"role": "system", "content": AIProvider.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )
        return res.choices[0].message.content or ""
