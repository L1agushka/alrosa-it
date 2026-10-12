import urllib.request
import json
import re
from rapidfuzz import process, fuzz

OLLAMA_URL = "http://ollama:11434/api/chat"
MODEL_NAME = "qwen2.5:1.5b"

ENTERPRISE_TAXONOMY = {
    "media_streaming": {
        "category": "Мультимедиа, стриминг и аудио/видео",
        "status": "alternative_available",
        "alt_fallback": "Яндекс Музыка / VK Видео / RuTube",
        "policy": "Нецелевой мультимедиа ресурс. Рекомендован переход на отечественные стриминговые сервисы."
    },
    "browsers": {
        "category": "Веб-браузеры и интернет-клиенты",
        "status": "alternative_available",
        "alt_fallback": "Яндекс Браузер Корпоративный / Chromium-Gost",
        "policy": "Замена зарубежных браузеров на отечественный Яндекс Браузер с поддержкой ГОСТ-криптографии."
    },
    "cad": {
        "category": "САПР и инженерное проектирование (CAD/BIM)",
        "status": "blocker",
        "alt_fallback": "nanoCAD Платформа / КОМПАС-3D v22 / Renga BIM",
        "policy": "Критический блокер миграции. Требуется лицензия nanoCAD или КОМПАС-3D."
    },
    "graphics": {
        "category": "Графические редакторы, 3D и дизайн",
        "status": "alternative_available",
        "alt_fallback": "GIMP / Krita / Inkscape / Blender",
        "policy": "Замена на свободные пакеты GIMP, Krita или Blender из репозитория Astra Linux."
    },
    "ai_llm": {
        "category": "Искусственный интеллект и генеративные модели (LLM)",
        "status": "manual_check",
        "alt_fallback": "GigaChat / YandexGPT / локальные LLM в контуре компании",
        "policy": "Облачный сервис ИИ. Требуется согласование контура данных с ИБ."
    },
    "dev_tools": {
        "category": "Среды разработки, компиляторы и SDK",
        "status": "native_ready",
        "alt_fallback": "Axiom JDK (сертифицирована ФСТЭК) / OpenJDK / GCC / Clang",
        "policy": "Нативно поддерживается в репозиториях Astra Linux SE."
    },
    "network_admin": {
        "category": "Сетевой анализ, диагностика и системные утилиты",
        "status": "native_ready",
        "alt_fallback": "Wireshark for Linux / Fly-Term / tcpdump",
        "policy": "Нативно поддерживается в Astra Linux SE."
    },
    "communication": {
        "category": "Корпоративные коммуникации и мессенджеры",
        "status": "manual_check",
        "alt_fallback": "VK Teams / TrueConf / Яндекс Телемост / IVA MCU",
        "policy": "Запрещено использование неконтролируемых мессенджеров. Перевод в контур компании."
    },
    "office": {
        "category": "Офисные пакеты и работа с документами",
        "status": "alternative_available",
        "alt_fallback": "МойОфис Стандартный / Р-7 Офис",
        "policy": "Штатная замена на отечественный офисный пакет МойОфис."
    },
    "remote_access": {
        "category": "Удаленный доступ и администрирование",
        "status": "blocker",
        "alt_fallback": "RuDesktop / Ассистент / Remmina / PuTTY",
        "policy": "Запрещен зарубежный удаленный доступ. Перевод на RuDesktop или нативный SSH."
    },
    "server_db": {
        "category": "Серверное ПО, СУБД и виртуализация",
        "status": "native_ready",
        "alt_fallback": "PostgreSQL 1C / Nginx / Docker / Redis (в репозитории Astra Linux)",
        "policy": "Нативно поддерживается в Astra Linux SE."
    },
    "screen_capture": {
        "category": "Утилиты захвата экрана и скриншотеры",
        "status": "alternative_available",
        "alt_fallback": "Fly-Screenshot (штатно в Astra Linux) / Flameshot",
        "policy": "Замена на встроенную утилиту рабочего стола Fly или пакет Flameshot."
    },
    "other_software": {
        "category": "Специализированное отраслевое ПО",
        "status": "manual_check",
        "alt_fallback": "Индивидуальный аудит совместимости с вендором",
        "policy": "Требуется проверка функционирования под Astra Linux."
    }
}

SOFTWARE_REGISTRY = {
    # Стриминг и видео
    "споти": ("Spotify", "media_streaming"),
    "спотифай": ("Spotify", "media_streaming"),
    "spoti": ("Spotify", "media_streaming"),
    "spotify": ("Spotify", "media_streaming"),
    "ютуб": ("YouTube", "media_streaming"),
    "youtube": ("YouTube", "media_streaming"),
    "рутуб": ("RuTube", "media_streaming"),
    "rutube": ("RuTube", "media_streaming"),
    "яндекс музыка": ("Яндекс Музыка", "media_streaming"),

    # Браузеры и интернет
    "хром": ("Google Chrome", "browsers"),
    "chrome": ("Google Chrome", "browsers"),
    "яндекс браузер": ("Яндекс Браузер", "browsers"),
    "yandex browser": ("Яндекс Браузер", "browsers"),
    "firefox": ("Mozilla Firefox", "browsers"),

    # САПР
    "автокад": ("AutoCAD", "cad"),
    "autocad": ("AutoCAD", "cad"),
    "autocadd": ("AutoCAD", "cad"),
    "компас 3д": ("КОМПАС-3D", "cad"),
    "компас 3d": ("КОМПАС-3D", "cad"),
    "solidworks": ("SolidWorks", "cad"),
    "nanocad": ("nanoCAD", "cad"),

    # Офис
    "эксель": ("Microsoft Excel", "office"),
    "exel": ("Microsoft Excel", "office"),
    "excel": ("Microsoft Excel", "office"),
    "ворд": ("Microsoft Word", "office"),
    "word": ("Microsoft Word", "office"),
    "calculator": ("Calculator", "office"),
    "калькулятор": ("Calculator", "office"),

    # Графика и 3D
    "фш": ("Adobe Photoshop", "graphics"),
    "фотошоп": ("Adobe Photoshop", "graphics"),
    "photoshop": ("Adobe Photoshop", "graphics"),
    "photoshp": ("Adobe Photoshop", "graphics"),
    "блендер": ("Blender", "graphics"),
    "blender": ("Blender", "graphics"),
    "gimp": ("GIMP", "graphics"),

    # Разработка и SDK
    "питон": ("Python", "dev_tools"),
    "python": ("Python", "dev_tools"),
    "джава": ("Java Development Kit (JDK)", "dev_tools"),
    "jdk": ("Java Development Kit (JDK)", "dev_tools"),
    "vscode": ("Visual Studio Code", "dev_tools"),
    "саблайм": ("Sublime Text", "dev_tools"),
    "sublime text": ("Sublime Text", "dev_tools"),
    "постман": ("Postman", "dev_tools"),
    "postman": ("Postman", "dev_tools"),

    # Сети и Системные
    "ваершарк": ("Wireshark", "network_admin"),
    "wireshark": ("Wireshark", "network_admin"),
    "wiresharkk": ("Wireshark", "network_admin"),

    # Серверы и БД
    "дбивер": ("DBeaver", "server_db"),
    "dbeaver": ("DBeaver", "server_db"),
    "nginx": ("Nginx", "server_db"),
    "docker": ("Docker", "server_db"),

    # Связь и Мессенджеры
    "телега": ("Telegram", "communication"),
    "телеграм": ("Telegram", "communication"),
    "telegram": ("Telegram", "communication"),
    "slack": ("Slack", "communication"),
    "discord": ("Discord", "communication"),
    "дискорд": ("Discord", "communication"),

    # ИИ
    "джемини": ("Google Gemini", "ai_llm"),
    "gemini": ("Google Gemini", "ai_llm"),
    "gemeni": ("Google Gemini", "ai_llm"),
    "chatgpt": ("ChatGPT", "ai_llm")
}

# Промпт с цепочкой рассуждений (reasoning-first)
DISCOVERY_SYSTEM_PROMPT = """You are an IT software and digital service auditor.
Analyze the user query:

CLASSIFICATION RULES:
1. DIGITAL & SOFTWARE ENTITIES (is_software: true):
   - Any digital software, desktop application, mobile app, CLI tool, library, DBMS, or game engine.
   - Any web platform, digital ecosystem, search engine, student or enterprise portal (e.g. "YourNeti", "Dispace", "Yandex", "Google", "Moodle", "Bitrix").
2. PHYSICAL REAL-WORLD OBJECTS (is_software: false):
   - Only physical matter: animals (dog, cat, monkey, bird), food, fruits, cars, appliances, cities, planets, humans.

IMPORTANT: Always explain what the query is in "reason" FIRST, and THEN determine "is_software".

OUTPUT STRICT JSON:
{
  "reason": "1-sentence definition of what this entity is",
  "is_software": true or false,
  "canonical_name": "Official Title",
  "category": "one of: media_streaming, browsers, cad, graphics, ai_llm, dev_tools, network_admin, communication, office, remote_access, server_db, other_software"
}"""

ANALOGUE_PROMPT = """You are an expert in the Russian Software Registry (Реестр отечественного ПО Минцифры РФ) and Astra Linux enterprise migration.
Given a software or digital service title, provide 1 to 3 leading Russian software analogues.

EXAMPLES:
- Spotify -> Яндекс Музыка / VK Музыка / Звук
- YouTube -> RuTube / VK Видео
- Adobe Photoshop -> GIMP / Krita / AliveColors
- Microsoft Excel -> МойОфис Таблица / Р-7 Офис
- Yandex -> Отечественная цифровая экосистема / Яндекс Браузер
- YourNeti / Dispace / Portals -> Внутренний корпоративный портал / 1С-Битрикс
- PostgreSQL / DBeaver -> Tantor SE / Jatoba / Postgres Pro

Output STRICT JSON:
{"domestic_alt": "Аналог 1 / Аналог 2"}"""

class QwenEnterpriseClassifier:
    def __init__(self):
        self.choices = list(SOFTWARE_REGISTRY.keys())

    def clean_query(self, s: str) -> str:
        s = s.strip()
        s = re.sub(r"\.(exe|msi|deb|rpm|zip|tar\.gz)$", "", s, flags=re.IGNORECASE)
        s = re.sub(r"[\-_]", " ", s)
        s = re.sub(r"\b(x64|x86|win64|setup|installer|release|v?\d+(\.\d+)*)\b", "", s, flags=re.IGNORECASE)
        return s.strip()

    def generate_russian_analogue(self, software_name: str, category_name: str, fallback_alt: str) -> str:
        payload = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": ANALOGUE_PROMPT},
                {"role": "user", "content": f'Software: "{software_name}", Category: "{category_name}"'}
            ],
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 60}
        }
        try:
            req = urllib.request.Request(
                OLLAMA_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                if resp.status == 200:
                    body = json.loads(resp.read().decode("utf-8"))
                    res = json.loads(body.get("message", {}).get("content", "{}"))
                    alt = res.get("domestic_alt", "").strip()
                    if alt and len(alt) >= 3:
                        return alt
        except Exception:
            pass
        return fallback_alt

    def query_qwen_discovery(self, query: str) -> dict:
        payload = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": DISCOVERY_SYSTEM_PROMPT},
                {"role": "user", "content": f'Evaluate query: "{query}"'}
            ],
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.0, "num_predict": 120}
        }
        try:
            req = urllib.request.Request(
                OLLAMA_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=8.0) as resp:
                if resp.status == 200:
                    body = json.loads(resp.read().decode("utf-8"))
                    return json.loads(body.get("message", {}).get("content", "{}"))
        except Exception as e:
            print(f"[AI Discovery Error] {e}")
        return {}

    def match(self, raw_input: str, candidate_desc: str = None, custom_rules: list = None) -> dict:
        if not raw_input or not raw_input.strip():
            return {"matched": False, "is_software": False}

        raw = raw_input.strip()
        cleaned = self.clean_query(raw).lower()

        # 0. Приоритет №0: корпоративные политики компании
        if custom_rules:
            for rule in custom_rules:
                pat = (rule.get("pattern") or rule.get("software_name", "")).lower()
                if pat and (pat in raw.lower() or pat in cleaned):
                    sw_name = rule.get("software_name", raw)
                    category = rule.get("category", "Пользовательская политика")
                    status = rule.get("status", "blocker")
                    alt = rule.get("alternative", "Регламент безопасности")
                    note = rule.get("note", "Зафиксировано корпоративной политикой АЛРОСА")
                    return {
                        "matched": True,
                        "is_software": True,
                        "raw_input": raw,
                        "normalized_name": sw_name,
                        "category": category,
                        "status": status,
                        "domestic_alt": alt,
                        "policy": note,
                        "cosine_similarity": 1.0,
                        "confidence_pct": 100.0,
                        "method": "🛡 Корпоративная политика АЛРОСА",
                        "summary": f"{sw_name}: {note}",
                        "candidates": [{
                            "label": sw_name,
                            "description": note,
                            "category": category,
                            "status": status,
                            "domestic_alt": alt,
                            "is_software": True
                        }]
                    }

        # 1. Fast-Path через RapidFuzz
        match_result = process.extractOne(
            cleaned,
            self.choices,
            scorer=fuzz.ratio,
            score_cutoff=75.0
        )

        if not match_result and len(cleaned.split()) > 1:
            match_result = process.extractOne(
                cleaned,
                self.choices,
                scorer=fuzz.token_sort_ratio,
                score_cutoff=80.0
            )

        if match_result:
            matched_key, score, _ = match_result
            canonical_name, cat_key = SOFTWARE_REGISTRY[matched_key]
            tax = ENTERPRISE_TAXONOMY.get(cat_key, ENTERPRISE_TAXONOMY["other_software"])
            dynamic_alt = self.generate_russian_analogue(canonical_name, tax["category"], tax["alt_fallback"])

            candidate_card = {
                "label": canonical_name,
                "description": tax["policy"],
                "category": tax["category"],
                "status": tax["status"],
                "domestic_alt": dynamic_alt,
                "is_software": True
            }

            return {
                "matched": True,
                "is_software": True,
                "raw_input": raw,
                "normalized_name": canonical_name,
                "category": tax["category"],
                "status": tax["status"],
                "domestic_alt": dynamic_alt,
                "policy": tax["policy"],
                "cosine_similarity": round(score / 100.0, 2),
                "confidence_pct": round(score, 1),
                "method": "⚡ RapidFuzz Fast-Path",
                "summary": f"Идентифицировано как {canonical_name} (совпадение {int(score)}%).",
                "candidates": [candidate_card]
            }

        # 2. AI Discovery: чистое решение нейросети (без регулярок)
        ai_res = self.query_qwen_discovery(cleaned)
        is_sw = bool(ai_res.get("is_software", False))
        raw_cat = ai_res.get("category", "other_software")
        canon_name = ai_res.get("canonical_name") or raw
        reason = ai_res.get("reason", "")

        if is_sw:
            cat_key = raw_cat if raw_cat in ENTERPRISE_TAXONOMY else "other_software"
            tax = ENTERPRISE_TAXONOMY[cat_key]
            dynamic_alt = self.generate_russian_analogue(canon_name, tax["category"], tax["alt_fallback"])

            candidate_card = {
                "label": canon_name,
                "description": tax["policy"],
                "category": tax["category"],
                "status": tax["status"],
                "domestic_alt": dynamic_alt,
                "is_software": True
            }
            return {
                "matched": True,
                "is_software": True,
                "raw_input": raw,
                "normalized_name": canon_name,
                "category": tax["category"],
                "status": tax["status"],
                "domestic_alt": dynamic_alt,
                "policy": tax["policy"],
                "cosine_similarity": 0.95,
                "confidence_pct": 95.0,
                "method": f"🧠 {MODEL_NAME} AI Discovery",
                "summary": f"{canon_name}: {reason or 'Обнаружено ПО/сервис'}",
                "candidates": [candidate_card]
            }
        else:
            return {
                "matched": False,
                "is_software": False,
                "raw_input": raw,
                "normalized_name": raw,
                "category": "Не является программным обеспечением",
                "status": "invalid_entity",
                "domestic_alt": "Не применимо",
                "policy": "Объект отклонен как непрограммная сущность.",
                "cosine_similarity": 0.0,
                "confidence_pct": 0.0,
                "method": f"🧠 {MODEL_NAME} AI Discovery",
                "summary": reason or f"Сущность '{raw}' не является программным обеспечением.",
                "candidates": []
            }

nlp_matcher = QwenEnterpriseClassifier()
