import os
import logging
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from dotenv import load_dotenv

# Initialize Logger
logger = logging.getLogger("orchestrator.settings")

# Path Configuration
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE_PATH)

class Settings(BaseSettings):
    # System Config
    APP_ENV: str = "production"
    AI_PROVIDER: str = Field(default="groq")
    NEXT_PUBLIC_APP_URL: str = Field(default="http://localhost:3000")

    # Database Config
    SUPABASE_URL: str = Field(default="")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="")
    VAULT_MASTER_KEY: str = Field(default="")

    # --- STABLE MODELS ---
    # Gemini
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Groq
    GROQ_API_KEY: str = Field(default="")
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # OpenAI
    OPENAI_API_KEY: str = Field(default="")
    OPENAI_MODEL: str = "gpt-4o"

    # Anthropic
    ANTHROPIC_API_KEY: str = Field(default="")
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-latest"

    # Perplexity
    PERPLEXITY_API_KEY: str = Field(default="")
    PERPLEXITY_MODEL: str = "sonar-reasoning-pro"

    # Tactical Storage Paths
    SCREENSHOTS_DIR: Path = BASE_DIR / "public" / "screenshots"
    VIDEOS_DIR: Path = BASE_DIR / "public" / "videos"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

def bootstrap_system():
    """
    Ensures directories exist with a fallback to /tmp for
    restricted environments like Hugging Face Spaces.
    """
    for path_attr in ["SCREENSHOTS_DIR", "VIDEOS_DIR"]:
        target_path = getattr(settings, path_attr)
        try:
            target_path.mkdir(parents=True, exist_ok=True)
            # Create a .keep file to ensure directory exists in git-like structures
            (target_path / ".keep").touch(exist_ok=True)
        except (PermissionError, OSError) as e:
            # Hugging Face Sandbox Fallback
            fallback = Path("/tmp") / target_path.relative_to(BASE_DIR)
            fallback.mkdir(parents=True, exist_ok=True)
            setattr(settings, path_attr, fallback)
            logger.warning(f"⚠️ Storage Redirect: {target_path} -> {fallback} (Reason: {e})")

# Execute directory check on import
bootstrap_system()
