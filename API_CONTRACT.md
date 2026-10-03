# 📡 Контракт API (Backend Documentation)

Базовый URL бэкенда при локальной разработке: `http://localhost:8000`  
Интерактивная песочница Swagger (можно тыкать прямо в браузере): `http://localhost:8000/docs`

---

## 1. Справочники и метаданные

### 🔹 Получить список целевых ОС
* **URL:** `GET /api/v1/catalog/os-profiles`
* **Назначение:** Заполнить выпадающий список выбора ОС на форме загрузки.
* **Пример ответа:**
```json
[
  {
    "id": 1,
    "name": "Astra Linux Special Edition 1.7",
    "min_ram_gb": 4,
    "min_cpu_cores": 2,
    "min_disk_gb": 30
  },
  {
    "id": 2,
    "name": "РЕД ОС 7.3 Муром",
    "min_ram_gb": 2,
    "min_cpu_cores": 2,
    "min_disk_gb": 20
  }
]
🔹 Получить матрицу совместимости софта
URL: GET /api/v1/catalog/compatibility?target_os_id=1 (параметр опционален)

Назначение: Отрисовать таблицу-справочник импортозамещения ПО.

Пример ответа:

JSON
[
  {
    "software_name": "Microsoft Office 2016/2019",
    "category": "Офисный пакет",
    "target_os": "Astra Linux Special Edition 1.7",
    "status": "alternative_available",
    "domestic_alternative": "Р-7 Офис / МойОфис",
    "is_blocker": false,
    "comment": "Штатная миграция, форматы docx/xlsx поддерживаются"
  },
  {
    "software_name": "AutoCAD",
    "category": "САПР",
    "target_os": "Astra Linux Special Edition 1.7",
    "status": "blocker",
    "domestic_alternative": "nanoCAD / Компас-3D",
    "is_blocker": true,
    "comment": "Критический блокер: требует переобучения"
  }
]
2. Скоринг и аудит
🔹 Загрузка файла реестра и запуск аудита
URL: POST /api/v1/audit/upload

Content-Type: multipart/form-data

Тело запроса:

file: файл (.csv или .xlsx)

target_os: строка, название ОС (например: "Astra Linux Special Edition 1.7")

Пример ответа:

JSON
{
  "session_id": 1,
  "created_at": "2026-10-02T14:10:44",
  "target_os": "Astra Linux Special Edition 1.7",
  "summary": {
    "total": 5,
    "ready": 3,
    "upgrade_required": 1,
    "blocked": 1,
    "waves": {
      "wave_1": 3,
      "wave_2": 1,
      "wave_3": 1
    }
  },
  "workstations": [
    {
      "workstation_id": "WS-001",
      "department": "Бухгалтерия",
      "user_fullname": "Иванова А.С.",
      "status": "ready",
      "wave": 1,
      "hardware_issues": [],
      "blocking_software": []
    },
    {
      "workstation_id": "WS-003",
      "department": "Проектный отдел",
      "user_fullname": "Смирнов К.А.",
      "status": "blocked",
      "wave": 3,
      "hardware_issues": [],
      "blocking_software": [
        "AutoCAD (nanoCAD / Компас-3D)",
        "Adobe Photoshop (GIMP / перенос на VDI)"
      ]
    }
  ]
}
🔹 История аудитов (Срезы)
URL: GET /api/v1/audit/history

Назначение: Список ранее загруженных отчётов для истории и графиков динамики.

JSON
[
  {
    "id": 1,
    "filename": "sample_workstations.csv",
    "target_os": "Astra Linux Special Edition 1.7",
    "created_at": "2026-10-02T14:10:44",
    "summary": {
      "total": 150,
      "ready": 80,
      "upgrade_required": 40,
      "blocked": 30
    }
  }
]
