import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from dotenv import load_dotenv

# --- CRITICAL FIX: Locate .env explicitly ---
# Get the absolute path to the project root
# (Current file is in /configs, so we go up 2 levels: ../../)
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = BASE_DIR / ".env"

# Force load the .env file immediately into system environment
load_dotenv(dotenv_path=ENV_FILE_PATH)

class Settings(BaseSettings):
    # App Config
    APP_ENV: str = "development"

    # AI Config
    GOOGLE_API_KEY: str = Field(..., description="Gemini API Key for the Orchestrator")
    MODEL_NAME: str = "gemini-flash-latest"

    # Database
    DB_PATH: str = "data/db/orchestrator.db"

    # Pydantic Config: Point strictly to the absolute path
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        extra="ignore" # Ignore extra keys in .env
    )

# Singleton instance
settings = Settings()
