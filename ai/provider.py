import logging
import asyncio
from typing import Optional
import openai
import anthropic
from groq import Groq
from google import genai

from ai.vault import Vault
from configs.settings import settings

logger = logging.getLogger("orchestrator.provider")

class ModelGateway:
    SYSTEM_PROMPT = "Return JSON."

    @staticmethod
    async def generate_response(
        prompt: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        encrypted_key: Optional[str] = None
    ) -> str:
        provider = (provider or settings.AI_PROVIDER).lower()

        api_key = await asyncio.to_thread(Vault.decrypt_key, encrypted_key) if encrypted_key else None

        methods = {
            "openai": ModelGateway._query_openai,
            "anthropic": ModelGateway._query_anthropic,
            "gemini": ModelGateway._query_gemini,
            "groq": ModelGateway._query_groq,
            "sonar": ModelGateway._query_perplexity,
        }

        method = methods.get(provider)
        if not method:
            return ""

        try:
            result = await asyncio.to_thread(method, prompt, api_key, model)
            return result
        except Exception as e:
            logger.error(f"Critical error in {provider} gateway: {str(e)}")
            return ""

    # ---------- Providers ----------

    @staticmethod
    def _query_openai(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        api_key = key or settings.OPENAI_API_KEY
        target_model = model or settings.OPENAI_MODEL # Use UI selection or fallback
        try:
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": ModelGateway.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
            )
            return response.choices[0].message.content.strip()
        except Exception: return ""

    @staticmethod
    def _query_anthropic(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        api_key = key or settings.ANTHROPIC_API_KEY
        target_model = model or settings.ANTHROPIC_MODEL
        try:
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model=target_model,
                max_tokens=4096,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text.strip()
        except Exception: return ""

    @staticmethod
    def _query_gemini(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        api_key = key or settings.GEMINI_API_KEY
        target_model = model or settings.GEMINI_MODEL
        try:
            # Clean model name for Gemini SDK (ensures 'models/' prefix)
            model_name = target_model if target_model.startswith("models/") else f"models/{target_model}"
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(model=model_name, contents=prompt)
            return response.text.strip()
        except Exception: return ""

    @staticmethod
    def _query_groq(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        api_key = key or settings.GROQ_API_KEY
        target_model = model or settings.GROQ_MODEL
        try:
            client = Groq(api_key=api_key)
            completion = client.chat.completions.create(
                model=target_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
            )
            return completion.choices[0].message.content.strip()
        except Exception: return ""

    @staticmethod
    def _query_perplexity(prompt: str, key: Optional[str], model: Optional[str]) -> str:
        api_key = key or settings.PERPLEXITY_API_KEY
        target_model = model or settings.PERPLEXITY_MODEL
        try:
            client = openai.OpenAI(api_key=api_key, base_url="https://api.perplexity.ai")
            response = client.chat.completions.create(
                model=target_model,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content.strip()
        except Exception: return ""

async def generate_response(
    prompt: str,
    provider: Optional[str] = None,
    encrypted_key: Optional[str] = None,
) -> str:
    return await ModelGateway.generate_response(prompt, provider, encrypted_key)
