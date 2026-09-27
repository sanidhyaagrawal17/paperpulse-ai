import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = DATA_DIR / "chroma"

# Ensure data directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "PaperPulse AI"
    VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # ChromaDB Persistence
    CHROMA_PATH: str = str(CHROMA_DIR)
    COLLECTION_NAME: str = "arxiv_literature"
    
    # NetworkX & Retrieval Settings
    SIMILARITY_EDGE_THRESHOLD: float = 0.40
    CITATION_OVERLAP_THRESHOLD: float = 0.35
    DEFAULT_TOP_K: int = 4
    MAX_NEIGHBOR_EXPANSION: int = 2
    
    # LLM Settings (Ollama & OpenRouter)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:3b")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

settings = Settings()
