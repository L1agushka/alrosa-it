import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    analyst = "analyst"
    viewer = "viewer"


class SoftwareCategory(str, enum.Enum):
    office = "office"
    browser = "browser"
    accounting = "accounting"
    cad = "cad"
    graphics = "graphics"
    communications = "communications"
    security = "security"
    utility = "utility"
    email = "email"
    media = "media"
    development = "development"
    database = "database"
    pdf = "pdf"
    remote_access = "remote_access"
    other = "other"


class CompatibilityStatus(str, enum.Enum):
    native_ready = "native_ready"           # нативно работает на целевой ОС
    alternative_available = "alternative_available"  # есть замена
    web_alternative = "web_alternative"     # доступно через браузер
    blocker = "blocker"                     # блокирует миграцию


class AssessmentStatus(str, enum.Enum):
    ready = "ready"
    upgrade_required = "upgrade_required"
    blocked = "blocked"


class BlockerSeverity(str, enum.Enum):
    hardware = "hardware"
    software = "software"
    os = "os"