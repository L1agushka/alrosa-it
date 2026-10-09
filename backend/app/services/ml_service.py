import json
import os
import joblib
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../ml/random_forest.joblib")
META_PATH = os.path.join(os.path.dirname(__file__), "../ml/meta.json")

class MLRiskService:
    def __init__(self):
        self.model = None
        self.meta = {}
        self._load()

    def _load(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
            except Exception as e:
                print(f"[MLService] Ошибка загрузки модели: {e}")
        if os.path.exists(META_PATH):
            try:
                with open(META_PATH, "r", encoding="utf-8") as f:
                    self.meta = json.load(f)
            except Exception as e:
                print(f"[MLService] Ошибка чтения метаданных: {e}")

    def predict_risk(self, workstations: list) -> dict:
        if not self.model or not workstations:
            return {
                "available": False,
                "summary": {},
                "feature_importances": self.meta.get("feature_importances", []),
                "items": []
            }

        rows = []
        for ws in workstations:
            dept = ws.department.name if hasattr(ws.department, "name") else (ws.department or "Прочее")
            installed = ws.installed_software or []
            installed_count = len(installed)
            
            # Флаги на основе установленного ПО
            sw_names = " ".join([
                (s.software_name if hasattr(s, "software_name") else str(s)).lower() 
                for s in installed
            ])

            has_crypto = int(any(k in sw_names for k in ["крипто", "crypto", "rutoken", "рутокен", "эцп", "csp"]))
            has_cad = int(any(k in sw_names for k in ["cad", "компас", "autocad", "revit", "solidworks"]))
            has_1c = int("1c" in sw_names or "1с" in sw_names)

            assess = getattr(ws, "assessment", None) or {}
            blockers = assess.get("blockers", []) if isinstance(assess, dict) else getattr(assess, "blockers", [])
            unsupported_count = len(blockers)

            rows.append({
                "workstation_id": getattr(ws, "workstation_ext_id", None) or getattr(ws, "id", "WS-0"),
                "department": dept,
                "ram_gb": int(getattr(ws, "ram_gb", 8) or 8),
                "cpu_cores": int(getattr(ws, "cpu_cores", 4) or 4),
                "disk_gb": int(getattr(ws, "disk_gb", 256) or 256),
                "installed_apps_count": installed_count or 6,
                "unsupported_apps_count": unsupported_count,
                "has_crypto_tools": has_crypto,
                "has_cad_software": has_cad,
                "has_thick_1c": has_1c,
                "peripherals_count": 2,
            })

        df = pd.DataFrame(rows)
        feature_cols = [
            "department", "ram_gb", "cpu_cores", "disk_gb",
            "installed_apps_count", "unsupported_apps_count",
            "has_crypto_tools", "has_cad_software", "has_thick_1c",
            "peripherals_count"
        ]

        # Инференс: вероятности инцидента
        probas = self.model.predict_proba(df[feature_cols])[:, 1]
        
        items = []
        high_risk_count = 0
        med_risk_count = 0
        low_risk_count = 0

        for r, p in zip(rows, probas):
            prob_pct = round(float(p * 100), 1)
            if prob_pct >= 60:
                level = "Высокий"
                high_risk_count += 1
            elif prob_pct >= 35:
                level = "Умеренный"
                med_risk_count += 1
            else:
                level = "Низкий"
                low_risk_count += 1

            items.append({
                "workstation_id": r["workstation_id"],
                "department": r["department"],
                "incident_probability": prob_pct,
                "risk_level": level,
                "key_risk_factor": "ОЗУ < 8 ГБ" if r["ram_gb"] < 8 else ("СКЗИ/КриптоПро" if r["has_crypto_tools"] else "ПО без аналога")
            })

        total = len(items)
        return {
            "available": True,
            "metrics": self.meta.get("metrics", {}),
            "summary": {
                "total_analyzed": total,
                "high_risk_count": high_risk_count,
                "medium_risk_count": med_risk_count,
                "low_risk_count": low_risk_count,
                "fleet_risk_index": round(float(probas.mean() * 100), 1) if total else 0
            },
            "feature_importances": self.meta.get("feature_importances", []),
            "workstations": items
        }

ml_risk_service = MLRiskService()
