import json
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline

# 1. Загрузка данных
df = pd.read_csv("ml/data/migration_dataset.csv")

categorical_features = ["department"]
numeric_features = [
    "ram_gb",
    "cpu_cores",
    "disk_gb",
    "installed_apps_count",
    "unsupported_apps_count",
    "has_crypto_tools",
    "has_cad_software",
    "has_thick_1c",
    "peripherals_count",
]

feature_columns = categorical_features + numeric_features
X = df[feature_columns]
y = df["incident_occurred"]

# 2. Разделение на train / test (80 / 20)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

# 3. Сборка пайплайна предобработки и модели
preprocessor = ColumnTransformer(
    transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
        ("num", "passthrough", numeric_features),
    ]
)

clf = RandomForestClassifier(
    n_estimators=120,
    max_depth=9,
    min_samples_split=5,
    random_state=42,
    n_jobs=-1
)

model = Pipeline(steps=[
    ("preprocessor", preprocessor),
    ("classifier", clf)
])

# 4. Обучение
model.fit(X_train, y_train)

# 5. Оценка качества
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

acc = accuracy_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc = roc_auc_score(y_test, y_proba)

print("=" * 50)
print(f"Метрики на тестовой выборке:")
print(f"Accuracy:  {acc:.3f}")
print(f"F1-Score:  {f1:.3f}")
print(f"ROC-AUC:   {roc:.3f}")
print("=" * 50)
print(classification_report(y_test, y_pred, target_names=["Без инцидента", "Инцидент"]))

# 6. Расчет важности признаков (Feature Importances)
ohe = model.named_steps["preprocessor"].named_transformers_["cat"]
cat_names = list(ohe.get_feature_names_out(categorical_features))
all_feature_names = cat_names + numeric_features

raw_importances = model.named_steps["classifier"].feature_importances_

# Агрегируем категории отделов в один признак для наглядности руководству
feature_mapping = {
    "has_cad_software": "Наличие тяжелого САПР/CAD ПО",
    "ram_gb": "Объем оперативной памяти (ОЗУ)",
    "unsupported_apps_count": "Количество ПО без нативного Linux-бинарника",
    "has_crypto_tools": "Наличие СКЗИ и криптопровайдеров (ЭЦП)",
    "disk_gb": "Свободное дисковое пространство",
    "has_thick_1c": "Локальные толстые клиенты 1С",
    "peripherals_count": "Количество внешней периферии (сканеры/токены)",
    "cpu_cores": "Количество ядер процессора",
    "installed_apps_count": "Общая сложность окружения (кол-во приложений)",
}

importance_summary = {}
dept_sum = 0.0

for name, imp in zip(all_feature_names, raw_importances):
    if name.startswith("department_"):
        dept_sum += imp
    else:
        label = feature_mapping.get(name, name)
        importance_summary[label] = round(float(imp * 100), 2)

importance_summary["Специфика подразделения компании"] = round(dept_sum * 100, 2)
sorted_importance = sorted(importance_summary.items(), key=lambda x: x[1], reverse=True)

print("Топ факторов риска (для отчёта и дашборда):")
for name, val in sorted_importance:
    print(f"  • {name}: {val:.1f}%")

# 7. Сохранение артефактов
joblib.dump(model, "ml/models/random_forest.joblib")

meta = {
    "model_name": "RandomForest_Migration_Risk_v1",
    "metrics": {
        "accuracy": round(acc, 3),
        "f1_score": round(f1, 3),
        "roc_auc": round(roc, 3)
    },
    "feature_importances": [
        {"feature": k, "weight_pct": v} for k, v in sorted_importance
    ]
}

with open("ml/models/meta.json", "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

print("\nМодель и метаданные сохранены в ml/models/")
