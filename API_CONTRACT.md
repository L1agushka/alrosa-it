# Документация API бэкенда (АЛРОСА ИТ)

* **Базовый URL бэкенда:** `http://localhost:8000`
* **Интерактивная песочница Swagger:** `http://localhost:8000/docs`
* **Готовый клиент во фронтенде:** `frontend/src/api/index.js` (рекомендуется вызывать методы через него)

---

## 1. Справочники

### GET /api/v1/catalog/os-profiles
Возвращает список доступных целевых операционных систем и их системные требования.
Используется для заполнения выпадающего списка выбора ОС.

Параметры: нет

Пример ответа (200 OK):
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

---

### GET /api/v1/catalog/software
Возвращает нормализованный каталог программного обеспечения.

Параметры (Query):
- `category` (string, optional) — фильтр по категории (например, "САПР", "Офисный пакет")

Пример ответа (200 OK):
[
  {
    "id": 1,
    "name": "Microsoft Office 2016/2019",
    "category": "Офисный пакет"
  },
  {
    "id": 4,
    "name": "AutoCAD",
    "category": "САПР"
  }
]

---

### GET /api/v1/catalog/compatibility
Возвращает матрицу совместимости ПО с целевыми ОС и отечественные аналоги.

Параметры (Query):
- `target_os_id` (integer, optional) — ID целевой ОС для фильтрации

Пример ответа (200 OK):
[
  {
    "software_name": "Microsoft Office 2016/2019",
    "category": "Офисный пакет",
    "target_os": "Astra Linux Special Edition 1.7",
    "status": "alternative_available",
    "domestic_alternative": "Р-7 Офис / МойОфис",
    "is_blocker": false,
    "comment": "Штатная миграция, документы docx/xlsx поддерживаются"
  },
  {
    "software_name": "AutoCAD",
    "category": "САПР",
    "target_os": "Astra Linux Special Edition 1.7",
    "status": "blocker",
    "domestic_alternative": "nanoCAD / Компас-3D",
    "is_blocker": true,
    "comment": "Критический блокер: требует переобучения сотрудников"
  }
]

---

## 2. Скоринг и аудит

### POST /api/v1/audit/upload
Основной эндпоинт анализа инфраструктуры. Принимает файл выгрузки реестра рабочих мест, проводит аудит совместимости, вычисляет волны миграции и сохраняет исторический срез в базу.

Content-Type: multipart/form-data

Параметры (Form Data):
- `file` (File, required) — файл `.csv` или `.xlsx`
- `target_os` (string, required) — название целевой ОС (например, "Astra Linux Special Edition 1.7")

Пример ответа (200 OK):
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
      "workstation_id": "WS-002",
      "department": "Отдел кадров",
      "user_fullname": "Петров В.И.",
      "status": "upgrade_required",
      "wave": 2,
      "hardware_issues": [
        "Недостаточно ОЗУ: 2 ГБ (требуется 4 ГБ)"
      ],
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

---

### GET /api/v1/audit/history
Возвращает список всех ранее проведённых сессий аудита.

Параметры: нет

Пример ответа (200 OK):
[
  {
    "id": 1,
    "filename": "sample_workstations.csv",
    "target_os": "Astra Linux Special Edition 1.7",
    "created_at": "2026-10-02T14:10:44",
    "summary": {
      "total": 150,
      "ready": 92,
      "upgrade_required": 24,
      "blocked": 34
    }
  }
]

---

## 3. Аналитика и статистика

### GET /api/v1/stats/software-categories
Статистика распределения ПО по категориям для графиков и круговых диаграмм.

Пример ответа (200 OK):
[
  { "category": "Офисный пакет", "count": 12 },
  { "category": "САПР", "count": 4 },
  { "category": "Браузер", "count": 6 }
]

---

### GET /api/v1/stats/blockers
Список критических блокирующих программ для конкретной ОС.

Параметры (Query):
- `target_os_name` (string, optional) — по умолчанию "Astra Linux Special Edition 1.7"

Пример ответа (200 OK):
{
  "target_os": "Astra Linux Special Edition 1.7",
  "total_blockers": 2,
  "blockers": [
    {
      "name": "AutoCAD",
      "category": "САПР",
      "alternative": "nanoCAD / Компас-3D",
      "comment": "Критический блокер: требует переобучения сотрудников"
    },
    {
      "name": "Adobe Photoshop",
      "category": "Графика",
      "alternative": "GIMP / перенос на VDI",
      "comment": "Прямых аналогов нет, миграция в 3-ю волну через VDI"
    }
  ]
}
