from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URI: str

    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "LedgerPro SaaS"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Email (Resend)
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "noreply@ledgerpro.com"

    # Trial
    TRIAL_DAYS: int = 14

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
