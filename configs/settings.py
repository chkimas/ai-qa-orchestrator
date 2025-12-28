import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE_PATH)

class Settings(BaseSettings):
    APP_ENV: str = "development"

    # --- AI SWITCHING ---
    # Set to "google" or "groq"
    AI_PROVIDER: str = "groq"

    # --- GOOGLE CONFIG ---
    GOOGLE_API_KEY: str = Field(..., description="Gemini API Key")
    # RENAMED: MODEL_NAME -> GOOGLE_MODEL
    GOOGLE_MODEL: str = "gemini-1.5-flash"

    # --- GROQ CONFIG ---
    GROQ_API_KEY: str = Field(default="", description="Groq API Key")
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # --- DATABASE ---
    DB_PATH: str = "data/db/orchestrator.db"

    # --- DASHBOARD INTEGRATION ---
    SCREENSHOTS_DIR: Path = BASE_DIR / "dashboard" / "public" / "screenshots"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directory exists immediately
settings.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
