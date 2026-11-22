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
    "installed_software",
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
        elif lower.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(file_bytes))
        else:
            raise ParserError(
                "Неподдерживаемый формат файла. Допустимы CSV и Excel (.xlsx)."
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

    if len(df) > 20000:
        raise ParserError("Лимит одного аудита: 20 000 рабочих мест.")
    for column in ("ram_gb", "cpu_cores", "disk_gb"):
        values = pd.to_numeric(df[column], errors="coerce")
        invalid = values.isna() | (values < 0) | (values > 1048576) | (values % 1 != 0)
        if invalid.any():
            raise ParserError(f"{column}: нужны целые неотрицательные значения (строка {int(invalid.to_numpy().nonzero()[0][0]) + 2})")
        df[column] = values.astype(int)
    df["workstation_id"] = df["workstation_id"].fillna("").astype(str).str.strip()
    if (df["workstation_id"].str.len() == 0).any() or (df["workstation_id"].str.len() > 100).any():
        raise ParserError("Идентификатор рабочего места должен содержать 1–100 символов.")
    if df["workstation_id"].duplicated().any():
        raise ParserError("Идентификаторы рабочих мест в одном аудите должны быть уникальными.")
    df["department"] = df["department"].fillna("Общий").astype(str).str.strip().replace("", "Общий")
    if (df["department"].str.len() > 255).any():
        raise ParserError("Название группы длиннее 255 символов.")
    return df
