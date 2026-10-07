from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # БД
    database_url: str = "postgresql+psycopg://audit_user:audit_password@localhost:5432/alrosa_audit"
    sql_echo: bool = False

    # CORS
    cors_origins: list[str] = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # JWT (заготовка на будущее)
    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60


settings = Settings()