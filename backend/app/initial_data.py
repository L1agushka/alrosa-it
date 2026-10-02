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
    },
    {
        "name": "Альт 10 СП",
        "min_ram_gb": 2,
        "min_cpu_cores": 2,
        "min_disk_gb": 25,
    },
    {
        "name": "Rosa Enterprise Linux Desktop",
        "min_ram_gb": 4,
        "min_cpu_cores": 2,
        "min_disk_gb": 35,
    }
]

# Расширенная матрица совместимости ПО (на основе реестра Минцифры и практики)
INITIAL_SOFTWARE_RULES = [
    # Офисные пакеты
    {
        "name": "Microsoft Office 2016",
        "category": "Офисный пакет",
        "status": "alternative_available",
        "domestic_alternative": "Р-7 Офис",
        "is_blocker": False,
        "comment": "Полная совместимость форматов DOCX/XLSX"
    },
    {
        "name": "Microsoft Office 2019",
        "category": "Офисный пакет",
        "status": "alternative_available",
        "domestic_alternative": "МойОфис Стандартный",
        "is_blocker": False,
        "comment": "Штатная миграция документооборота"
    },
    {
        "name": "Microsoft Office 365",
        "category": "Офисный пакет",
        "status": "alternative_available",
        "domestic_alternative": "Р-7 Офис Облако",
        "is_blocker": False,
        "comment": "Облачная альтернатива с совместной работой"
    },
    {
        "name": "LibreOffice",
        "category": "Офисный пакет",
        "status": "native_ready",
        "domestic_alternative": "LibreOffice",
        "is_blocker": False,
        "comment": "Нативная поддержка в репозиториях всех дистрибутивов"
    },

    # Браузеры
    {
        "name": "Google Chrome",
        "category": "Браузер",
        "status": "alternative_available",
        "domestic_alternative": "Яндекс Браузер для бизнеса",
        "is_blocker": False,
        "comment": "ГОСТ-криптография, интеграция с Госуслугами"
    },
    {
        "name": "Mozilla Firefox",
        "category": "Браузер",
        "status": "native_ready",
        "domestic_alternative": "Firefox ESR",
        "is_blocker": False,
        "comment": "Официальные сборки для Linux"
    },
    {
        "name": "Microsoft Edge",
        "category": "Браузер",
        "status": "alternative_available",
        "domestic_alternative": "Chromium-GOST",
        "is_blocker": False,
        "comment": "Chromium с ГОСТ-шифрованием"
    },
    {
        "name": "Internet Explorer",
        "category": "Браузер",
        "status": "web_alternative",
        "domestic_alternative": "Доступ через терминал",
        "is_blocker": False,
        "comment": "Устаревший, миграция на современные браузеры"
    },

    # Учётные системы
    {
        "name": "1С:Предприятие 8.3",
        "category": "Учётные системы",
        "status": "native_ready",
        "domestic_alternative": "1С:Предприятие Linux-клиент",
        "is_blocker": False,
        "comment": "Полная поддержка .deb и .rpm пакетов"
    },
    {
        "name": "SAP GUI",
        "category": "Учётные системы",
        "status": "blocker",
        "domestic_alternative": "Веб-интерфейс SAP Fiori / VDI",
        "is_blocker": True,
        "comment": "Нативного клиента нет, требуется VDI или веб-доступ"
    },
    {
        "name": "Oracle E-Business Suite",
        "category": "Учётные системы",
        "status": "web_alternative",
        "domestic_alternative": "Веб-интерфейс",
        "is_blocker": False,
        "comment": "Доступ через браузер"
    },

    # САПР и инженерное ПО
    {
        "name": "AutoCAD",
        "category": "САПР",
        "status": "blocker",
        "domestic_alternative": "nanoCAD / Компас-3D",
        "is_blocker": True,
        "comment": "Критический блокер, требует переобучения и конвертации чертежей"
    },
    {
        "name": "SolidWorks",
        "category": "САПР",
        "status": "blocker",
        "domestic_alternative": "Компас-3D / T-Flex CAD",
        "is_blocker": True,
        "comment": "Нет нативной версии, миграция через виртуализацию"
    },
    {
        "name": "КОМПАС-3D",
        "category": "САПР",
        "status": "native_ready",
        "domestic_alternative": "КОМПАС-3D Linux",
        "is_blocker": False,
        "comment": "Отечественная САПР с нативной поддержкой Linux"
    },
    {
        "name": "nanoCAD",
        "category": "САПР",
        "status": "native_ready",
        "domestic_alternative": "nanoCAD Linux",
        "is_blocker": False,
        "comment": "Импортозамещённая альтернатива AutoCAD"
    },

    # Графика и дизайн
    {
        "name": "Adobe Photoshop",
        "category": "Графика",
        "status": "blocker",
        "domestic_alternative": "GIMP / Krita",
        "is_blocker": True,
        "comment": "Прямых промышленных аналогов нет, миграция через VDI"
    },
    {
        "name": "Adobe Illustrator",
        "category": "Графика",
        "status": "blocker",
        "domestic_alternative": "Inkscape",
        "is_blocker": True,
        "comment": "Требуется переобучение дизайнеров"
    },
    {
        "name": "CorelDRAW",
        "category": "Графика",
        "status": "alternative_available",
        "domestic_alternative": "Inkscape / Scribus",
        "is_blocker": False,
        "comment": "OpenSource альтернативы доступны"
    },
    {
        "name": "GIMP",
        "category": "Графика",
        "status": "native_ready",
        "domestic_alternative": "GIMP",
        "is_blocker": False,
        "comment": "Нативная кроссплатформенная графика"
    },

    # Коммуникации
    {
        "name": "Microsoft Teams",
        "category": "Коммуникации",
        "status": "alternative_available",
        "domestic_alternative": "VK WorkSpace / TrueConf",
        "is_blocker": False,
        "comment": "Отечественные корпоративные мессенджеры"
    },
    {
        "name": "Skype for Business",
        "category": "Коммуникации",
        "status": "alternative_available",
        "domestic_alternative": "Яндекс.Телемост / TrueConf",
        "is_blocker": False,
        "comment": "Видеоконференцсвязь через отечественные платформы"
    },
    {
        "name": "Zoom",
        "category": "Коммуникации",
        "status": "alternative_available",
        "domestic_alternative": "TrueConf / Яндекс.Телемост",
        "is_blocker": False,
        "comment": "Импортозамещение ВКС"
    },
    {
        "name": "Telegram Desktop",
        "category": "Коммуникации",
        "status": "native_ready",
        "domestic_alternative": "Telegram Desktop",
        "is_blocker": False,
        "comment": "Полная кроссплатформенность"
    },
    {
        "name": "Slack",
        "category": "Коммуникации",
        "status": "web_alternative",
        "domestic_alternative": "VK WorkSpace / Веб-версия",
        "is_blocker": False,
        "comment": "Работает через браузер"
    },

    # Информационная безопасность
    {
        "name": "КриптоПро CSP",
        "category": "Информационная безопасность",
        "status": "native_ready",
        "domestic_alternative": "КриптоПро CSP Linux",
        "is_blocker": False,
        "comment": "Официальная Linux-версия с ядерными модулями"
    },
    {
        "name": "VipNet Client",
        "category": "Информационная безопасность",
        "status": "native_ready",
        "domestic_alternative": "VipNet Client для Linux",
        "is_blocker": False,
        "comment": "Поддержка отечественных ОС"
    },
    {
        "name": "Kaspersky Endpoint Security",
        "category": "Информационная безопасность",
        "status": "native_ready",
        "domestic_alternative": "Kaspersky Endpoint Security для Linux",
        "is_blocker": False,
        "comment": "Сертифицированная защита для отечественных ОС"
    },
    {
        "name": "Dr.Web",
        "category": "Информационная безопасность",
        "status": "native_ready",
        "domestic_alternative": "Dr.Web для Linux",
        "is_blocker": False,
        "comment": "Нативная антивирусная защита"
    },

    # Архиваторы и утилиты
    {
        "name": "WinRAR",
        "category": "Утилиты",
        "status": "native_ready",
        "domestic_alternative": "P7ZIP / встроенный архиватор",
        "is_blocker": False,
        "comment": "Полная совместимость форматов"
    },
    {
        "name": "7-Zip",
        "category": "Утилиты",
        "status": "native_ready",
        "domestic_alternative": "P7ZIP",
        "is_blocker": False,
        "comment": "Порт для Linux в репозиториях"
    },
    {
        "name": "Total Commander",
        "category": "Утилиты",
        "status": "alternative_available",
        "domestic_alternative": "Krusader / Midnight Commander",
        "is_blocker": False,
        "comment": "Двухпанельные файловые менеджеры"
    },

    # Email клиенты
    {
        "name": "Microsoft Outlook",
        "category": "Email",
        "status": "alternative_available",
        "domestic_alternative": "Thunderbird / Evolution",
        "is_blocker": False,
        "comment": "Совместимы с Exchange через протоколы"
    },
    {
        "name": "Thunderbird",
        "category": "Email",
        "status": "native_ready",
        "domestic_alternative": "Thunderbird",
        "is_blocker": False,
        "comment": "Официальная Linux-версия"
    },

    # Видео и медиа
    {
        "name": "VLC Media Player",
        "category": "Медиа",
        "status": "native_ready",
        "domestic_alternative": "VLC",
        "is_blocker": False,
        "comment": "Кроссплатформенный видеоплеер"
    },
    {
        "name": "Windows Media Player",
        "category": "Медиа",
        "status": "alternative_available",
        "domestic_alternative": "VLC / MPV",
        "is_blocker": False,
        "comment": "OpenSource альтернативы"
    },

    # Разработка
    {
        "name": "Visual Studio",
        "category": "Разработка",
        "status": "alternative_available",
        "domestic_alternative": "VS Code / JetBrains IDEs",
        "is_blocker": False,
        "comment": "VS Code нативно поддерживает Linux"
    },
    {
        "name": "Visual Studio Code",
        "category": "Разработка",
        "status": "native_ready",
        "domestic_alternative": "VS Code",
        "is_blocker": False,
        "comment": "Официальные .deb и .rpm пакеты"
    },
    {
        "name": "IntelliJ IDEA",
        "category": "Разработка",
        "status": "native_ready",
        "domestic_alternative": "IntelliJ IDEA",
        "is_blocker": False,
        "comment": "Кроссплатформенная Java IDE"
    },
    {
        "name": "PyCharm",
        "category": "Разработка",
        "status": "native_ready",
        "domestic_alternative": "PyCharm",
        "is_blocker": False,
        "comment": "Официальная поддержка Linux"
    },

    # Базы данных (клиенты)
    {
        "name": "SQL Server Management Studio",
        "category": "Базы данных",
        "status": "alternative_available",
        "domestic_alternative": "Azure Data Studio / DBeaver",
        "is_blocker": False,
        "comment": "Azure Data Studio работает на Linux"
    },
    {
        "name": "DBeaver",
        "category": "Базы данных",
        "status": "native_ready",
        "domestic_alternative": "DBeaver",
        "is_blocker": False,
        "comment": "Универсальный клиент БД для Linux"
    },
    {
        "name": "pgAdmin",
        "category": "Базы данных",
        "status": "native_ready",
        "domestic_alternative": "pgAdmin",
        "is_blocker": False,
        "comment": "Веб-интерфейс и desktop-клиент"
    },

    # PDF и документы
    {
        "name": "Adobe Acrobat Reader",
        "category": "PDF",
        "status": "alternative_available",
        "domestic_alternative": "Evince / Okular",
        "is_blocker": False,
        "comment": "Встроенные PDF-просмотрщики Linux"
    },
    {
        "name": "Foxit Reader",
        "category": "PDF",
        "status": "alternative_available",
        "domestic_alternative": "Evince / PDF Studio",
        "is_blocker": False,
        "comment": "OpenSource и коммерческие альтернативы"
    },

    # Удалённый доступ
    {
        "name": "TeamViewer",
        "category": "Удалённый доступ",
        "status": "native_ready",
        "domestic_alternative": "TeamViewer для Linux",
        "is_blocker": False,
        "comment": "Официальная Linux-версия"
    },
    {
        "name": "AnyDesk",
        "category": "Удалённый доступ",
        "status": "native_ready",
        "domestic_alternative": "AnyDesk для Linux",
        "is_blocker": False,
        "comment": "Кроссплатформенная поддержка"
    },
    {
        "name": "RDP Client",
        "category": "Удалённый доступ",
        "status": "native_ready",
        "domestic_alternative": "Remmina / FreeRDP",
        "is_blocker": False,
        "comment": "Нативные RDP-клиенты"
    }
]
