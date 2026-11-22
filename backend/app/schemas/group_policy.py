from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, field_validator


class PolicySettings(BaseModel):
    model_config = ConfigDict(extra="forbid")
    minRam: int | None = Field(None, ge=0, le=4096)
    minCores: int | None = Field(None, ge=0, le=1024)
    minDisk: int | None = Field(None, ge=0, le=1048576)
    maxGap: int = Field(20, ge=0, le=100)
    weights: dict[str, int] = Field(default_factory=lambda: {
        "ram": 30, "cpu": 25, "disk": 20,
        "blocker_software": 100, "unknown_software": 5,
    })

    @field_validator("weights")
    @classmethod
    def validate_weights(cls, values):
        expected = {"ram", "cpu", "disk", "blocker_software", "unknown_software"}
        if set(values) != expected or any(not 0 <= v <= 100 for v in values.values()):
            raise ValueError("Нужны пять весов критериев в диапазоне 0–100")
        return values


class CustomRuleCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    pattern: str = Field(min_length=1, max_length=255)
    software_name: str = Field(min_length=1, max_length=255)
    category: str = Field(default="Прочее", max_length=255)
    status: Literal["blocker", "manual_check", "native_ready", "alternative",
                    "alternative_available", "non_target"] = "blocker"
    alternative: str = Field(default="Не применимо", max_length=500)
    note: str = Field(default="Зафиксировано аналитиком", max_length=1000)
    weight: int = Field(default=50, ge=0, le=100)
    severity: Literal["blocker", "warning", "info"] = "warning"

    @field_validator("pattern")
    @classmethod
    def normalize_pattern(cls, value):
        return value.lower()
