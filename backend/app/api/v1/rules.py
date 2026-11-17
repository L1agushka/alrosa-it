"""
Пользовательские правила (политики ИБ) + NLP-матчинг ПО.
"""
import json
import os
import uuid
from typing import Optional, Annotated

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel

from app.services.nlp_matcher import nlp_matcher
from ...dependencies.auth import require_viewer, require_analyst
from ...models import User

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), "../../../data")
os.makedirs(DATA_DIR, exist_ok=True)
RULES_FILE = os.path.join(DATA_DIR, "custom_rules.json")


# ─────────────────────────────────────────────
# Дефолтные правила
# ─────────────────────────────────────────────
DEFAULT_RULES = [
    {
        "id": "rule-torrent",
        "pattern": "torrent",
        "software_name": "BitTorrent / uTorrent",
        "category": "Сетевой анализ, диагностика и системные утилиты",
        "status": "blocker",
        "alternative": "Запрещено регламентом ИБ",
        "note": "Критический блокер: P2P трафик запрещён политикой безопасности АЛРОСА",
        "weight": 100,
        "severity": "blocker",
    },
    {
        "id": "rule-anydesk",
        "pattern": "anydesk",
        "software_name": "AnyDesk",
        "category": "Удалённый доступ и администрирование",
        "status": "blocker",
        "alternative": "RuDesktop / Remmina",
        "note": "Критический блокер: Неконтролируемый удалённый доступ запрещён",
        "weight": 100,
        "severity": "blocker",
    },
]


# ─────────────────────────────────────────────
# Хелперы (ОБЯЗАТЕЛЬНО до эндпоинтов)
# ─────────────────────────────────────────────
def load_rules() -> list[dict]:
    if not os.path.exists(RULES_FILE):
        with open(RULES_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_RULES, f, ensure_ascii=False, indent=2)
        return list(DEFAULT_RULES)
    try:
        with open(RULES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_rules(rules: list[dict]) -> None:
    with open(RULES_FILE, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)


def get_custom_rules_store() -> list[dict]:
    return load_rules()


# ─────────────────────────────────────────────
# Схемы
# ─────────────────────────────────────────────
class CustomRuleCreate(BaseModel):
    pattern: str
    software_name: str
    category: str
    status: Optional[str] = "blocker"
    alternative: Optional[str] = "Не применимо"
    note: Optional[str] = "Зафиксировано администратором ИБ"
    weight: Optional[int] = 50
    severity: Optional[str] = "warning"


class NLPMatchRequest(BaseModel):
    query: str
    candidate_desc: Optional[str] = None


# ─────────────────────────────────────────────
# Эндпоинты
# ─────────────────────────────────────────────
@router.get("/custom-rules")
def get_custom_rules(
    _: Annotated[User, Depends(require_viewer)],
):
    return load_rules()


@router.get("/custom-rules/export")
def export_custom_rules(
    _: Annotated[User, Depends(require_viewer)],
):
    """Скачать текущий набор правил в JSON."""
    return load_rules()


@router.post("/custom-rules")
def add_custom_rule(
    rule: CustomRuleCreate,
    _: Annotated[User, Depends(require_analyst)],
):
    rules = load_rules()
    pattern = rule.pattern.strip().lower()

    if any(r.get("pattern", "").lower() == pattern for r in rules):
        raise HTTPException(status_code=400, detail=f"Правило с pattern='{pattern}' уже существует")

    new_rule = {
        "id": str(uuid.uuid4()),
        "pattern": pattern,
        "software_name": rule.software_name.strip(),
        "category": rule.category,
        "status": rule.status,
        "alternative": rule.alternative,
        "note": rule.note,
        "weight": int(rule.weight or 50),
        "severity": rule.severity or "warning",
    }
    rules.append(new_rule)
    save_rules(rules)
    return {"status": "ok", "rule": new_rule}


@router.post("/custom-rules/upload")
def upload_custom_rules(
    file: UploadFile = File(...),
    _: Annotated[User, Depends(require_analyst)] = None,
):
    """Загрузить JSON-массив правил. Дубли по pattern пропускаются."""
    if not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="Ожидается файл .json")

    raw = file.file.read()
    try:
        data = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Некорректный JSON: {e}")

    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Ожидается JSON-массив правил")

    existing = load_rules()
    existing_patterns = {r.get("pattern", "").lower() for r in existing}

    added: list[dict] = []
    skipped = 0
    errors: list[str] = []

    for idx, item in enumerate(data):
        if not isinstance(item, dict):
            errors.append(f"#{idx}: не объект")
            continue

        pattern = str(item.get("pattern", "")).strip().lower()
        name = str(item.get("software_name", "")).strip()
        if not pattern or not name:
            errors.append(f"#{idx}: нужны pattern и software_name")
            continue

        if pattern in existing_patterns:
            skipped += 1
            continue

        rule = {
            "id": str(uuid.uuid4()),
            "pattern": pattern,
            "software_name": name,
            "category": item.get("category") or "Прочее",
            "status": item.get("status") or "blocker",
            "alternative": item.get("alternative") or "Не применимо",
            "note": item.get("note") or "Загружено из JSON",
            "weight": int(item.get("weight") or 50),
            "severity": item.get("severity") or "warning",
        }
        existing.append(rule)
        existing_patterns.add(pattern)
        added.append(rule)

    save_rules(existing)

    return {
        "status": "ok",
        "added": len(added),
        "skipped": skipped,
        "errors": errors,
        "rules": added,
    }


@router.delete("/custom-rules/{rule_id}")
def delete_custom_rule(
    rule_id: str,
    _: Annotated[User, Depends(require_analyst)],
):
    rules = load_rules()
    filtered = [r for r in rules if r.get("id") != rule_id]
    if len(filtered) == len(rules):
        raise HTTPException(status_code=404, detail="Rule not found")
    save_rules(filtered)
    return {"status": "ok", "deleted_id": rule_id}


@router.post("/nlp-match")
def match_software(
    req: NLPMatchRequest,
    _: Annotated[User, Depends(require_viewer)],
):
    custom_rules = load_rules()
    return nlp_matcher.match(req.query, candidate_desc=req.candidate_desc, custom_rules=custom_rules)