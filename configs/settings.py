import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE_PATH)

class Settings(BaseSettings):
    APP_ENV: str = "production"

    # --- SUPABASE & SECURITY ---
    SUPABASE_URL: str = Field(default="")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="")
    VAULT_MASTER_KEY: str = Field(..., description="AES-256 Master Key")

    # --- GOOGLE GEMINI ---
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"

    # --- GROQ (LLAMA) ---
    GROQ_API_KEY: str = Field(default="")
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # --- OPENAI ---
    OPENAI_API_KEY: str = Field(default="")
    OPENAI_MODEL: str = "gpt-4o"

    # --- ANTHROPIC (CLAUDE) ---
    ANTHROPIC_API_KEY: str = Field(default="")
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-latest"

    # --- PERPLEXITY (SONAR) ---
    PERPLEXITY_API_KEY: str = Field(default="")
    PERPLEXITY_MODEL: str = "sonar-reasoning-pro"

    # --- STORAGE PATHS ---
    SCREENSHOTS_DIR: Path = BASE_DIR / "public" / "screenshots"
    VIDEOS_DIR: Path = BASE_DIR / "public" / "videos"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
settings.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
settings.VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
