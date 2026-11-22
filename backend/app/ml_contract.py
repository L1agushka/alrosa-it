"""Versioned feature contract shared by training and inference."""
FEATURE_COLUMNS = ["department", "ram_gb", "cpu_cores", "disk_gb",
    "installed_apps_count", "unsupported_apps_count", "has_crypto_tools",
    "has_cad_software", "has_thick_1c", "peripherals_count"]
FEATURE_LABELS = {
    "department": "Подразделение", "ram_gb": "Оперативная память",
    "cpu_cores": "Ядра процессора", "disk_gb": "Объём диска",
    "installed_apps_count": "Количество программ",
    "unsupported_apps_count": "Программы, требующие проверки",
    "has_crypto_tools": "Криптографическое ПО", "has_cad_software": "Инженерное ПО",
    "has_thick_1c": "Локальный клиент 1С", "peripherals_count": "Периферийные устройства",
}
SCHEMA_VERSION = 2
CAD_KEYS = ("autocad", "solidworks", "revit", "компас", "democad")
CRYPTO_KEYS = ("крипто", "crypto", "rutoken", "рутокен", "эцп", "csp")
RISK_THRESHOLDS = {"medium": 28.0, "high": 55.0}


def risk_level(percent):
    return "Высокий" if percent >= RISK_THRESHOLDS["high"] else "Умеренный" if percent >= RISK_THRESHOLDS["medium"] else "Низкий"
