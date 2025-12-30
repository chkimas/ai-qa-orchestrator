import logging
from typing import Optional

# Enterprise SDKs
import openai
import anthropic
from groq import Groq
from google import genai

# Internal Security & Config
from ai.vault import Vault
from configs.settings import settings

logger = logging.getLogger("orchestrator.provider")

class ModelGateway:
    """
    Platinum-Grade Model Gateway.
    Centralized routing using Pydantic Settings.
    """

    @staticmethod
    def generate_response(prompt: str, provider: str = None, encrypted_key: Optional[str] = None) -> str:
        # Fallback to default provider from settings if none provided
        provider = (provider or settings.AI_PROVIDER).lower()

        # Decrypt key only if provided, otherwise fallback to system settings
        api_key = Vault.decrypt_key(encrypted_key) if encrypted_key else None

        methods = {
            "openai": ModelGateway._query_openai,
            "anthropic": ModelGateway._query_anthropic,
            "gemini": ModelGateway._query_gemini,
            "groq": ModelGateway._query_groq,
            "sonar": ModelGateway._query_perplexity
        }

        if provider not in methods:
            logger.error(f"❌ Unsupported Provider: {provider}")
            return ""

        return methods[provider](prompt, api_key)

    @staticmethod
    def _query_openai(prompt: str, key: Optional[str]) -> str:
        api_key = key or settings.OPENAI_API_KEY
        if not api_key: return "❌ Missing OpenAI Key"
        try:
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Principal SDET Architect. Return JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI Error: {e}")
            return ""

    @staticmethod
    def _query_anthropic(prompt: str, key: Optional[str]) -> str:
        api_key = key or settings.ANTHROPIC_API_KEY
        if not api_key: return "❌ Missing Anthropic Key"
        try:
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )
            return response.content[0].text.strip()
        except Exception as e:
            logger.error(f"Anthropic Error: {e}")
            return ""

    @staticmethod
    def _query_gemini(prompt: str, key: Optional[str]) -> str:
        api_key = key or settings.GEMINI_API_KEY
        if not api_key: return "❌ Missing Gemini Key"
        try:
            # Note: genai.Client uses the key provided in the constructor
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini Error: {e}")
            return ""

    @staticmethod
    def _query_groq(prompt: str, key: Optional[str]) -> str:
        api_key = key or settings.GROQ_API_KEY
        if not api_key: return "❌ Missing Groq Key"
        try:
            client = Groq(api_key=api_key)
            completion = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq Error: {e}")
            return ""

    @staticmethod
    def _query_perplexity(prompt: str, key: Optional[str]) -> str:
        api_key = key or settings.PERPLEXITY_API_KEY
        if not api_key: return "❌ Missing Perplexity Key"
        try:
            client = openai.OpenAI(api_key=api_key, base_url="https://api.perplexity.ai")
            response = client.chat.completions.create(
                model=settings.PERPLEXITY_MODEL,
                messages=[
                    {"role": "system", "content": "Technical Web Auditor. Focus on site structure."},
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Sonar Error: {e}")
            return ""

def generate_response(prompt: str, provider: str = None, encrypted_key: str = None) -> str:
    return ModelGateway.generate_response(prompt, provider, encrypted_key)
