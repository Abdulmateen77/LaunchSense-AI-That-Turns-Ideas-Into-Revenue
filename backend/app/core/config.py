from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseModel):
    OPENAI_API_KEY: str
    CHROMA_DIR: str = "./chroma_db"
    MODEL_NAME: str = "gpt-4.1"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

settings = Settings(
    OPENAI_API_KEY=os.getenv("OPENAI_API_KEY", ""),
    CHROMA_DIR=os.getenv("CHROMA_DIR", "./chroma_db"),
    MODEL_NAME=os.getenv("MODEL_NAME", "gpt-4.1"),
    EMBEDDING_MODEL=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
)