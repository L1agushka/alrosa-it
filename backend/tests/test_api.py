from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_os_profiles():
    """Проверка получения списка поддерживаемых ОС"""
    res = client.get("/api/v1/catalog/os")
    assert res.status_code == 200
    profiles = res.json()
    assert isinstance(profiles, list)
    assert len(profiles) > 0
    names = [p["name"] for p in profiles]
    assert "Astra Linux Special Edition 1.7" in names

def test_get_software_categories_stats():
    """Проверка каталога ПО"""
    res = client.get("/api/v1/catalog/software")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "name" in data[0]
    assert "category" in data[0]

def test_get_blockers_stats():
    """Проверка эндпоинта выгрузки блокеров для сессии"""
    csv_data = (
        "workstation_id,department,user_fullname,ram_gb,cpu_cores,disk_gb,installed_software\n"
        "WS-API-BLOCK-01,САПР,Сидоров С.С.,16,4,256,AutoCAD\n"
    )
    upload_res = client.post(
        "/api/v1/audit/upload",
        files={"file": ("test_api_fixture.csv", csv_data, "text/csv")},
        data={"target_os": "Astra Linux Special Edition 1.7"},
    )
    assert upload_res.status_code == 200

    res = client.get("/api/v1/stats/blockers")
    assert res.status_code == 200
    data = res.json()
    assert data["target_os"] == "Astra Linux Special Edition 1.7"
    assert data["total_blockers"] > 0
    assert isinstance(data["top_software"], list)

def test_audit_history():
    """Проверка получения истории аудитов"""
    res = client.get("/api/v1/audit/history")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
