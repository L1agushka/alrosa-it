import numpy as np
import pandas as pd

np.random.seed(42)
N = 2500

departments = [
    "Бухгалтерия и финансовый контроль",
    "Служба главного механика",
    "Управление информационных технологий",
    "Юридический департамент",
    "Отдел кадров и делопроизводства",
    "Геологоразведочная партия",
    "Логистика и материально-техническое снабжение",
]

data = []

for i in range(1, N + 1):
    ws_id = f"WS-HIST-{i:04d}"
    dept = np.random.choice(departments, p=[0.18, 0.16, 0.12, 0.12, 0.14, 0.12, 0.16])

    # Аппаратные характеристики
    if dept in ["Служба главного механика", "Геологоразведочная партия"]:
        ram = int(np.random.choice([8, 16, 32], p=[0.25, 0.60, 0.15]))
        cpu = int(np.random.choice([4, 6, 8, 12], p=[0.2, 0.4, 0.3, 0.1]))
        disk = int(np.random.choice([128, 256, 512, 1024], p=[0.1, 0.4, 0.4, 0.1]))
        has_cad = int(np.random.choice([0, 1], p=[0.25, 0.75]))
    else:
        ram = int(np.random.choice([4, 8, 16], p=[0.30, 0.55, 0.15]))
        cpu = int(np.random.choice([2, 4, 6], p=[0.35, 0.50, 0.15]))
        disk = int(np.random.choice([64, 120, 240, 500], p=[0.15, 0.45, 0.30, 0.10]))
        has_cad = 0

    # Специфика ПО подразделения
    if dept in ["Бухгалтерия и финансовый контроль", "Юридический департамент"]:
        has_crypto = int(np.random.choice([0, 1], p=[0.15, 0.85]))
        has_thick_1c = int(np.random.choice([0, 1], p=[0.20, 0.80]))
    else:
        has_crypto = int(np.random.choice([0, 1], p=[0.85, 0.15]))
        has_thick_1c = int(np.random.choice([0, 1], p=[0.60, 0.40]))

    # Общее окружение
    installed_apps = int(np.random.poisson(lam=8) + 2)
    unsupported_apps = int(np.random.binomial(n=min(installed_apps, 8), p=0.25))
    peripherals_count = int(np.random.choice([1, 2, 3, 4, 5], p=[0.35, 0.35, 0.15, 0.10, 0.05]))

    # Логика риска с нелинейными факторами
    risk_score = 0.0

    # 1. Железо
    if ram < 8:
        risk_score += 1.8
    if disk < 120:
        risk_score += 1.2
    if cpu < 4:
        risk_score += 1.0

    # 2. Критичные компоненты
    if has_crypto:
        risk_score += 1.5
    if has_cad:
        risk_score += 2.0
    if has_thick_1c:
        risk_score += 1.1

    # 3. Периферия и несовместимости
    risk_score += unsupported_apps * 0.7
    if peripherals_count >= 3:
        risk_score += 1.3

    # Синергетический риск: сложное ПО + слабая память
    if (has_cad or has_crypto) and ram < 8:
        risk_score += 2.2

    # Добавление стохастического шума (человеческий фактор, непредвиденные драйверы)
    noise = np.random.normal(loc=0.0, scale=1.1)
    final_score = risk_score + noise

    # Целевые переменные
    prob = 1 / (1 + np.exp(-(final_score - 4.5)))
    incident = 1 if prob > 0.50 else 0

    # Затраты техподдержки в часах
    if incident == 1:
        support_hours = round(float(np.random.uniform(2.5, 9.0) + (1.2 if has_cad else 0)), 1)
    else:
        support_hours = round(float(np.random.uniform(0.5, 2.0)), 1)

    data.append({
        "workstation_id": ws_id,
        "department": dept,
        "ram_gb": ram,
        "cpu_cores": cpu,
        "disk_gb": disk,
        "installed_apps_count": installed_apps,
        "unsupported_apps_count": unsupported_apps,
        "has_crypto_tools": has_crypto,
        "has_cad_software": has_cad,
        "has_thick_1c": has_thick_1c,
        "peripherals_count": peripherals_count,
        "support_hours": support_hours,
        "incident_occurred": incident,
    })

df = pd.DataFrame(data)
df.to_csv("ml/data/migration_dataset.csv", index=False, encoding="utf-8")
print(f"Датасет успешно сформирован: ml/data/migration_dataset.csv ({len(df)} записей)")
print("Распределение целевого класса (инциденты):")
print(df["incident_occurred"].value_counts(normalize=True))
