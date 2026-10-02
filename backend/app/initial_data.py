# backend/app/initial_data.py

# Аппаратные требования дистрибутивов
TARGET_OS_PROFILES = [
    {
        "name": "Astra Linux Special Edition 1.7",
        "min_ram_gb": 4,
        "min_cpu_cores": 2,
        "min_disk_gb": 30,
    },
    {
        "name": "РЕД ОС 7.3 Муром",
        "min_ram_gb": 2,
        "min_cpu_cores": 2,
        "min_disk_gb": 20,
    }
]

# Базовая матрица: софт, категория и поведение в отечественных ОС
INITIAL_SOFTWARE_RULES = [
    {
        "name": "Microsoft Office 2016/2019",
        "category": "Офисный пакет",
        "status": "alternative_available",
        "domestic_alternative": "Р-7 Офис / МойОфис",
        "is_blocker": False,
        "comment": "Штатная миграция, документы форматов docx/xlsx открываются без проблем"
    },
    {
        "name": "Google Chrome",
        "category": "Браузер",
        "status": "alternative_available",
        "domestic_alternative": "Яндекс Браузер для бизнеса / Chromium-GOST",
        "is_blocker": False,
        "comment": "Нативная замена с поддержкой ГОСТ-криптографии"
    },
    {
        "name": "1С:Предприятие (клиент)",
        "category": "Учётные системы",
        "status": "native_ready",
        "domestic_alternative": "1C:Предприятие (Linux client)",
        "is_blocker": False,
        "comment": "У 1С есть официальные нативные пакеты .deb / .rpm под Linux"
    },
    {
        "name": "AutoCAD",
        "category": "САПР",
        "status": "blocker",
        "domestic_alternative": "nanoCAD / Компас-3D",
        "is_blocker": True,
        "comment": "Критический блокер: требует переобучения сотрудников и конвертации чертежей"
    },
    {
        "name": "КриптоПро CSP",
        "category": "Информационная безопасность",
        "status": "native_ready",
        "domestic_alternative": "КриптоПро CSP Linux",
        "is_blocker": False,
        "comment": "Есть сборка под Linux, но требует установки модулей ядра администратором"
    },
    {
        "name": "Adobe Photoshop",
        "category": "Графика",
        "status": "blocker",
        "domestic_alternative": "GIMP / перенос на VDI",
        "is_blocker": True,
        "comment": "Прямых промышленных аналогов нет, миграция в 3-ю волну через удалённые рабочие столы"
    },
    {
        "name": "Telegram Desktop",
        "category": "Коммуникации",
        "status": "native_ready",
        "domestic_alternative": "VK WorkSpace / TrueConf / Telegram",
        "is_blocker": False,
        "comment": "Полная кроссплатформенность"
    },
    {
        "name": "7-Zip / WinRAR",
        "category": "Утилиты",
        "status": "native_ready",
        "domestic_alternative": "P7ZIP / встроенный архиватор ОС",
        "is_blocker": False,
        "comment": "Проблем при переходе нет"
    }
]
