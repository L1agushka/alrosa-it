"""Validated model inference and counterfactual scenario evaluation."""
import hashlib
import json
from pathlib import Path
import warnings

import joblib
import numpy as np
import pandas as pd
import sklearn

from ..ml_contract import CAD_KEYS, CRYPTO_KEYS, FEATURE_COLUMNS, SCHEMA_VERSION, RISK_THRESHOLDS, risk_level

MODEL_PATH = Path(__file__).resolve().parent.parent / "ml/random_forest.joblib"
META_PATH = MODEL_PATH.with_name("meta.json")


class MLRiskService:
    def __init__(self):
        self.model, self.meta, self.load_error = None, {}, None
        self._load()

    def _load(self):
        try:
            meta = json.loads(META_PATH.read_text(encoding="utf-8"))
            if meta.get("schema_version") != SCHEMA_VERSION or meta.get("feature_columns") != FEATURE_COLUMNS:
                raise ValueError("Несовместимая схема признаков")
            if meta.get("versions", {}).get("scikit_learn") != sklearn.__version__:
                raise ValueError("Версия scikit-learn не совпадает с версией обучения")
            if hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest() != meta.get("model_sha256"):
                raise ValueError("Контрольная сумма модели не совпадает с метаданными")
            with warnings.catch_warnings():
                warnings.simplefilter("error", sklearn.exceptions.InconsistentVersionWarning)
                model = joblib.load(MODEL_PATH)
            if list(model.feature_names_in_) != FEATURE_COLUMNS or 1 not in model.classes_:
                raise ValueError("Некорректный контракт сохранённой модели")
            self.model, self.meta = model, meta
        except Exception as exc:
            self.load_error = str(exc)
            self.model, self.meta = None, {}

    @staticmethod
    def _features(ws):
        installed = getattr(ws, "installed_software", None)
        if installed is None:
            installed = getattr(ws, "software", None) or []
        names = [str(getattr(item, "name", None) or item).lower() for item in installed]
        assessment = getattr(ws, "assessment", None)
        blockers = (assessment.get("blockers", []) if isinstance(assessment, dict)
                    else getattr(assessment, "blockers", None)) or []
        messages = [str(item.get("message", "") if isinstance(item, dict) else getattr(item, "message", item)).lower()
                    for item in blockers]
        department = getattr(ws, "department", None)
        row = {
            "workstation_id": str(getattr(ws, "workstation_ext_id", None) or getattr(ws, "id", "WS")),
            "department": getattr(department, "name", department) or "Общий",
            "ram_gb": int(getattr(ws, "ram_gb", 0) or 0),
            "cpu_cores": int(getattr(ws, "cpu_cores", 0) or 0),
            "disk_gb": int(getattr(ws, "disk_gb", 0) or 0),
            "installed_apps_count": len(names),
            "unsupported_apps_count": len(messages),
            "has_crypto_tools": int(any(key in name for name in names for key in CRYPTO_KEYS)),
            "has_cad_software": int(any(key in name for name in names for key in CAD_KEYS)),
            "has_thick_1c": int(any("1c" in name or "1с" in name for name in names)),
            "peripherals_count": 2,
            "cad_blockers": sum(any(key in message for key in CAD_KEYS) for message in messages),
            "crypto_blockers": sum(any(key in message for key in CRYPTO_KEYS) for message in messages),
        }
        row["audit_wave"] = assessment.get("wave") if isinstance(assessment, dict) else getattr(assessment, "wave", None)
        status = assessment.get("status") if isinstance(assessment, dict) else getattr(assessment, "status", None)
        row["audit_status"] = getattr(status, "value", status)
        return row

    def _probabilities(self, rows):
        frame = pd.DataFrame(rows)[FEATURE_COLUMNS]
        if self.model is not None:
            probabilities = self.model.predict_proba(frame)[:, list(self.model.classes_).index(1)]
            if len(probabilities) != len(rows) or not np.isfinite(probabilities).all() or ((probabilities < 0) | (probabilities > 1)).any():
                raise ValueError("Модель вернула некорректные оценки")
            return np.asarray(probabilities), "model"
        return self._heuristic(rows), "heuristic"

    @staticmethod
    def _heuristic(rows):
        # An explicit reserve index, never presented as validated incident probability.
        return np.array([min(0.98, 0.08 + (0.55 if r["ram_gb"] < 4 else 0.3 if r["ram_gb"] < 8 else 0)
            + 0.2 * r["has_cad_software"] + 0.12 * r["has_crypto_tools"]
            + 0.07 * r["has_thick_1c"] + min(0.4, 0.1 * r["unsupported_apps_count"])
            + (0.1 if r["cpu_cores"] < 2 or r["disk_gb"] < 30 else 0)) for r in rows])

    @staticmethod
    def _scenario(row, options):
        changed = dict(row)
        actions = []
        if options.get("upgrade_ram") and row["ram_gb"] < 16:
            changed["ram_gb"] = 16
            actions.append("ОЗУ до 16 ГБ")
        if options.get("replace_cad") and row["has_cad_software"]:
            changed["has_cad_software"] = 0
            changed["unsupported_apps_count"] = max(0, changed["unsupported_apps_count"] - row["cad_blockers"])
            actions.append("Замена инженерного ПО")
        if options.get("web_1c") and row["has_thick_1c"]:
            changed["has_thick_1c"] = 0
            actions.append("Веб-клиент 1С")
        if options.get("compatible_crypto") and row["has_crypto_tools"]:
            changed["has_crypto_tools"] = 0
            changed["unsupported_apps_count"] = max(0, changed["unsupported_apps_count"] - row["crypto_blockers"])
            actions.append("Совместимое криптоокружение")
        return changed, actions

    @staticmethod
    def _summary(items):
        scores = [item["incident_probability"] for item in items]
        return {"total_analyzed":len(items), "fleet_risk_index":round(float(np.mean(scores)),1) if scores else 0,
            "high_risk_count":sum(item["risk_level"] == "Высокий" for item in items),
            "medium_risk_count":sum(item["risk_level"] == "Умеренный" for item in items),
            "low_risk_count":sum(item["risk_level"] == "Низкий" for item in items)}

    def predict_risk(self, workstations, scenario=None):
        if not workstations:
            return {"available":False, "inference_mode":"unavailable", "summary":{},
                    "metrics":{}, "feature_importances":[], "workstations":[]}
        original = [self._features(ws) for ws in workstations]
        changed, actions = zip(*(self._scenario(row, scenario or {}) for row in original))
        error = self.load_error
        try:
            base, mode = self._probabilities(original)
            simulated, second_mode = self._probabilities(changed)
            if mode != second_mode:
                raise ValueError("Режимы базового и сценарного расчёта различаются")
        except Exception as exc:
            error = str(exc)
            base, simulated, mode = self._heuristic(original), self._heuristic(changed), "heuristic"
        items, base_items = [], []
        for row, after, action, before_probability, after_probability in zip(original, changed, actions, base, simulated):
            before = round(float(before_probability * 100),1)
            result = round(float(after_probability * 100),1)
            factors = []
            if row["ram_gb"] < 8:
                factors.append(f'ОЗУ {row["ram_gb"]} ГБ')
            if row["has_cad_software"]:
                factors.append("Инженерное ПО")
            if row["has_crypto_tools"]:
                factors.append("Криптографическое ПО")
            if row["has_thick_1c"]:
                factors.append("Локальный клиент 1С")
            if row["unsupported_apps_count"]:
                factors.append(f'ПО для проверки: {row["unsupported_apps_count"]}')
            quality = ["Количество периферийных устройств не измерено: принято 2"]
            if not row["installed_apps_count"]:
                quality.append("Пустой список установленных программ")
            if self.meta and row["department"] not in self.meta.get("training_departments", []):
                quality.append("Подразделение отсутствовало в обучающей выборке")
            for code, bounds in self.meta.get("feature_ranges", {}).items():
                if not bounds["min"] <= after[code] <= bounds["max"]:
                    quality.append(f"{code}: значение вне диапазона обучения")
            item = {"workstation_id":row["workstation_id"], "department":row["department"],
                "incident_probability":result, "baseline_probability":before,
                "risk_change_pp":round(result-before,1), "risk_level":risk_level(result),
                "key_risk_factor":", ".join(factors) or "Выраженных факторов не найдено",
                "observed_factors":factors, "actions":action, "data_quality":quality,
                "features":{code:after[code] for code in FEATURE_COLUMNS},
                "audit_wave":row["audit_wave"], "audit_status":row["audit_status"]}
            items.append(item)
            base_items.append({**item,"incident_probability":before,"risk_level":risk_level(before)})
        validated_meta = self.meta if mode == "model" else {}
        return {"available":True, "inference_mode":mode, "model_warning":error if mode != "model" else None,
            "metrics":validated_meta.get("metrics",{}), "baseline_metrics":validated_meta.get("baseline",{}),
            "model_name":validated_meta.get("model_name", "Резервный индекс"),
            "model_info":{key:validated_meta.get(key) for key in ("schema_version","dataset_kind","dataset_sha256",
                "model_sha256","versions","split","importance_method")},
            "risk_thresholds":RISK_THRESHOLDS, "summary":self._summary(items),
            "baseline_summary":self._summary(base_items), "scenario":scenario or {},
            "data_notice":"Модель проверена на синтетической выборке. Оценка не подтверждает совместимость и не отменяет блокеры аудита.",
            "scenario_notice":"Повторный расчёт на изменённых признаках. Это сценарное предположение, а не подтверждённый эффект модернизации.",
            "feature_importances":validated_meta.get("feature_importances",[]), "workstations":items}


ml_risk_service = MLRiskService()
