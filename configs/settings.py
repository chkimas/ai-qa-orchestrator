import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from dotenv import load_dotenv

# This calculates the Root Directory accurately
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE_PATH)

class Settings(BaseSettings):
    APP_ENV: str = "development"
    AI_PROVIDER: str = "groq"

    # --- GOOGLE CONFIG ---
    GOOGLE_API_KEY: str = Field(..., description="Gemini API Key")
    GOOGLE_MODEL: str = "gemini-1.5-flash"

    # --- GROQ CONFIG ---
    GROQ_API_KEY: str = Field(default="", description="Groq API Key")
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # --- DATABASE (FIXED) ---
    # We force this to be an ABSOLUTE PATH so it never gets lost
    DB_PATH: str = str(BASE_DIR / "data" / "db" / "orchestrator.db")

    # --- DASHBOARD INTEGRATION ---
    SCREENSHOTS_DIR: Path = BASE_DIR / "dashboard" / "public" / "screenshots"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist immediately
settings.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
Path(settings.DB_PATH).parent.mkdir(parents=True, exist_ok=True)
