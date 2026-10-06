from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_os_profiles():
    """Проверка получения списка поддерживаемых ОС"""
    res = client.get("/api/v1/os-profiles")
    assert res.status_code == 200
    profiles = res.json()
    assert isinstance(profiles, list)
    assert len(profiles) > 0
    names = [p["name"] for p in profiles]
    assert "Astra Linux Special Edition 1.7" in names

def test_get_software_categories_stats():
    """Проверка эндпоинта агрегации категорий ПО"""
    res = client.get("/api/v1/stats/software-categories")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "category" in data[0]
    assert "count" in data[0]

def test_get_blockers_stats():
    """Проверка эндпоинта выгрузки блокеров для конкретной ОС"""
    res = client.get("/api/v1/stats/blockers?target_os_name=Astra Linux Special Edition 1.7")
    assert res.status_code == 200
    data = res.json()
    assert data["target_os"] == "Astra Linux Special Edition 1.7"
    assert data["total_blockers"] > 0
    assert isinstance(data["blockers"], list)

def test_audit_history():
    """Проверка получения истории аудитов"""
    res = client.get("/api/v1/audit/history")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
