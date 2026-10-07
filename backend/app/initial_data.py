"""
Данные для первичного наполнения справочников.
Используются в seed.py для идемпотентной загрузки в БД.
"""

# ─────────────────────────────────────────────
# Целевые отечественные ОС и их аппаратные требования
# ─────────────────────────────────────────────
OPERATING_SYSTEMS = [
    {
        "name": "Astra Linux Special Edition 1.7",
        "vendor": "Астра",
        "version": "1.7",
        "is_domestic": True,
        "min_ram_gb": 4,
        "min_cpu_cores": 2,
        "min_disk_gb": 30,
    },
    {
        "name": "РЕД ОС 7.3 Муром",
        "vendor": "РЕД СОФТ",
        "version": "7.3",
        "is_domestic": True,
        "min_ram_gb": 2,
        "min_cpu_cores": 2,
        "min_disk_gb": 20,
    },
    {
        "name": "Альт 10 СП",
        "vendor": "Базальт СПО",
        "version": "10",
        "is_domestic": True,
        "min_ram_gb": 2,
        "min_cpu_cores": 2,
        "min_disk_gb": 25,
    },
    {
        "name": "Rosa Enterprise Linux Desktop",
        "vendor": "РОСА",
        "version": "12",
        "is_domestic": True,
        "min_ram_gb": 4,
        "min_cpu_cores": 2,
        "min_disk_gb": 35,
    },
]


# ─────────────────────────────────────────────
# Справочник ПО: name, vendor, category, is_domestic
# category — значение Enum SoftwareCategory
# ─────────────────────────────────────────────
SOFTWARE = [
    # Офисные пакеты
    {"name": "Microsoft Office 2016", "vendor": "Microsoft", "category": "office", "is_domestic": False},
    {"name": "Microsoft Office 2019", "vendor": "Microsoft", "category": "office", "is_domestic": False},
    {"name": "Microsoft Office 365", "vendor": "Microsoft", "category": "office", "is_domestic": False},
    {"name": "LibreOffice", "vendor": "The Document Foundation", "category": "office", "is_domestic": False},
    {"name": "Р-7 Офис", "vendor": "Новые облачные технологии", "category": "office", "is_domestic": True},
    {"name": "МойОфис Стандартный", "vendor": "Новые облачные технологии", "category": "office", "is_domestic": True},

    # Браузеры
    {"name": "Google Chrome", "vendor": "Google", "category": "browser", "is_domestic": False},
    {"name": "Mozilla Firefox", "vendor": "Mozilla", "category": "browser", "is_domestic": False},
    {"name": "Microsoft Edge", "vendor": "Microsoft", "category": "browser", "is_domestic": False},
    {"name": "Internet Explorer", "vendor": "Microsoft", "category": "browser", "is_domestic": False},
    {"name": "Яндекс Браузер", "vendor": "Яндекс", "category": "browser", "is_domestic": True},
    {"name": "Chromium-GOST", "vendor": "КриптоПро", "category": "browser", "is_domestic": True},

    # Учётные системы
    {"name": "1С:Предприятие 8.3", "vendor": "1С", "category": "accounting", "is_domestic": True},
    {"name": "SAP GUI", "vendor": "SAP", "category": "accounting", "is_domestic": False},
    {"name": "Oracle E-Business Suite", "vendor": "Oracle", "category": "accounting", "is_domestic": False},

    # САПР
    {"name": "AutoCAD", "vendor": "Autodesk", "category": "cad", "is_domestic": False},
    {"name": "SolidWorks", "vendor": "Dassault Systèmes", "category": "cad", "is_domestic": False},
    {"name": "КОМПАС-3D", "vendor": "Аскон", "category": "cad", "is_domestic": True},
    {"name": "nanoCAD", "vendor": "Нанософт", "category": "cad", "is_domestic": True},

    # Графика
    {"name": "Adobe Photoshop", "vendor": "Adobe", "category": "graphics", "is_domestic": False},
    {"name": "Adobe Illustrator", "vendor": "Adobe", "category": "graphics", "is_domestic": False},
    {"name": "CorelDRAW", "vendor": "Corel", "category": "graphics", "is_domestic": False},
    {"name": "GIMP", "vendor": "GIMP Team", "category": "graphics", "is_domestic": False},
    {"name": "Inkscape", "vendor": "Inkscape", "category": "graphics", "is_domestic": False},
    {"name": "Krita", "vendor": "Krita Foundation", "category": "graphics", "is_domestic": False},

    # Коммуникации
    {"name": "Microsoft Teams", "vendor": "Microsoft", "category": "communications", "is_domestic": False},
    {"name": "Skype for Business", "vendor": "Microsoft", "category": "communications", "is_domestic": False},
    {"name": "Zoom", "vendor": "Zoom", "category": "communications", "is_domestic": False},
    {"name": "Telegram Desktop", "vendor": "Telegram", "category": "communications", "is_domestic": False},
    {"name": "Slack", "vendor": "Slack", "category": "communications", "is_domestic": False},
    {"name": "VK WorkSpace", "vendor": "VK", "category": "communications", "is_domestic": True},
    {"name": "TrueConf", "vendor": "TrueConf", "category": "communications", "is_domestic": True},

    # ИБ
    {"name": "КриптоПро CSP", "vendor": "КриптоПро", "category": "security", "is_domestic": True},
    {"name": "VipNet Client", "vendor": "ИнфоТеКС", "category": "security", "is_domestic": True},
    {"name": "Kaspersky Endpoint Security", "vendor": "Лаборатория Касперского", "category": "security", "is_domestic": True},
    {"name": "Dr.Web", "vendor": "Доктор Веб", "category": "security", "is_domestic": True},

    # Утилиты
    {"name": "WinRAR", "vendor": "RARLAB", "category": "utility", "is_domestic": False},
    {"name": "7-Zip", "vendor": "Igor Pavlov", "category": "utility", "is_domestic": False},
    {"name": "Total Commander", "vendor": "Ghisler", "category": "utility", "is_domestic": False},

    # Email
    {"name": "Microsoft Outlook", "vendor": "Microsoft", "category": "email", "is_domestic": False},
    {"name": "Thunderbird", "vendor": "Mozilla", "category": "email", "is_domestic": False},

    # Медиа
    {"name": "VLC Media Player", "vendor": "VideoLAN", "category": "media", "is_domestic": False},
    {"name": "Windows Media Player", "vendor": "Microsoft", "category": "media", "is_domestic": False},

    # Разработка
    {"name": "Visual Studio", "vendor": "Microsoft", "category": "development", "is_domestic": False},
    {"name": "Visual Studio Code", "vendor": "Microsoft", "category": "development", "is_domestic": False},
    {"name": "IntelliJ IDEA", "vendor": "JetBrains", "category": "development", "is_domestic": False},
    {"name": "PyCharm", "vendor": "JetBrains", "category": "development", "is_domestic": False},

    # БД
    {"name": "SQL Server Management Studio", "vendor": "Microsoft", "category": "database", "is_domestic": False},
    {"name": "DBeaver", "vendor": "DBeaver Corp", "category": "database", "is_domestic": False},
    {"name": "pgAdmin", "vendor": "pgAdmin", "category": "database", "is_domestic": False},

    # PDF
    {"name": "Adobe Acrobat Reader", "vendor": "Adobe", "category": "pdf", "is_domestic": False},
    {"name": "Foxit Reader", "vendor": "Foxit", "category": "pdf", "is_domestic": False},

    # Удалённый доступ
    {"name": "TeamViewer", "vendor": "TeamViewer", "category": "remote_access", "is_domestic": False},
    {"name": "AnyDesk", "vendor": "AnyDesk", "category": "remote_access", "is_domestic": False},
    {"name": "RDP Client", "vendor": "Microsoft", "category": "remote_access", "is_domestic": False},
]


# ─────────────────────────────────────────────
# Правила совместимости ПО с целевыми ОС.
# Связь: software_name + target_os_name
# status — значение Enum CompatibilityStatus
# ─────────────────────────────────────────────
# Для краткости: правила по умолчанию применяются ко всем ОС.
# Если для конкретной ОС правило отличается — задай отдельно.
COMPATIBILITY_RULES = [
    # Офис
    {"software_name": "Microsoft Office 2016", "target_os_name": None, "status": "alternative_available", "analog_name": "Р-7 Офис", "is_blocker": False, "comment": "Полная совместимость форматов DOCX/XLSX"},
    {"software_name": "Microsoft Office 2019", "target_os_name": None, "status": "alternative_available", "analog_name": "МойОфис Стандартный", "is_blocker": False, "comment": "Штатная миграция документооборота"},
    {"software_name": "Microsoft Office 365", "target_os_name": None, "status": "alternative_available", "analog_name": "Р-7 Офис Облако", "is_blocker": False, "comment": "Облачная альтернатива"},
    {"software_name": "LibreOffice", "target_os_name": None, "status": "native_ready", "analog_name": "LibreOffice", "is_blocker": False, "comment": "Нативная поддержка во всех дистрибутивах"},
    {"software_name": "Р-7 Офис", "target_os_name": None, "status": "native_ready", "analog_name": "Р-7 Офис", "is_blocker": False, "comment": "Отечественный офисный пакет"},
    {"software_name": "МойОфис Стандартный", "target_os_name": None, "status": "native_ready", "analog_name": "МойОфис Стандартный", "is_blocker": False, "comment": "Отечественный офисный пакет"},

    # Браузеры
    {"software_name": "Google Chrome", "target_os_name": None, "status": "alternative_available", "analog_name": "Яндекс Браузер", "is_blocker": False, "comment": "ГОСТ-криптография"},
    {"software_name": "Mozilla Firefox", "target_os_name": None, "status": "native_ready", "analog_name": "Firefox ESR", "is_blocker": False, "comment": "Официальные сборки для Linux"},
    {"software_name": "Microsoft Edge", "target_os_name": None, "status": "alternative_available", "analog_name": "Chromium-GOST", "is_blocker": False, "comment": "Chromium с ГОСТ-шифрованием"},
    {"software_name": "Internet Explorer", "target_os_name": None, "status": "web_alternative", "analog_name": "Доступ через терминал", "is_blocker": False, "comment": "Устаревший браузер"},
    {"software_name": "Яндекс Браузер", "target_os_name": None, "status": "native_ready", "analog_name": "Яндекс Браузер", "is_blocker": False, "comment": "Отечественный браузер"},
    {"software_name": "Chromium-GOST", "target_os_name": None, "status": "native_ready", "analog_name": "Chromium-GOST", "is_blocker": False, "comment": "Отечественный браузер"},

    # Учётные системы
    {"software_name": "1С:Предприятие 8.3", "target_os_name": None, "status": "native_ready", "analog_name": "1С Linux-клиент", "is_blocker": False, "comment": "Полная поддержка .deb и .rpm"},
    {"software_name": "SAP GUI", "target_os_name": None, "status": "blocker", "analog_name": "SAP Fiori (веб) / VDI", "is_blocker": True, "comment": "Нативного клиента нет"},
    {"software_name": "Oracle E-Business Suite", "target_os_name": None, "status": "web_alternative", "analog_name": "Веб-интерфейс", "is_blocker": False, "comment": "Доступ через браузер"},

    # САПР
    {"software_name": "AutoCAD", "target_os_name": None, "status": "blocker", "analog_name": "nanoCAD / КОМПАС-3D", "is_blocker": True, "comment": "Критический блокер"},
    {"software_name": "SolidWorks", "target_os_name": None, "status": "blocker", "analog_name": "КОМПАС-3D / T-Flex CAD", "is_blocker": True, "comment": "Нет нативной версии"},
    {"software_name": "КОМПАС-3D", "target_os_name": None, "status": "native_ready", "analog_name": "КОМПАС-3D Linux", "is_blocker": False, "comment": "Отечественная САПР"},
    {"software_name": "nanoCAD", "target_os_name": None, "status": "native_ready", "analog_name": "nanoCAD Linux", "is_blocker": False, "comment": "Отечественная САПР"},

    # Графика
    {"software_name": "Adobe Photoshop", "target_os_name": None, "status": "blocker", "analog_name": "GIMP / Krita", "is_blocker": True, "comment": "Прямых промышленных аналогов нет"},
    {"software_name": "Adobe Illustrator", "target_os_name": None, "status": "blocker", "analog_name": "Inkscape", "is_blocker": True, "comment": "Требуется переобучение"},
    {"software_name": "CorelDRAW", "target_os_name": None, "status": "alternative_available", "analog_name": "Inkscape / Scribus", "is_blocker": False, "comment": "OpenSource альтернативы"},
    {"software_name": "GIMP", "target_os_name": None, "status": "native_ready", "analog_name": "GIMP", "is_blocker": False, "comment": "Кроссплатформенная графика"},
    {"software_name": "Inkscape", "target_os_name": None, "status": "native_ready", "analog_name": "Inkscape", "is_blocker": False, "comment": "Кроссплатформенный векторный редактор"},
    {"software_name": "Krita", "target_os_name": None, "status": "native_ready", "analog_name": "Krita", "is_blocker": False, "comment": "Кроссплатформенная графика"},

    # Коммуникации
    {"software_name": "Microsoft Teams", "target_os_name": None, "status": "alternative_available", "analog_name": "VK WorkSpace / TrueConf", "is_blocker": False, "comment": "Отечественные мессенджеры"},
    {"software_name": "Skype for Business", "target_os_name": None, "status": "alternative_available", "analog_name": "Яндекс.Телемост / TrueConf", "is_blocker": False, "comment": "ВКС через отечественные платформы"},
    {"software_name": "Zoom", "target_os_name": None, "status": "alternative_available", "analog_name": "TrueConf / Яндекс.Телемост", "is_blocker": False, "comment": "Импортозамещение ВКС"},
    {"software_name": "Telegram Desktop", "target_os_name": None, "status": "native_ready", "analog_name": "Telegram Desktop", "is_blocker": False, "comment": "Кроссплатформенный"},
    {"software_name": "Slack", "target_os_name": None, "status": "web_alternative", "analog_name": "VK WorkSpace / веб-версия", "is_blocker": False, "comment": "Работает через браузер"},
    {"software_name": "VK WorkSpace", "target_os_name": None, "status": "native_ready", "analog_name": "VK WorkSpace", "is_blocker": False, "comment": "Отечественный мессенджер"},
    {"software_name": "TrueConf", "target_os_name": None, "status": "native_ready", "analog_name": "TrueConf", "is_blocker": False, "comment": "Отечественная ВКС"},

    # ИБ
    {"software_name": "КриптоПро CSP", "target_os_name": None, "status": "native_ready", "analog_name": "КриптоПро CSP Linux", "is_blocker": False, "comment": "Официальная Linux-версия"},
    {"software_name": "VipNet Client", "target_os_name": None, "status": "native_ready", "analog_name": "VipNet Client для Linux", "is_blocker": False, "comment": "Поддержка отечественных ОС"},
    {"software_name": "Kaspersky Endpoint Security", "target_os_name": None, "status": "native_ready", "analog_name": "KES для Linux", "is_blocker": False, "comment": "Сертифицированная защита"},
    {"software_name": "Dr.Web", "target_os_name": None, "status": "native_ready", "analog_name": "Dr.Web для Linux", "is_blocker": False, "comment": "Нативная антивирусная защита"},

    # Утилиты
    {"software_name": "WinRAR", "target_os_name": None, "status": "native_ready", "analog_name": "P7ZIP / встроенный архиватор", "is_blocker": False, "comment": "Полная совместимость форматов"},
    {"software_name": "7-Zip", "target_os_name": None, "status": "native_ready", "analog_name": "P7ZIP", "is_blocker": False, "comment": "Порт для Linux"},
    {"software_name": "Total Commander", "target_os_name": None, "status": "alternative_available", "analog_name": "Krusader / Midnight Commander", "is_blocker": False, "comment": "Двухпанельные менеджеры"},

    # Email
    {"software_name": "Microsoft Outlook", "target_os_name": None, "status": "alternative_available", "analog_name": "Thunderbird / Evolution", "is_blocker": False, "comment": "Совместимы с Exchange"},
    {"software_name": "Thunderbird", "target_os_name": None, "status": "native_ready", "analog_name": "Thunderbird", "is_blocker": False, "comment": "Официальная Linux-версия"},

    # Медиа
    {"software_name": "VLC Media Player", "target_os_name": None, "status": "native_ready", "analog_name": "VLC", "is_blocker": False, "comment": "Кроссплатформенный плеер"},
    {"software_name": "Windows Media Player", "target_os_name": None, "status": "alternative_available", "analog_name": "VLC / MPV", "is_blocker": False, "comment": "OpenSource альтернативы"},

    # Разработка
    {"software_name": "Visual Studio", "target_os_name": None, "status": "alternative_available", "analog_name": "VS Code / JetBrains IDEs", "is_blocker": False, "comment": "VS Code нативно поддерживает Linux"},
    {"software_name": "Visual Studio Code", "target_os_name": None, "status": "native_ready", "analog_name": "VS Code", "is_blocker": False, "comment": "Официальные .deb и .rpm"},
    {"software_name": "IntelliJ IDEA", "target_os_name": None, "status": "native_ready", "analog_name": "IntelliJ IDEA", "is_blocker": False, "comment": "Кроссплатформенная IDE"},
    {"software_name": "PyCharm", "target_os_name": None, "status": "native_ready", "analog_name": "PyCharm", "is_blocker": False, "comment": "Официальная поддержка Linux"},

    # БД
    {"software_name": "SQL Server Management Studio", "target_os_name": None, "status": "alternative_available", "analog_name": "Azure Data Studio / DBeaver", "is_blocker": False, "comment": "Azure Data Studio работает на Linux"},
    {"software_name": "DBeaver", "target_os_name": None, "status": "native_ready", "analog_name": "DBeaver", "is_blocker": False, "comment": "Универсальный клиент БД"},
    {"software_name": "pgAdmin", "target_os_name": None, "status": "native_ready", "analog_name": "pgAdmin", "is_blocker": False, "comment": "Веб-интерфейс и desktop"},

    # PDF
    {"software_name": "Adobe Acrobat Reader", "target_os_name": None, "status": "alternative_available", "analog_name": "Evince / Okular", "is_blocker": False, "comment": "Встроенные просмотрщики Linux"},
    {"software_name": "Foxit Reader", "target_os_name": None, "status": "alternative_available", "analog_name": "Evince / PDF Studio", "is_blocker": False, "comment": "OpenSource и коммерческие"},

    # Удалённый доступ
    {"software_name": "TeamViewer", "target_os_name": None, "status": "native_ready", "analog_name": "TeamViewer для Linux", "is_blocker": False, "comment": "Официальная Linux-версия"},
    {"software_name": "AnyDesk", "target_os_name": None, "status": "native_ready", "analog_name": "AnyDesk для Linux", "is_blocker": False, "comment": "Кроссплатформенная поддержка"},
    {"software_name": "RDP Client", "target_os_name": None, "status": "native_ready", "analog_name": "Remmina / FreeRDP", "is_blocker": False, "comment": "Нативные RDP-клиенты"},
]