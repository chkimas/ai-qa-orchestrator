import os
import logging
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("orchestrator.vault")

class Vault:
    """
    Enterprise-Grade Encryption Vault for API Key Management.
    Uses AES-128/HMAC (Fernet) for authenticated encryption.
    """

    # In production, this should be a 32-byte base64 encoded string
    # Generated via: Fernet.generate_key()
    _MASTER_KEY = os.getenv("VAULT_MASTER_KEY")

    @classmethod
    def _get_cipher(cls):
        if not cls._MASTER_KEY:
            logger.error("❌ VAULT_MASTER_KEY not found in environment variables.")
            raise EnvironmentError("Security critical: MASTER_KEY missing.")
        return Fernet(cls._MASTER_KEY.encode())

    @classmethod
    def encrypt_key(cls, raw_key: str) -> str:
        """Encrypts a raw API key for database storage."""
        if not raw_key:
            return ""
        try:
            cipher = cls._get_cipher()
            encrypted_data = cipher.encrypt(raw_key.encode())
            return encrypted_data.decode()
        except Exception as e:
            logger.error(f"❌ Encryption failed: {e}")
            return ""

    @classmethod
    def decrypt_key(cls, encrypted_key: str) -> str:
        """Decrypts a stored key for runtime AI usage."""
        if not encrypted_key:
            return ""
        try:
            cipher = cls._get_cipher()
            decrypted_data = cipher.decrypt(encrypted_key.encode())
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"❌ Decryption failed: {e}")
            return ""

# Implementation Example for Server Logic:
# encrypted = Vault.encrypt_key("sk-ant-api03...")
# decrypted = Vault.decrypt_key(encrypted)
