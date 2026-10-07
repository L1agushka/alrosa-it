"""
Настройка Alembic для проекта.

Особенности:
- URL подключения берётся из app.core.config (не из alembic.ini).
- target_metadata — из моделей приложения.
- Все модели импортируются, чтобы Alembic их "увидел".
"""
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

# Добавляем корень backend в sys.path, чтобы импортировать app.*
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings          # noqa: E402
from app.core.database import Base            # noqa: E402
from app import models                        # noqa: E402,F401  (важно: импорт ради регистрации моделей)


# Alembic Config object
config = context.config

# Подставляем URL из настроек приложения
config.set_main_option("sqlalchemy.url", settings.database_url)

# Логирование из alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Метаданные моделей — то, с чем Alembic будет сравнивать БД
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Миграции в offline-режиме (без подключения к БД)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Миграции в online-режиме (с подключением к БД)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()