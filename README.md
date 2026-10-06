Короче, кейс такой: делаем веб-приложуху, который показывает, готов ли компьютер к переходу на отечественное ПО. Он смотрит характеристики ПК, установленные программы и определяет, есть ли проблемы с переходом.
- Арти — фронт: делает сам сайт — таблицы, кнопки, фильтры, графики, чтобы всё это удобно отображалось.
- Вика — бэк: делает всю логику — принимает данные, проверяет совместимость и выдаёт результат: готов компьютер или нет и почему.
- Лёха — БД: делает базу данных, где будут храниться компьютеры, программы, требования, аналоги отечественного ПО и результаты проверок.
То есть совсем просто: Лёха хранит → Вика обрабатывает → Арти показывает.
# ALROSA IT — Система аудита готовности инфраструктуры к импортозамещению

[![CI/CD Pipeline](https://github.com/L1agushka/alrosa-it/actions/workflows/ci.yml/badge.svg)](https://github.com/L1agushka/alrosa-it/actions)
![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Ruff](https://img.shields.io/badge/Linter-Ruff-black)

Корпоративная платформа аудита и автоматизированного скоринга рабочих станций предприятия при переходе на доверенные отечественные операционные системы (Astra Linux Special Edition, РЕД ОС, РОСА Линукс, Альт Рабочая станция). 

Система обрабатывает выгрузки инвентаризации парка АРМ, валидирует аппаратные характеристики, сопоставляет установленный софт со справочником системных блокеров и автоматически распределяет парк по волнам миграции.

---

## 🧭 Ключевые возможности

- **Многокритериальный скоринг АРМ:** автоматическая классификация ПК по 3 волнам миграции на основе требований целевых ОС и каталога совместимости ПО.
- **Интерактивный дашборд:** сводная аналитика парка, диаграмма распределения готовности, выявление дефицита аппаратных ресурсов (RAM / CPU / Storage).
- **Реестр системных блокеров:** подсветка несовместимого проприетарного софта (САПР, бухгалтерские пакеты, графические редакторы) с рекомендацией отечественных аналогов из реестра Минцифры.
- **Хранение истории аудитов:** сохранение загруженных снапшотов парка в PostgreSQL с возможностью ретроспективного переключения.
- **CI/CD Quality Gate:** автоматический запуск тестов с контролем покрытия кода (`pytest-cov`), проверкой типов и строгим линтингом (`ruff`) в GitHub Actions.

---

## ⚙️ Логика распределения по волнам

Скоринг вычисляет статус каждой рабочей станции детерминированно:

| Волна | Статус | Критерии отбора | Стратегия перехода |
| :--- | :--- | :--- | :--- |
| **Волна 1** | `ready` | Железо удовлетворяет требованиям ОС; софт полностью совместим или имеет нативные Linux-версии. | Прямая миграция на выбранный дистрибутив. |
| **Волна 2** | `upgrade_required` | Отсутствуют блокеры по софту, но зафиксирован дефицит железа (RAM < Min, ядра CPU < Min, диск < Min). | Модернизация комплектующих (закупка RAM/SSD) с последующей установкой ОС. |
| **Волна 3** | `blocked` | Обнаружен софт со статусом блокера (`is_blocker = true`), не имеющий прямой нативной замены. | Перевод рабочего места на VDI / терминальный доступ к Windows-серверу или переобучение персонала. |

---

## 🚀 Быстрый старт (Production / Демо)

Для запуска полного комплекса требуется только установленный **Docker** и **Docker Compose**.

### 1. Клонирование репозитория
```bash
git clone git@github.com:L1agushka/alrosa-it.git
cd alrosa-it
2. Запуск контейнеров
Bash
docker compose up -d --build
После завершения сборки сервис доступен по адресам:

Web-интерфейс (Frontend): http://localhost (порт 80)

REST API Swagger (Backend): http://localhost:8000/docs

Healthcheck: http://localhost:8000/health

🛠️ Разработка и локальное подключение
Архитектура проекта
Plaintext
alrosa-it/
├── .github/workflows/ci.yml   # Автоматический пайплайн (тесты, линтер, сборка)
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI роуты и lifespan-инициализация
│   │   ├── models.py          # SQLAlchemy ORM-модели (AuditSession, Software, OS)
│   │   ├── database.py        # Подключение к PostgreSQL (psycopg3)
│   │   ├── services.py        # Бизнес-логика скоринга и парсинга отчетов
│   │   └── seed.py            # Наполнение справочников ПО и профилей ОС
│   ├── tests/                 # Модульные и интеграционные тесты
│   │   ├── conftest.py        # Фикстуры автосоздания тестовой БД
│   │   ├── test_scoring.py    # Тестирование логики 3 волн
│   │   └── test_api.py        # Тестирование API контрактов
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Основной компонент аналитического дашборда
│   │   ├── App.css            # Адаптивные темы и стилизация виджетов
│   │   └── ui.jsx             # UI-компоненты (Panel, StatusBadge, Count)
│   └── Dockerfile
└── docker-compose.yml
Подключение к разработке Backend
Создание виртуального окружения:

Bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install ruff pytest pytest-cov
Запуск базы данных для локальной разработки:

Bash
docker compose up -d db
Инициализация справочников базы:

Bash
python -c "from app.database import Base, engine, SessionLocal; from app.seed import seed_database; Base.metadata.create_all(bind=engine); db = SessionLocal(); seed_database(db); db.close(); print('Seed completed!')"
Запуск dev-сервера:

Bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
Запуск тестов и проверка качества
Перед каждым пушем код обязательно проверяется линтером и тестами:

Bash
# 1. Быстрая проверка синтаксиса и чистоты кода через Ruff
ruff check backend/app --select=E9,F63,F7,F82

# 2. Запуск тестов внутри Docker с расчетом покрытия строк
docker compose exec backend pytest --cov=app --cov-report=term-missing tests/
Тестовые данные
Для наполнения дашборда сгенерирован синтетический датасет на 100 АРМ:

Bash
# Файл находится в корне проекта
ls -la alrosa_audit_100_workstations.csv
Файл можно перетащить прямо в браузер для проверки работы фильтров и скоринга.


3. Сохрани файл:
   * В **nano**: нажми `Ctrl + O`, затем `Enter`, затем `Ctrl + X` для выхода.
   * В **VS Code**: `Ctrl + S`.

---

### Шаг 3. Закоммить и запушить

Теперь в терминале выполняем всего три короткие команды:

```bash
git add README.md
git commit -m "docs: enrich README with badges, quickstart, and development guide"
git push origin main
