"""Contracts that distinguish model inference, scenarios and persisted audits."""
from types import SimpleNamespace
import json
import numpy as np
import pytest
from app.services import ml_service as module
from app.services.ml_service import MLRiskService


def station(**changes):
    values = dict(workstation_ext_id="ML-1", department="Office", ram_gb=0, cpu_cores=0,
                  disk_gb=0, installed_software=[], assessment=SimpleNamespace(wave=3, status="blocked", blockers=[]))
    values.update(changes)
    return SimpleNamespace(**values)


def test_model_artifact_loads_and_zero_inventory_is_not_invented():
    service = MLRiskService()
    assert service.model is not None, service.load_error
    result = service.predict_risk([station()])
    assert result["inference_mode"] == "model"
    item = result["workstations"][0]
    assert item["features"]["ram_gb"] == 0
    assert item["features"]["installed_apps_count"] == 0
    assert item["audit_wave"] == 3
    assert result["model_info"]["split"]["test_rows"] == 500
    assert 0 <= item["incident_probability"] <= 100


@pytest.mark.parametrize("field,value", [("schema_version",999),("model_sha256","invalid"),("versions",{"scikit_learn":"0.0"})])
def test_incompatible_artifact_falls_back_without_metrics(tmp_path, monkeypatch, field, value):
    meta = json.loads(module.META_PATH.read_text())
    meta[field] = value
    path = tmp_path / "meta.json"
    path.write_text(json.dumps(meta))
    monkeypatch.setattr(module, "META_PATH", path)
    result = MLRiskService().predict_risk([station()])
    assert result["inference_mode"] == "heuristic"
    assert result["metrics"] == {}
    assert result["model_warning"]


def test_scenario_uses_same_model_and_positive_class_even_if_risk_increases():
    class RecordingModel:
        classes_ = [1,0]
        def __init__(self): self.calls = []
        def predict_proba(self, frame):
            self.calls.append(frame.copy())
            positive = np.where(frame["ram_gb"] >= 16, .8, .2)
            return np.column_stack([positive, 1-positive])
    service = MLRiskService()
    service.model = RecordingModel()
    ws = station(ram_gb=4, installed_software=["AutoCAD"], assessment=SimpleNamespace(wave=3,status="blocked",blockers=[SimpleNamespace(message="AutoCAD")]))
    result = service.predict_risk([ws], {"upgrade_ram":True,"replace_cad":True})
    item = result["workstations"][0]
    assert len(service.model.calls) == 2
    assert item["baseline_probability"] == 20
    assert item["incident_probability"] == 80
    assert item["risk_change_pp"] == 60
    assert item["features"]["unsupported_apps_count"] == 0
    assert item["audit_wave"] == 3
    assert ws.ram_gb == 4 and ws.installed_software == ["AutoCAD"]


def test_invalid_prediction_has_consistent_reserve_baseline_and_scenario():
    service = MLRiskService()
    service.model = SimpleNamespace(classes_=[0,1], predict_proba=lambda frame: np.array([[0,float("nan")]]))
    result = service.predict_risk([station(ram_gb=4)], {"upgrade_ram":True})
    assert result["inference_mode"] == "heuristic"
    assert result["metrics"] == {}
    assert result["workstations"][0]["baseline_probability"] > result["workstations"][0]["incident_probability"]


def test_scenario_endpoint_keeps_saved_audit_and_respects_session(client):
    text = "workstation_id,department,ram_gb,cpu_cores,disk_gb,installed_software\nML-API,ML-test,4,4,120,AutoCAD\n"
    response = client.post("/api/v1/audit/upload", files={"file":("ml-scenario-test.csv",text,"text/csv")})
    assert response.status_code == 200
    audit_id = response.json()["id"]
    url = f"/api/v1/audit/history/{audit_id}"
    before = client.get(url).json()
    result = client.post("/api/v1/stats/ml-risk/simulate", params={"session_id":audit_id}, json={"upgrade_ram":True,"replace_cad":True})
    assert result.status_code == 200, result.text
    assert [w["workstation_id"] for w in result.json()["workstations"]] == ["ML-API"]
    assert client.get(url).json() == before
    assert client.post("/api/v1/stats/ml-risk/simulate",json={"upgrade_ram":"yes"}).status_code == 422
    assert client.get("/api/v1/stats/ml-risk",params={"session_id":99999999}).status_code == 404
