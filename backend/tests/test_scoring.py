import pytest
from app.services import process_audit_file
from app.database import SessionLocal

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_scoring_wave_1_ready(db_session):
    """АРМ с достаточным железом и без блокеров должно попасть в Волну 1 (ready)"""
    csv_data = (
        "workstation_id,department,user_fullname,ram_gb,cpu_cores,disk_gb,installed_software\n"
        "WS-TEST-01,Бухгалтерия,Иванов И.И.,16,4,256,Яндекс Браузер; Telegram\n"
    ).encode("utf-8")

    result = process_audit_file(csv_data, "test.csv", "Astra Linux Special Edition 1.7", db_session)
    ws = result["workstations"][0]

    assert ws["status"] == "ready"
    assert ws["wave"] == 1
    assert len(ws["hardware_issues"]) == 0
    assert len(ws["blocking_software"]) == 0

def test_scoring_wave_2_upgrade_required(db_session):
    """АРМ с недостатком RAM/CPU/диска без блокеров должно попасть в Волну 2 (upgrade_required)"""
    csv_data = (
        "workstation_id,department,user_fullname,ram_gb,cpu_cores,disk_gb,installed_software\n"
        "WS-TEST-02,Склад,Петров П.П.,2,1,15,Яндекс Браузер\n"
    ).encode("utf-8")

    result = process_audit_file(csv_data, "test.csv", "Astra Linux Special Edition 1.7", db_session)
    ws = result["workstations"][0]

    assert ws["status"] == "upgrade_required"
    assert ws["wave"] == 2
    assert len(ws["hardware_issues"]) > 0
    assert len(ws["blocking_software"]) == 0

def test_scoring_wave_3_blocked(db_session):
    """АРМ с блокирующим софтом (например, AutoCAD) должно попасть в Волну 3 (blocked) независимо от железа"""
    csv_data = (
        "workstation_id,department,user_fullname,ram_gb,cpu_cores,disk_gb,installed_software\n"
        "WS-TEST-03,САПР,Сидоров С.С.,64,16,1024,AutoCAD; Blender\n"
    ).encode("utf-8")

    result = process_audit_file(csv_data, "test.csv", "Astra Linux Special Edition 1.7", db_session)
    ws = result["workstations"][0]

    assert ws["status"] == "blocked"
    assert ws["wave"] == 3
    assert len(ws["blocking_software"]) > 0

def test_invalid_file_format(db_session):
    """Неподдерживаемый формат файла должен вызывать ValueError"""
    with pytest.raises(ValueError, match="Неподдерживаемый формат файла"):
        process_audit_file(b"some content", "audit.txt", "Astra Linux Special Edition 1.7", db_session)

def test_unknown_target_os(db_session):
    """Несуществующая ОС должна вызывать ValueError"""
    csv_data = "workstation_id,department,user_fullname,ram_gb,cpu_cores,disk_gb,installed_software\n".encode("utf-8")
    with pytest.raises(ValueError, match="не найдена в базе данных"):
        process_audit_file(csv_data, "test.csv", "NonExistentOS 9.9", db_session)
