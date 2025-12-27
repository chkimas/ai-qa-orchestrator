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
    GOOGLE_API_KEY: str = Field(..., description="Gemini API Key")
    MODEL_NAME: str = "gemini-flash-latest"

    # Database
    DB_PATH: str = "data/db/orchestrator.db"

    # --- NEW: Save images directly to Dashboard's public folder ---
    # This allows localhost:3000/screenshots/filename.png to work
    SCREENSHOTS_DIR: Path = BASE_DIR / "dashboard" / "public" / "screenshots"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directory exists immediately
settings.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
