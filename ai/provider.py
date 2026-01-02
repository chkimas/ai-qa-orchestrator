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
        encrypted_key: Optional[str] = None
    ) -> str:
        provider = (provider or settings.AI_PROVIDER).lower()
        print(f"DEBUG: Starting generation for provider: {provider}", flush=True)

        # Decrypt key inside a thread
        api_key = await asyncio.to_thread(Vault.decrypt_key, encrypted_key) if encrypted_key else None

        if encrypted_key and not api_key:
            print(f"❌ DEBUG: Decryption failed for provided key on provider: {provider}", flush=True)
        elif not encrypted_key:
            print(f"DEBUG: No encrypted key provided, using system default for {provider}", flush=True)

        methods = {
            "openai": ModelGateway._query_openai,
            "anthropic": ModelGateway._query_anthropic,
            "gemini": ModelGateway._query_gemini,
            "groq": ModelGateway._query_groq,
            "sonar": ModelGateway._query_perplexity,
        }

        method = methods.get(provider)
        if not method:
            print(f"❌ DEBUG: Unknown provider: {provider}", flush=True)
            return ""

        try:
            print(f"DEBUG: Dispatching to {provider} query method...", flush=True)
            result = await asyncio.to_thread(method, prompt, api_key)
            if not result:
                print(f"⚠️ DEBUG: {provider} returned an empty string", flush=True)
            return result
        except Exception as e:
            print(f"❌ DEBUG: Critical error in {provider} gateway: {str(e)}", flush=True)
            return ""

    # ---------- Providers ----------

    @staticmethod
    def _query_openai(prompt: str, key: Optional[str]) -> str:
        api_key = key or settings.OPENAI_API_KEY
        if not api_key:
            print("❌ DEBUG: OpenAI query failed - Missing API Key", flush=True)
            return ""
        try:
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": ModelGateway.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ DEBUG: OpenAI API Error: {str(e)}", flush=True)
            return ""

    @staticmethod
    def _query_anthropic(prompt: str, key: Optional[str]) -> str:
        api_key = key or settings.ANTHROPIC_API_KEY
        if not api_key:
            print("❌ DEBUG: Anthropic query failed - Missing API Key", flush=True)
            return ""
        try:
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=4096,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text.strip()
        except Exception as e:
            print(f"❌ DEBUG: Anthropic API Error: {str(e)}", flush=True)
            return ""

    @staticmethod
    def _query_gemini(prompt: str, key: Optional[str]) -> str:
        api_key = key or settings.GEMINI_API_KEY
        if not api_key:
            print("❌ DEBUG: Gemini query failed - Missing API Key", flush=True)
            return ""
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            print(f"❌ DEBUG: Gemini API Error: {str(e)}", flush=True)
            return ""

    @staticmethod
    def _query_groq(prompt: str, key: Optional[str]) -> str:
        api_key = key or settings.GROQ_API_KEY
        if not api_key:
            print("❌ DEBUG: Groq query failed - Missing API Key", flush=True)
            return ""
        try:
            client = Groq(api_key=api_key)
            completion = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ DEBUG: Groq API Error: {str(e)}", flush=True)
            return ""

    @staticmethod
    def _query_perplexity(prompt: str, key: Optional[str]) -> str:
        api_key = key or settings.PERPLEXITY_API_KEY
        if not api_key:
            print("❌ DEBUG: Perplexity query failed - Missing API Key", flush=True)
            return ""
        try:
            client = openai.OpenAI(
                api_key=api_key,
                base_url="https://api.perplexity.ai",
            )
            response = client.chat.completions.create(
                model=settings.PERPLEXITY_MODEL,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ DEBUG: Perplexity API Error: {str(e)}", flush=True)
            return ""

async def generate_response(
    prompt: str,
    provider: Optional[str] = None,
    encrypted_key: Optional[str] = None,
) -> str:
    return await ModelGateway.generate_response(prompt, provider, encrypted_key)
