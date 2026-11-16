import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATA_LAWS_DIR = PROJECT_ROOT / "data" / "laws"
DB_PATH = BASE_DIR / "nyayasathi.db"
LAWYERS_SEED_PATH = BASE_DIR / "data" / "lawyers_seed.json"

class Settings(BaseSettings):
    PROJECT_NAME: str = "NyayaSathi"
    VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    BACKEND_URL: str = "http://localhost:8000"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # AI Model isolation
    GEMINI_CHAT_MODEL: str = "gemini-2.5-flash"
    GEMINI_BACKUP_MODEL: str = "gemini-1.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    
    # RAG Settings
    TOP_K_CHUNKS: int = 5
    SEMANTIC_CACHE_SIMILARITY_THRESHOLD: float = 0.92
    
    # Supported Languages
    SUPPORTED_LANGUAGES: list[str] = [
        "en", "hi", "kn", "ta", "te", "ml", "mr", "bn", "gu", "pa", "ur"
    ]
    LANGUAGE_NAMES: dict[str, str] = {
        "en": "English",
        "hi": "Hindi (हिंदी)",
        "kn": "Kannada (ಕನ್ನಡ)",
        "ta": "Tamil (தமிழ்)",
        "te": "Telugu (తెలుగు)",
        "ml": "Malayalam (മലയാളം)",
        "mr": "Marathi (मराठी)",
        "bn": "Bengali (বাংলা)",
        "gu": "Gujarati (ગુજરાતી)",
        "pa": "Punjabi (ਪੰਜਾਬੀ)",
        "ur": "Urdu (اردو)",
    }
    
    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "allow"

settings = Settings()
