from copy import deepcopy
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from ..models.group_policy import GroupPolicy
from ..schemas.group_policy import PolicySettings


DEFAULT_RULES = [
    {"id": "rule-torrent", "pattern": "torrent", "software_name": "BitTorrent / uTorrent",
     "category": "Системные утилиты", "status": "blocker", "alternative": "Удалить P2P-клиент",
     "note": "Пример политики ИБ, требует согласования в организации", "weight": 100, "severity": "blocker"},
    {"id": "rule-anydesk", "pattern": "anydesk", "software_name": "AnyDesk",
     "category": "Удалённый доступ", "status": "blocker", "alternative": "Согласованный удалённый доступ",
     "note": "Пример политики ИБ, требует согласования в организации", "weight": 100, "severity": "blocker"},
]


def normalize_group(name: str) -> str:
    name = name.strip()
    if not name or len(name) > 255:
        raise ValueError("Название группы должно содержать от 1 до 255 символов")
    return name


def get_policy(db: Session, group: str, *, lock: bool = False) -> GroupPolicy:
    group = normalize_group(group)
    policy = db.query(GroupPolicy).filter_by(group_name=group).first()
    if policy is None:
        db.execute(insert(GroupPolicy).values(group_name=group,
            settings=PolicySettings().model_dump(), rules=deepcopy(DEFAULT_RULES))
            .on_conflict_do_nothing(index_elements=[GroupPolicy.group_name]))
    query = db.query(GroupPolicy).filter_by(group_name=group)
    if lock:
        query = query.with_for_update().populate_existing()
    return query.one()


def policy_dict(policy):
    return {"group_name": policy.group_name, "settings": policy.settings, "rules": policy.rules}
