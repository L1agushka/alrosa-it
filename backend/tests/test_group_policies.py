"""Behavioral regression tests for department policies and audit persistence."""
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models import GroupPolicy, AuditSession
from app.schemas.group_policy import PolicySettings


@pytest.fixture
def groups():
    names = ["test-" + uuid.uuid4().hex, "test-" + uuid.uuid4().hex]
    yield names
    with SessionLocal() as db:
        for session in db.query(AuditSession).filter(AuditSession.filename == "test_policy.csv").all():
            db.delete(session)
        db.query(GroupPolicy).filter(GroupPolicy.group_name.in_(names)).delete(synchronize_session=False)
        db.commit()


def set_policy(client, group, **changes):
    settings = PolicySettings().model_dump()
    settings.update(changes)
    response = client.put("/api/v1/criteria/groups/" + group, json=settings)
    assert response.status_code == 200, response.text
    return response.json()


def add_rule(client, group, status="blocker", pattern="special-app", weight=0):
    return client.post("/api/v1/policy/custom-rules", params={"group":group}, json={
        "pattern":pattern, "software_name":pattern, "status":status, "weight":weight,
    })


def upload(client, groups, software="special-app", ram=8):
    csv = "workstation_id,department,ram_gb,cpu_cores,disk_gb,installed_software\n"
    csv += "\n".join(f"WS-{i},{group},{ram},4,120,{software}" for i, group in enumerate(groups))
    response = client.post("/api/v1/audit/upload", files={"file":("test_policy.csv",csv,"text/csv")})
    assert response.status_code == 200, response.text
    return response.json()


def test_same_software_different_groups_and_history(client, groups):
    for group in groups:
        set_policy(client, group)
    assert add_rule(client, groups[0], "blocker").status_code == 200
    assert add_rule(client, groups[1], "native_ready").status_code == 200
    report = upload(client, groups)
    assert [w["wave"] for w in report["workstations"]] == [3, 1]
    assert report["workstations"][0]["score"] == 0  # zero-weight hard blockers still block
    history = client.get(f'/api/v1/audit/history/{report["id"]}').json()
    assert history["workstations"][0]["installed_software"] == ["special-app"]
    assert history["workstations"][0]["assessment"]["wave"] == 3
    set_policy(client, groups[1], minRam=32)
    history_again = client.get(f'/api/v1/audit/history/{report["id"]}').json()
    assert history_again["workstations"][1]["assessment"]["wave"] == 1


def test_independent_thresholds_and_zero_weight(client, groups):
    set_policy(client, groups[0], minRam=16, maxGap=100)
    set_policy(client, groups[1], minRam=4, maxGap=100)
    report = upload(client, groups, software="unlisted")
    assert [w["wave"] for w in report["workstations"]] == [2, 1]
    assert report["workstations"][0]["score"] == 30


def test_catalog_blocker_can_have_local_approved_exception(client, groups):
    for group in groups:
        set_policy(client, group)
    assert add_rule(client, groups[1], "native_ready", "autocad").status_code == 200
    report = upload(client, groups, software="AutoCAD")
    assert [w["wave"] for w in report["workstations"]] == [3, 1]


def test_rules_validation_import_and_delete_scope(client, groups):
    for group in groups:
        set_policy(client, group)
    first = add_rule(client, groups[0]).json()["rule"]
    assert add_rule(client, groups[0]).status_code == 409
    assert add_rule(client, groups[1]).status_code == 200
    assert client.delete("/api/v1/policy/custom-rules/" + first["id"], params={"group":groups[1]}).status_code == 404
    bad = client.post("/api/v1/policy/custom-rules", params={"group":groups[0]},
                      json={"pattern":"   ", "software_name":"test", "weight":-1})
    assert bad.status_code == 422
    assert client.get("/api/v1/policy/custom-rules").status_code == 422
    before = client.get("/api/v1/policy/custom-rules", params={"group":groups[0]}).json()
    res = client.post("/api/v1/policy/custom-rules/upload", params={"group":groups[0]},
                      files={"file":("rules.json",'[{"pattern":"new", "software_name":"New", "weight":"oops"}]',"application/json")})
    assert res.status_code == 422
    assert client.get("/api/v1/policy/custom-rules", params={"group":groups[0]}).json() == before


def test_unauthenticated_policy_access_is_rejected():
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/v1/criteria/groups").status_code == 401
        assert anonymous.get("/api/v1/policy/custom-rules",params={"group":"Общий"}).status_code == 401


def test_viewer_can_read_but_cannot_change_policies(groups):
    from app.models import User, UserRole
    from app.core.security import hash_password
    email = uuid.uuid4().hex + "@test.example"
    with SessionLocal() as db:
        user = User(email=email, hashed_password=hash_password("test-password"),
                    full_name="Policy test viewer", role=UserRole.viewer, is_active=True)
        db.add(user)
        db.commit()
        user_id = user.id
    try:
        with TestClient(app) as viewer:
            login = viewer.post("/api/v1/auth/token", data={"username":email, "password":"test-password"})
            assert login.status_code == 200
            viewer.headers["Authorization"] = "Bearer " + login.json()["access_token"]
            assert viewer.get("/api/v1/criteria/groups").status_code == 200
            assert viewer.put("/api/v1/criteria/groups/" + groups[0], json=PolicySettings().model_dump()).status_code == 403
            assert add_rule(viewer, groups[0]).status_code == 403
    finally:
        with SessionLocal() as db:
            db.query(User).filter_by(id=user_id).delete()
            db.commit()

