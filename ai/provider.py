import logging
import asyncio
import re
import json
import openai
import anthropic
from groq import Groq
from google import genai
from typing import Optional

from ai.vault import Vault
from configs.settings import settings

logger = logging.getLogger("orchestrator.provider")


class ModelGateway:
    """2026 Neural Gateway: Unified interface for multi-model AI orchestration with strict JSON enforcement."""

    SYSTEM_PROMPT = (
        "You are the Argus Neural Engine. TASK: Analyze UI context and return a valid JSON object. "
        "Rules: 1. No conversational text. 2. No markdown blocks. 3. Follow the requested schema exactly."
    )

    @staticmethod
    def _clean_json_response(text: str) -> str:
        """
        Surgical extraction and validation of JSON to prevent parsing crashes from model 'chatter'.
        Handles reasoning blocks, markdown wrappers, and extracts valid JSON objects.
        """
        try:
            text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
            json.loads(text)
            return text

        except json.JSONDecodeError:
            try:
                match = re.search(r'(\{.*\})', text, re.DOTALL)
                if match:
                    cleaned = match.group(1).strip()
                    json.loads(cleaned)
                    return cleaned
            except (json.JSONDecodeError, AttributeError):
                pass

            logger.warning(f"Could not extract valid JSON from response (first 200 chars): {text[:200]}")
            return text.strip()

    @staticmethod
    async def generate_response(
        prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        encrypted_key: Optional[str] = None
    ) -> str:
        """
        Generate AI response with automatic provider routing and JSON cleaning.

        Args:
            prompt: The instruction/query to send to the AI
            provider: AI provider name (openai/anthropic/gemini/groq/sonar)
            model: Specific model ID to use (optional, falls back to settings)
            encrypted_key: Encrypted API key from user vault (optional)

        Returns:
            Cleaned JSON string response, or empty string on failure
        """
        provider = (provider or settings.AI_PROVIDER).lower()
        api_key = await asyncio.to_thread(Vault.decrypt_key, encrypted_key) if encrypted_key else None

        methods = {
            "openai": ModelGateway._query_openai,
            "anthropic": ModelGateway._query_anthropic,
            "gemini": ModelGateway._query_gemini,
            "groq": ModelGateway._query_groq,
            "sonar": ModelGateway._query_sonar,
        }

        method = methods.get(provider)
        if not method:
            logger.error(f"Unsupported Provider: {provider}")
            return ""

        try:
            raw_result = await asyncio.to_thread(method, prompt, api_key, model)
            return ModelGateway._clean_json_response(raw_result)
        except Exception as e:
            logger.exception(f"Uplink Failure [{provider}]: {str(e)}")
            return ""

    # ---------- Provider Implementations ----------

    @staticmethod
    def _query_openai(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        """OpenAI GPT-4o with structured JSON output enforcement."""
        client = openai.OpenAI(api_key=key or settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=model or settings.OPENAI_MODEL or "gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": ModelGateway.SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        return response.choices[0].message.content

    @staticmethod
    def _query_groq(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        """Groq Llama with JSON enforcement (requires 'json' mention in prompt)."""
        client = Groq(api_key=key or settings.GROQ_API_KEY)
        completion = client.chat.completions.create(
            model=model or settings.GROQ_MODEL or "llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": f"{ModelGateway.SYSTEM_PROMPT} Return JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        return completion.choices[0].message.content

    @staticmethod
    def _query_anthropic(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        """Anthropic Claude with 2024+ system parameter format."""
        client = anthropic.Anthropic(api_key=key or settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=model or settings.ANTHROPIC_MODEL or "claude-3-5-sonnet-20241022",
            max_tokens=4096,
            system=ModelGateway.SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        return response.content[0].text

    @staticmethod
    def _query_gemini(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        """Google Gemini with native JSON MIME type enforcement."""
        client = genai.Client(api_key=key or settings.GEMINI_API_KEY)
        target = model or settings.GEMINI_MODEL or "gemini-1.5-flash"
        model_id = target if target.startswith("models/") else f"models/{target}"

        response = client.models.generate_content(
            model=model_id,
            contents=prompt,
            config={
                'system_instruction': ModelGateway.SYSTEM_PROMPT,
                'response_mime_type': 'application/json',
                'temperature': 0.1
            }
        )
        return response.text

    @staticmethod
    def _query_sonar(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        """
        Perplexity Sonar with reasoning tag handling.
        Sonar-Reasoning models may include <think> tags; our cleaner handles them automatically.
        """
        client = openai.OpenAI(
            api_key=key or settings.PERPLEXITY_API_KEY,
            base_url="https://api.perplexity.ai"
        )
        response = client.chat.completions.create(
            model=model or settings.PERPLEXITY_MODEL or "sonar-reasoning-pro",
            messages=[
                {"role": "system", "content": ModelGateway.SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        return response.choices[0].message.content


async def generate_response(
    prompt: str,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    encrypted_key: Optional[str] = None
) -> str:
    """
    Convenience wrapper for ModelGateway.generate_response.
    Preserves backward compatibility with existing codebase imports.
    """
    return await ModelGateway.generate_response(prompt, provider, model, encrypted_key)
