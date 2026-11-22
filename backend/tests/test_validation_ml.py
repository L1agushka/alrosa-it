from types import SimpleNamespace
import pytest
from app.services.parser import parse_audit_file, ParserError
from app.services.ml_service import MLRiskService


@pytest.mark.parametrize("ram", ["-1","NaN","infinity","1.5","broken"])
def test_invalid_inventory_values(ram):
    data = f"workstation_id,department,ram_gb,cpu_cores,disk_gb,installed_software\nWS-1,Office,{ram},4,120,Chrome\n"
    with pytest.raises(ParserError,match="ram_gb"):
        parse_audit_file(data.encode(),"invalid.csv")


def test_duplicate_workstation_id_is_rejected():
    line = "WS-1,Office,8,4,120,Chrome\n"
    data = "workstation_id,department,ram_gb,cpu_cores,disk_gb,installed_software\n" + line + line
    with pytest.raises(ParserError,match="уникальными"):
        parse_audit_file(data.encode(),"invalid.csv")


def test_ml_fallback_does_not_claim_model_metrics():
    service = MLRiskService()
    service.model = None
    service.meta = {"metrics":{"accuracy":0.99}, "feature_importances":[{"feature":"test","weight_pct":100}]}
    result = service.predict_risk([SimpleNamespace(
        department="Office",installed_software=["DemoCAD"],ram_gb=8,cpu_cores=4,disk_gb=120,
        assessment=None,workstation_ext_id="WS-1")])
    assert result["inference_mode"] == "heuristic"
    assert result["metrics"] == {}
    assert result["feature_importances"] == []


def test_unavailable_llm_does_not_reject_unknown_software(monkeypatch):
    from app.services.nlp_matcher import QwenEnterpriseClassifier
    matcher = QwenEnterpriseClassifier()
    monkeypatch.setattr(matcher, "query_qwen_discovery", lambda _: {"available": False})
    result = matcher.match("xyz-unique-test-package")
    assert result["is_software"] is None
    assert result["status"] == "manual_check"
    assert "confidence_pct" not in result

