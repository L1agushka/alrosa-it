from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
import os
import uuid
from app.services.nlp_matcher import nlp_matcher

router = APIRouter()

DATA_DIR = os.path.join(os.path.dirname(__file__), "../../../data")
os.makedirs(DATA_DIR, exist_ok=True)
RULES_FILE = os.path.join(DATA_DIR, "custom_rules.json")

# Инициализация дефолтных правил, если файл пуст
DEFAULT_RULES = [
    {
        "id": "rule-torrent",
        "pattern": "torrent",
        "software_name": "BitTorrent / uTorrent",
        "category": "Сетевой анализ, диагностика и системные утилиты",
        "status": "blocker",
        "alternative": "Запрещено регламентом ИБ",
        "note": "Критический блокер: P2P трафик запрещен политикой безопасности АЛРОСА"
    },
    {
        "id": "rule-anydesk",
        "pattern": "anydesk",
        "software_name": "AnyDesk",
        "category": "Удаленный доступ и администрирование",
        "status": "blocker",
        "alternative": "RuDesktop / Remmina",
        "note": "Критический блокер: Неконтролируемый удаленный доступ запрещен"
    }
]

def load_rules():
    if not os.path.exists(RULES_FILE):
        with open(RULES_FILE, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_RULES, f, ensure_ascii=False, indent=2)
        return DEFAULT_RULES
    try:
        with open(RULES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_rules(rules):
    with open(RULES_FILE, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

def get_custom_rules_store():
    return load_rules()

class CustomRuleCreate(BaseModel):
    pattern: str
    software_name: str
    category: str
    status: Optional[str] = "blocker"
    alternative: Optional[str] = "Не применимо"
    note: Optional[str] = "Зафиксировано администратором ИБ"

class NLPMatchRequest(BaseModel):
    query: str
    candidate_desc: Optional[str] = None

@router.get("/custom-rules")
def get_custom_rules():
    return load_rules()

@router.post("/custom-rules")
def add_custom_rule(rule: CustomRuleCreate):
    rules = load_rules()
    new_rule = {
        "id": str(uuid.uuid4()),
        "pattern": rule.pattern.strip().lower(),
        "software_name": rule.software_name.strip(),
        "category": rule.category,
        "status": rule.status,
        "alternative": rule.alternative,
        "note": rule.note
    }
    rules.append(new_rule)
    save_rules(rules)
    return {"status": "ok", "rule": new_rule}

@router.delete("/custom-rules/{rule_id}")
def delete_custom_rule(rule_id: str):
    rules = load_rules()
    filtered = [r for r in rules if r.get("id") != rule_id]
    if len(filtered) == len(rules):
        raise HTTPException(status_code=404, detail="Rule not found")
    save_rules(filtered)
    return {"status": "ok", "deleted_id": rule_id}

@router.post("/nlp-match")
def match_software(req: NLPMatchRequest):
    custom_rules = load_rules()
    return nlp_matcher.match(req.query, candidate_desc=req.candidate_desc, custom_rules=custom_rules)
