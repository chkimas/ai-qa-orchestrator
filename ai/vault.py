import logging
import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
from configs.settings import settings

logger = logging.getLogger("orchestrator.vault")

class Vault:
    @staticmethod
    def decrypt_key(encrypted_text: str) -> str:
        if not encrypted_text or ":" not in encrypted_text:
            return ""
        try:
            raw_key = settings.VAULT_MASTER_KEY.strip().replace('"', '').replace("'", "")
            master_key = hashlib.sha256(raw_key.encode('utf-8')).digest()

            iv_hex, encrypted_hex = encrypted_text.split(":")
            iv = bytes.fromhex(iv_hex)
            encrypted_data = bytes.fromhex(encrypted_hex)

            cipher = Cipher(algorithms.AES(master_key), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()

            padded_data = decryptor.update(encrypted_data) + decryptor.finalize()

            unpadder = padding.PKCS7(128).unpadder()
            data = unpadder.update(padded_data) + unpadder.finalize()

            return data.decode('utf-8')
        except Exception as e:
            print(f"❌ Vault Error: {str(e)}")
            return ""
