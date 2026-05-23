from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://readmission:readmission@localhost:5432/readmission"
    jwt_secret: str = "change-me-in-production-use-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    bootstrap_admin_email: str = "admin@example.com"
    bootstrap_admin_password: str = "changeme-admin"
    auto_create_tables: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
