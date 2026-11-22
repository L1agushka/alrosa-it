"""Department-scoped software policies persisted in PostgreSQL."""
import json
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...dependencies.auth import require_viewer, require_analyst
from ...models import User
from ...schemas.group_policy import CustomRuleCreate
from ...services.group_policy import get_policy
from ...services.nlp_matcher import nlp_matcher

router = APIRouter()
Group = Annotated[str, Query(min_length=1, max_length=255)]
DB = Annotated[Session, Depends(get_db)]
Viewer = Annotated[User, Depends(require_viewer)]
Analyst = Annotated[User, Depends(require_analyst)]


def scoped_policy(db, group, lock=False):
    try:
        return get_policy(db, group, lock=lock)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get("/custom-rules")
@router.get("/custom-rules/export")
def get_custom_rules(_: Viewer, db: DB, group: Group):
    policy = scoped_policy(db, group)
    db.commit()
    return policy.rules


@router.post("/custom-rules")
def add_custom_rule(rule: CustomRuleCreate, _: Analyst, db: DB, group: Group):
    policy = scoped_policy(db, group, lock=True)
    if any(r["pattern"] == rule.pattern for r in policy.rules):
        raise HTTPException(409, "В этой группе уже есть правило с таким паттерном")
    new_rule = {"id": str(uuid.uuid4()), **rule.model_dump()}
    policy.rules = [*policy.rules, new_rule]
    db.commit()
    return {"status": "ok", "rule": new_rule}


@router.post("/custom-rules/upload")
async def upload_custom_rules(_: Analyst, db: DB, group: Group, file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".json"):
        raise HTTPException(400, "Ожидается файл .json")
    raw = await file.read(1024 * 1024 + 1)
    if len(raw) > 1024 * 1024:
        raise HTTPException(413, "Лимит файла правил: 1 МиБ")
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(400, "Некорректный JSON") from exc
    if not isinstance(data, list):
        raise HTTPException(400, "Ожидается JSON-массив правил")
    try:
        validated = [CustomRuleCreate.model_validate({k: v for k, v in item.items() if k != "id"})
                     if isinstance(item, dict) else CustomRuleCreate.model_validate(item) for item in data]
    except ValidationError as exc:
        raise HTTPException(422, "Неверные поля, статус или вес в файле правил") from exc
    policy = scoped_policy(db, group, lock=True)
    patterns = {r["pattern"] for r in policy.rules}
    added = []
    for rule in validated:
        if rule.pattern not in patterns:
            added.append({"id": str(uuid.uuid4()), **rule.model_dump()})
            patterns.add(rule.pattern)
    policy.rules = [*policy.rules, *added]
    db.commit()
    return {"status": "ok", "added": len(added), "skipped": len(data) - len(added),
            "errors": [], "rules": added}


@router.delete("/custom-rules/{rule_id}")
def delete_custom_rule(rule_id: str, _: Analyst, db: DB, group: Group):
    policy = scoped_policy(db, group, lock=True)
    filtered = [r for r in policy.rules if r["id"] != rule_id]
    if len(filtered) == len(policy.rules):
        raise HTTPException(404, "Правило не найдено в выбранной группе")
    policy.rules = filtered
    db.commit()
    return {"status": "ok", "deleted_id": rule_id}


class NLPMatchRequest(BaseModel):
    query: str
    candidate_desc: str | None = None


@router.post("/nlp-match")
def match_software(req: NLPMatchRequest, _: Viewer, db: DB, group: Group):
    policy = scoped_policy(db, group)
    db.commit()
    return nlp_matcher.match(req.query, candidate_desc=req.candidate_desc, custom_rules=policy.rules)
