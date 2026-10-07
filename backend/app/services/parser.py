"""
Парсинг входных файлов (CSV / Excel) в pandas DataFrame.
Отдельный слой — чтобы scoring.py не знал, откуда пришли данные.
"""
import io
from typing import List

import pandas as pd


REQUIRED_COLUMNS: List[str] = [
    "workstation_id",
    "department",
    "ram_gb",
    "cpu_cores",
    "disk_gb",
]


class ParserError(ValueError):
    """Ошибка парсинга входного файла."""


def parse_audit_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """
    Читает CSV или Excel в DataFrame.
    Поддерживает автоопределение разделителя для CSV.
    """
    if not filename:
        raise ParserError("Имя файла не указано.")

    lower = filename.lower()

    try:
        if lower.endswith(".csv"):
            df = pd.read_csv(
                io.BytesIO(file_bytes),
                sep=None,
                engine="python",
                encoding="utf-8-sig",
            )
        elif lower.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            raise ParserError(
                "Неподдерживаемый формат файла. Допустимы CSV и Excel (.xls/.xlsx)."
            )
    except ParserError:
        raise
    except Exception as e:
        raise ParserError(f"Не удалось прочитать файл: {e}") from e

    if df.empty:
        raise ParserError("Файл пустой или не содержит данных.")

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        raise ParserError(
            f"В файле отсутствуют обязательные колонки: {', '.join(missing)}"
        )

    return df   