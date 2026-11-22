"""Train and evaluate the synthetic migration-risk prototype reproducibly."""
import argparse
import hashlib
import json
from pathlib import Path
import platform
import sys

import joblib
import numpy as np
import pandas as pd
import scipy
import sklearn
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, confusion_matrix, f1_score, log_loss, roc_auc_score
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.ml_contract import FEATURE_COLUMNS, FEATURE_LABELS, SCHEMA_VERSION


def metrics(y, probabilities):
    prediction = probabilities >= 0.5
    return {"accuracy": round(accuracy_score(y, prediction), 4),
            "f1_score": round(f1_score(y, prediction, zero_division=0), 4),
            "roc_auc": round(roc_auc_score(y, probabilities), 4),
            "brier_score": round(brier_score_loss(y, probabilities), 4),
            "log_loss": round(log_loss(y, probabilities), 4),
            "confusion_matrix": confusion_matrix(y, prediction, labels=[0,1]).tolist()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "ml/data/migration_dataset.csv")
    parser.add_argument("--output", type=Path, default=ROOT / "backend/app/ml")
    args = parser.parse_args()
    df = pd.read_csv(args.data)
    if not set(FEATURE_COLUMNS + ["incident_occurred", "workstation_id"]) <= set(df.columns):
        raise ValueError("Dataset does not match the feature contract")
    if df.workstation_id.duplicated().any() or df[FEATURE_COLUMNS].isna().any().any():
        raise ValueError("Missing values or duplicate workstation identifiers")
    X, y = df[FEATURE_COLUMNS], df.incident_occurred
    if set(y.unique()) != {0,1}:
        raise ValueError("Training requires both binary target classes")
    numeric = FEATURE_COLUMNS[1:]
    if (X[numeric] < 0).any().any() or not np.isfinite(X[numeric]).all().all():
        raise ValueError("Invalid numeric training features")
    train_idx, test_idx = train_test_split(np.arange(len(df)), test_size=0.2, random_state=42, stratify=y)
    assert not set(train_idx) & set(test_idx)
    X_train, X_test, y_train, y_test = X.iloc[train_idx], X.iloc[test_idx], y.iloc[train_idx], y.iloc[test_idx]

    def preprocessing(scale=False):
        return ColumnTransformer([
            ("department", OneHotEncoder(handle_unknown="ignore", sparse_output=False), ["department"]),
            ("numeric", StandardScaler() if scale else "passthrough", numeric)])
    forest = Pipeline([("preprocess", preprocessing()), ("classifier", RandomForestClassifier(
        n_estimators=160, max_depth=9, min_samples_leaf=4, random_state=42, n_jobs=1))])
    model = CalibratedClassifierCV(estimator=forest, method="sigmoid",
        cv=StratifiedKFold(3, shuffle=True, random_state=42), ensemble=True, n_jobs=1)
    model.fit(X_train, y_train)
    baseline = Pipeline([("preprocess", preprocessing(True)),
                         ("classifier", LogisticRegression(max_iter=1500, random_state=42))])
    baseline.fit(X_train, y_train)
    positive = list(model.classes_).index(1)
    probabilities = model.predict_proba(X_test)[:, positive]
    importance = permutation_importance(model, X_test, y_test, n_repeats=5, random_state=42, scoring="roc_auc")
    positive_total = np.maximum(importance.importances_mean, 0).sum()
    factors = [{"feature":FEATURE_LABELS[code], "code":code, "roc_auc_drop":round(float(value),5),
                "weight_pct":round(float(max(value,0)/positive_total*100),2) if positive_total else 0}
               for code,value in zip(FEATURE_COLUMNS, importance.importances_mean)]
    args.output.mkdir(parents=True, exist_ok=True)
    model_path = args.output / "random_forest.joblib"
    joblib.dump(model, model_path, compress=3)
    meta = {
        "schema_version":SCHEMA_VERSION, "model_name":"Calibrated Random Forest v2",
        "dataset_kind":"synthetic", "dataset_sha256":hashlib.sha256(args.data.read_bytes()).hexdigest(),
        "model_sha256":hashlib.sha256(model_path.read_bytes()).hexdigest(),
        "feature_columns":FEATURE_COLUMNS, "seed":42,
        "split":{"train_rows":len(train_idx), "test_rows":len(test_idx), "test_fraction":0.2,
                 "calibration":"3-fold stratified cross-validation on training rows only",
                 "test_ids_sha256":hashlib.sha256("\n".join(df.workstation_id.iloc[test_idx]).encode()).hexdigest()},
        "versions":{"python":platform.python_version(), "scikit_learn":sklearn.__version__,
                    "numpy":np.__version__, "scipy":scipy.__version__, "pandas":pd.__version__, "joblib":joblib.__version__},
        "metrics":metrics(y_test, probabilities),
        "baseline":{"name":"Logistic regression", "metrics":metrics(y_test, baseline.predict_proba(X_test)[:,1])},
        "feature_importances":sorted(factors,key=lambda f:f["weight_pct"],reverse=True),
        "importance_method":"Permutation importance, ROC-AUC, held-out synthetic test data",
        "training_departments":sorted(df.department.unique().tolist()),
        "feature_ranges":{col:{"min":float(X_train[col].min()),"max":float(X_train[col].max())} for col in numeric},
        "limitations":["Synthetic target labels, not enterprise incident history.",
                       "Unmeasured peripheral count defaults to 2 and is disclosed.",
                       "Scenario forecasts are counterfactual estimates, not causal evidence.",
                       "Low model risk does not override an audit blocker."],
    }
    (args.output / "meta.json").write_text(json.dumps(meta,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"metrics":meta["metrics"],"baseline":meta["baseline"],"split":meta["split"]},ensure_ascii=False,indent=2))


if __name__ == "__main__":
    main()
