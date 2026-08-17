import json
import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator

class Settings(BaseSettings):
    DATABASE_URL: str = Field(default="postgresql://postgres:postgrespassword@localhost:5432/ytdl_db")
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    SECRET_KEY: str = Field(default="supersecretkey123")
    DOWNLOAD_DIR: str = Field(default="./downloads")
    MAX_FILE_SIZE: int = Field(default=500000000) # 500 MB
    MAX_CONCURRENT_DOWNLOADS: int = Field(default=3)
    CORS_ORIGINS: List[str] = Field(default=["*"])
    API_HOST: str = Field(default="0.0.0.0")
    API_PORT: int = Field(default=8000)

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()

# Ensure download directory exists
os.makedirs(settings.DOWNLOAD_DIR, exist_ok=True)
