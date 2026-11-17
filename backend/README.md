# ALROSA IT — Backend

Серверная часть сервиса оценки готовности рабочих мест к переходу
на отечественное ПО (Astra Linux, РЕД ОС, Альт, Rosa).

Backend принимает CSV/Excel с парком АРМ, сопоставляет железо и софт
с правилами совместимости, распределяет рабочие места по 3 волнам
миграции и отдаёт результаты на фронтенд.

---

## Что уже сделано

- **Модель данных** — 10 таблиц в PostgreSQL: справочники ОС и ПО,
  правила совместимости, сессии аудита, рабочие места, оценки,
  блокеры, подразделения, пользователи.
- **Миграции** — Alembic, схема версионируется, откат работает.
- **Скоринг** — парсинг CSV/Excel, применение критериев,
  определение блокирующих факторов, распределение по волнам.
- **REST API** — 11 эндпоинтов: справочники, аудиты, статистика.
- **Swagger** — автодокументация, доступна на `/docs`.
- **Аутентификация** — JWT (HS256), access + refresh, bcrypt.
- **Ролевая модель** — viewer / analyst / admin.
---

## Стек

| Технология | Роль |
|---|---|
| Python 3.11 | язык |
| FastAPI | веб-фреймворк |
| SQLAlchemy 2.0 | ORM |
| Pydantic v2 | валидация и схемы |
| PostgreSQL 16 | база данных |
| Alembic | миграции схемы |
| pandas, openpyxl | парсинг CSV/Excel |
| Docker Compose | запуск всего стека |
| pytest, httpx | тесты |
| python-jose, passlib |	JWT и bcrypt|
---

## Как запустить

Из **корня проекта** (`alrosa-it/`):

```bash
docker compose up -d --build
Поднимаются три контейнера:

alrosa_audit_db — PostgreSQL 16

alrosa_audit_backend — FastAPI на порту 8000

alrosa_audit_frontend — React + Nginx на порту 80

Адреса
Что	URL
Swagger (документация API)	http://localhost:8000/docs
Healthcheck	http://localhost:8000/health
OpenAPI-схема (для фронта)	http://localhost:8000/openapi.json
Frontend	http://localhost
Остановить / перезапустить
bash
docker compose down                # остановить
docker compose restart backend     # перезапустить только backend
docker compose logs backend -f     # смотреть логи в реальном времени
Структура backend
backend/
├── app/
│   ├── api/v1/          ← HTTP-эндпоинты
│   │   ├── audit.py
│   │   ├── catalog.py
│   │   ├── stats.py
│   │   ├── auth.py      [NEW]
│   │   ├── admin.py     [NEW]
│   │   ├── criteria.py  [NEW]
│   │   ├── rules.py
│   │   └── router.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py  [NEW] (JWT + bcrypt)
│   ├── dependencies/    [NEW]
│   │   └── auth.py      (get_current_user, RoleChecker)
│   ├── models/
│   │   └── criteria.py  [NEW]
│   ├── schemas/
│   │   ├── auth.py      [NEW]
│   │   └── criteria.py  [NEW]
│   ├── services/
│   │   ├── parser.py
│   │   └── scoring.py
│   ├── initial_data.py
│   ├── seed.py
│   └── main.py
├── alembic/
├── tests/
├── Dockerfile
├── alembic.ini
└── requirements.txt
Принцип слоёв:

api — только HTTP, вызывает сервисы.

services — бизнес-логика, работает с моделями.

models — структура БД.

schemas — что уходит наружу.

core — настройки и подключения.

Эндпоинты
Эндпоинты
Аутентификация
Метод	URL	Что
POST	/api/v1/auth/token	Получить токен (OAuth2 password flow)
POST	/api/v1/auth/refresh	Обновить access по refresh
GET	/api/v1/auth/me	Информация о текущем пользователе
[NEW] Админка (только admin)
Метод	URL	Что
GET	/api/v1/admin/users	Список пользователей
POST	/api/v1/admin/users	Создать пользователя
PATCH	/api/v1/admin/users/{id}/role	Сменить роль

Критерии
Метод	URL	Роль	Что
GET	/api/v1/criteria/weights	viewer+	Список весов
PUT	/api/v1/criteria/weights/{code}	analyst+	Изменить вес

Справочники
Метод	URL	Что возвращает
GET	/api/v1/catalog/os	список целевых ОС с требованиями
GET	/api/v1/catalog/os/{id}	одна ОС по id
GET	/api/v1/catalog/software	каталог ПО (фильтры: category, is_domestic)
GET	/api/v1/catalog/compatibility	матрица совместимости (фильтры: target_os_id, is_blocker)
Аудиты
Метод	URL	Что делает
POST	/api/v1/audit/upload	принимает CSV/Excel, скорит, сохраняет
GET	/api/v1/audit/latest	последняя сессия с полными АРМ
GET	/api/v1/audit/history	список всех сессий
GET	/api/v1/audit/history/{id}	детали конкретной сессии
Статистика
Метод	URL	Что возвращает
GET	/api/v1/stats/summary	сводка: всего/ready/upgrade/blocked + волны + отделы
GET	/api/v1/stats/by-department	количество АРМ по отделам
GET	/api/v1/stats/blockers	топ блокирующего ПО
GET	/api/v1/stats/waves	распределение по волнам
Системные
Метод	URL	Что
GET	/health	healthcheck
Логика скоринга
Логика скоринга
Каждое рабочее место получает сумму весов сработавших warning-критериев (Assessment.score):

Условие	Волна	Статус
Есть blocker (например, AutoCAD)	3	blocked
Сумма весов ≥ 30, блокеров нет	2	upgrade_required
Сумма весов < 30, блокеров нет	1	ready
Порог WAVE_2_SCORE_THRESHOLD = 30 — константа в scoring.py. Можно менять.

При дефолтных весах:

RAM=2 (вес 30) → волна 2

CPU=1 (вес 25) + Диск=20 (вес 20) → волна 2 (сумма 45)

CPU=1 (вес 25) только → волна 1 (25 < 30)


Каждое рабочее место получает статус и волну миграции:

Волна	Статус	Условие	Стратегия
1	ready	железо ок + нет блокеров	прямая миграция
2	upgrade_required	железо не тянет, софт ок	апгрейд RAM/SSD, потом миграция
3	blocked	есть блокирующее ПО	VDI / терминальный доступ
Железо сравнивается с требованиями целевой ОС:

ram_gb >= min_ram_gb

cpu_cores >= min_cpu_cores

disk_gb >= min_disk_gb

Софт проверяется по таблице compatibility_rules:

если is_blocker=True — АРМ попадает в волну 3;

статус правила: native_ready, alternative_available,
web_alternative, blocker.

Формат входного CSV
Колонки (обязательные):

text
workstation_id, department, ram_gb, cpu_cores, disk_gb, installed_software
Опциональные:

text
user_fullname, current_os
installed_software — список программ через ;.

Пример строки:

csv
WS-ALR-001,Служба главного механика,Иванов Н.М.,4,2,20,Telegram Desktop; Р-7 Офис; КриптоПро CSP
Готовый тестовый файл: alrosa_audit_100_workstations.csv в корне проекта.

Как загрузить — через Swagger:

Открыть http://localhost:8000/docs

Найти POST /api/v1/audit/upload

Нажать Try it out

Выбрать файл

target_os — оставить по умолчанию или выбрать другую ОС

Execute

База данных
Таблицы
Таблица	Что хранит
departments	подразделения (ГОКи, дирекции, экспедиции)
users	сотрудники с ролью и подразделением
operating_systems	целевые ОС и их аппаратные требования
software	каталог ПО (импортное и отечественное)
compatibility_rules	правила «ПО × ОС → статус + аналог + блокер»
audit_sessions	история загрузок CSV
workstations	АРМ в рамках сессии (снимок)
workstation_software	M:N: что установлено на АРМ
assessments	результат оценки АРМ (status, wave, issues)
assessment_blockers	блокирующие факторы (1:N от assessments)
Связи
Workstation — AuditSession (1:N), Assessment (1:1), Software (M:N)

Assessment — AssessmentBlocker (1:N)

CompatibilityRule — Software + OperatingSystem (N:1 + N:1)

Наполнение справочников
При старте backend автоматически:

Проверяет таблицы (создаются через Alembic).

Запускает seed_database() — идемпотентно наполняет
operating_systems, software, compatibility_rules.

Данные — из app/initial_data.py.

Повторный запуск seed не создаёт дубликатов.

Миграции (Alembic)
Схема БД версионируется. Base.metadata.create_all не используется —
всё через Alembic.

Применить миграции
bash
docker compose exec backend alembic upgrade head
Откатить одну
bash
docker compose exec backend alembic downgrade -1
Создать новую миграцию после изменения моделей
bash
docker compose exec backend alembic revision --autogenerate -m "add field X"
docker compose exec backend alembic upgrade head
Важно: после --autogenerate всегда проверяй файл в
alembic/versions/ перед upgrade. Alembic иногда неверно детектит
переименования.

Текущая версия
bash
docker compose exec backend alembic current
Тестовые данные
В корне проекта есть alrosa_audit_100_workstations.csv —
100 АРМ с реалистичным распределением по отделам АЛРОСА.

Ожидаемый результат скоринга (Astra Linux 1.7):

ready: 42

upgrade_required: 27

blocked: 31

Топ-5 блокирующего ПО:

SolidWorks (10)

AutoCAD (10)

SAP GUI (7)

Adobe Photoshop (7)

Adobe Illustrator (5)

CORS
Разрешены origins:

http://localhost

http://localhost:80

http://localhost:3000

http://127.0.0.1:3000

Настраивается в app/core/config.py → cors_origins.

Переменные окружения
Backend читает .env через pydantic-settings. Пример:

env
DATABASE_URL=postgresql+psycopg://audit_user:audit_password@db:5432/alrosa_audit
SQL_ECHO=false
SECRET_KEY=change-me-in-prod
В Docker переменные подставляются из docker-compose.yml.



Как это работает — по шагам
Шаг 1. Запуск
Когда backend стартует, он делает три вещи:

Проверяет базу данных — все ли таблицы на месте.

Заполняет справочники — заносит в базу список отечественных ОС, каталог программ и правила совместимости.

Ждёт запросы — открывает API, к которому обращаются фронтенд и пользователи.

Если ты остановишь и снова запустишь backend — он не создаст дубликатов. Справочники заполняются один раз, повторные запуски ничего не ломают.

Шаг 2. Пользователь загружает файл
Арти (фронтенд) делает форму: пользователь выбирает CSV или Excel с рабочими местами и нажимает «Загрузить».

Файл летит на backend по адресу POST /api/v1/audit/upload.

Шаг 3. Backend читает файл
Backend открывает файл и проверяет:

это CSV или Excel?

есть ли все нужные колонки?

Если чего-то не хватает — возвращает ошибку с понятным текстом. Если всё ок — идёт дальше.

Что в файле: для каждого компьютера указаны ID, подразделение, ФИО пользователя, сколько оперативной памяти, сколько ядер, сколько диска, и какие программы установлены.

Шаг 4. Backend берёт правила из базы
В базе лежат:

4 целевые ОС — Astra Linux, РЕД ОС, Альт, Rosa. У каждой свои требования: сколько минимум RAM, ядер, диска.

55 программ — импортные и отечественные.

220 правил совместимости — для каждой программы на каждой ОС указано: работает нативно, есть замена, доступно через браузер или это блокер.

Backend берёт правила той ОС, которую выбрал пользователь. Если выбрана Astra — берутся только правила для Astra.

Шаг 5. Backend оценивает каждый компьютер
Для каждого рабочего места из файла backend делает две проверки.

Проверка 1: железо.

Сравнивает характеристики компьютера с требованиями целевой ОС:

Память: у компьютера 4 ГБ, у Astra нужно 4 ГБ — ок.

Ядра: у компьютера 2, у Astra нужно 2 — ок.

Диск: у компьютера 20 ГБ, у Astra нужно 30 — не хватает.

Если что-то не дотягивает — это записывается в «проблемы с железом».

Проверка 2: программы.

Смотрит на список установленных программ и сверяет с правилами:

Программа есть в правилах, is_blocker = True → блокер.

Программа есть, но native_ready → всё ок.

Программы нет в правилах → игнорируется.

Например, если на компьютере AutoCAD — это блокер, потому что на Astra Linux его нет.

Шаг 6. Backend решает: какая волна
По результатам двух проверок компьютер попадает в одну из трёх волн:

Что нашли	Волна	Статус
Есть блокирующая программа	3	blocked — нельзя перевести без VDI
Блокеров нет, но железо не тянет	2	upgrade_required — сначала апгрейд
Всё чисто	1	ready — можно переводить
Это главная логика всего проекта. Три волны — три стратегии миграции.

Шаг 7. Backend сохраняет результат в базу
Backend не возвращает результат сразу и не забывает. Он сохраняет в базу:

Сессию аудита — что за файл, какая ОС, когда загружен.

Каждое рабочее место — с его характеристиками.

Оценку для каждого АРМ — статус, волна, проблемы.

Блокеры — какие программы помешали, с рекомендацией аналога.

Связи АРМ ↔ программы — что установлено на каждом компьютере.

Это значит: история сохраняется. Можно вернуться к любому аудиту через неделю или месяц.

Шаг 8. Backend возвращает ответ
В ответе на загрузку — сводка:

json
{
  "total": 100,
  "ready": 42,
  "upgrade_required": 27,
  "blocked": 31,
  "waves": {"wave_1": 42, "wave_2": 27, "wave_3": 31}
}
Плюс сам список из 100 АРМ с деталями.

Шаг 9. Фронтенд показывает дашборд
Арти берёт данные из backend и рисует:

Круговая диаграмма — сколько в каждой волне.

Столбчатая — распределение по отделам (ГОКи, экспедиции).

Топ блокеров — какие программы чаще всего мешают.

Таблица — все АРМ с фильтрами.

Для этого backend отдаёт четыре специальных эндпоинта статистики:

/stats/summary — общая сводка,

/stats/by-department — по отделам,

/stats/blockers — по блокерам,

/stats/waves — по волнам.

Что видит пользователь
Пользователь зашёл на сайт, выбрал файл, нажал «Загрузить». Через 2–3 секунды видит дашборд:

42 компьютера готовы к переходу прямо сейчас.

27 нужно сначала улучшить — купить память или SSD.

31 заблокирован — там стоит AutoCAD, Photoshop, SAP GUI. Их надо переводить через VDI или переучивать людей.

И рядом — список конкретных программ, которые мешают, с рекомендациями аналогов.

Что под капотом — но простыми словами
Слои приложения
Backend разделён на слои, как пирог:

API — принимает HTTP-запросы. Не знает, как устроена база.

Services — бизнес-логика: парсинг файла и скоринг.

Models — структура БД (10 таблиц).

Schemas — что уходит наружу (Pydantic).

Core — настройки и подключения.

Плюс такого разделения: если завтра поменяется формат файла — правишь только services/parser.py. Если добавятся новые поля в ответ — правишь только schemas/. Всё изолировано.

Миграции
Раньше таблицы создавались «на лету» через create_all. Сейчас этим управляет Alembic:

Каждое изменение схемы — отдельный файл-миграция в git.

Можно применить (upgrade) или откатить (downgrade).

В базе есть таблица alembic_version — она помнит, какая версия схемы применена.

Это стандарт для нормальных проектов. У тебя в задании это отдельным пунктом — выполнено.

Справочники
Не в коде, а в базе. Это важное архитектурное решение. Ты пишешь механизм (как применять правила), а содержимое (какие правила) лежит в БД. Если завтра появится новая отечественная ОС — просто добавляешь строку в initial_data.py и перезапускаешь backend. Не надо трогать код скоринга.

Идемпотентность
Все ключевые операции можно запускать повторно без последствий:

Seed — не создаёт дубликатов.

Scoring — каждое АРМ сохраняется со своим workstation_ext_id, повторная загрузка создаёт новую сессию (это правильно — аудит в мае и в сентябре разные).

Миграции — можно откатить и применить заново.

Что сделано, чего пока нет
Сделано:

✅ Модель данных из 10 таблиц.

✅ Миграции Alembic.

✅ Справочники (4 ОС, 55 программ, 220 правил).

✅ Скоринг с тремя волнами.

✅ 11 эндпоинтов API.

✅ Swagger-документация.

✅ Сохранение истории аудитов.

✅ Статистика для дашборда.

Не сделано (следующие шаги):

⏳ Авторизация — сейчас API открыт для всех, нужна ролевая модель.

⏳ Автотесты — код работает, но не покрыт тестами.

⏳ Экспорт отчётов в Excel/PDF.

Что это значит для команды
Для Арти (фронт):

Все данные — через http://localhost:8000/api/v1/*.

Swagger на /docs — там видны все эндпоинты, их параметры и примеры ответов.

Для дашборда — четыре готовых эндпоинта статистики.

Загрузка файла — POST /api/v1/audit/upload с multipart/form-data.

Для Лёхи (БД/DevOps):

Схема БД зафиксирована в миграциях.

alembic upgrade head — разворачивает схему с нуля.

seed наполняет справочники автоматически при старте.

Docker Compose поднимает всё одной командой.

[NEW] Аутентификация и роли
Первый вход
При старте backend автоматически создаётся дефолтный админ:

Email: admin@alrosa.ru

Пароль: admin123

⚠️ На проде сменить пароль!

Как получить токен
Открой http://localhost:8000/docs

POST /api/v1/auth/token → Try it out:

username: admin@alrosa.ru

password: admin123

Скопируй access_token из ответа.

Наверху Swagger нажми Authorize → введи логин/пароль (или токен) → Authorize.

Все защищённые эндпоинты теперь доступны.

[NEW] Роли
Роль	Что может
viewer	Только чтение: справочники, аудиты, статистика, критерии
analyst	+ загрузка CSV, изменение критериев, пользовательские правила
admin	+ управление пользователями (создание, смена роли)
[NEW] Создание пользователя (только admin)
POST /api/v1/admin/users:

json
{
  "email": "analyst@alrosa.ru",
  "password": "analyst123",
  "full_name": "Аналитик ИТ",
  "role": "analyst",
  "department_id": null
}
[NEW] Смена роли
PATCH /api/v1/admin/users/{id}/role:

json
{ "role": "admin" }
[NEW] Refresh-токен
POST /api/v1/auth/refresh:

json
{ "refresh_token": "eyJ..." }
Возвращает новый access_token (60 мин) и refresh_token (7 дней).

[NEW] Критерии с весами
Каждый критерий имеет вес и severity:

code	display_name	weight	severity
ram	Недостаточно ОЗУ	30	warning
cpu	Слабый CPU	25	warning
disk	Мало диска	20	warning
blocker_software	Блокирующее ПО	100	blocker
unknown_software	ПО без аналога	5	info
Логика
blocker — любое срабатывание → волна 3

warning — добавляет вес. Если сумма ≥ WAVE_2_SCORE_THRESHOLD (30) → волна 2

info — не влияет на волну, только для статистики

Управление весами
Метод	URL	Роль	Что делает
GET	/api/v1/criteria/weights	viewer+	Список весов
PUT	/api/v1/criteria/weights/{code}	analyst+	Изменить вес
Body для PUT:

json
{
  "weight": 50,
  "severity": "warning",
  "is_active": true
}
Что это даёт: аналитик меняет вес критерия через API — и при следующей загрузке CSV скоринг пересчитывается по новым правилам. Без релиза и правки кода.