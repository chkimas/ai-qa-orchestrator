import os
import logging
from dotenv import load_dotenv
from groq import Groq
from google import genai

# Load environment variables
load_dotenv()

logger = logging.getLogger("orchestrator.provider")

def generate_response(prompt: str) -> str:
    """
    Centralized AI Provider.
    Switches between Groq (Speed) and Gemini (Context) based on .env config.
    """
    provider = os.getenv("AI_PROVIDER", "groq").lower()

    if provider == "groq":
        return _query_groq(prompt)
    elif provider == "gemini":
        return _query_gemini(prompt)
    else:
        logger.error(f"❌ Unknown AI Provider: {provider}")
        return ""

def _query_groq(prompt: str) -> str:
    """Executes prompt using Groq's Llama 3 (Fastest)"""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("❌ GROQ_API_KEY is missing.")
        return ""

    try:
        client = Groq(api_key=api_key)

        # Llama 3.3 70B is currently the best balance of Speed vs Intelligence on Groq
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful SDET assistant. Return only raw text/json."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=4096,
        )

        return completion.choices[0].message.content.strip()

    except Exception as e:
        logger.error(f"❌ Groq Error: {e}")
        return ""

def _query_gemini(prompt: str) -> str:
    """Executes prompt using Google Gemini"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("❌ GEMINI_API_KEY is missing.")
        return ""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
        )
        return response.text.strip() if response.text else ""

    except Exception as e:
        logger.error(f"❌ Gemini Error: {e}")
        return ""
