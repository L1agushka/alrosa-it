import csv
import random

random.seed(42)
N = 2500

first_names = ["Алексей", "Дмитрий", "Сергей", "Андрей", "Михаил", "Иван", "Артем", "Максим", "Евгений", "Роман",
               "Елена", "Ольга", "Анна", "Татьяна", "Наталья", "Ирина", "Светлана", "Мария", "Екатерина", "Юлия"]
last_names = ["Иванов", "Смирнов", "Кузнецов", "Попов", "Васильев", "Петров", "Соколов", "Михайлов", "Новиков", "Федоров",
              "Морозов", "Волков", "Алексеев", "Лебедев", "Семенов", "Егоров", "Павлов", "Козлов", "Степанов", "Николаев"]

departments = [
    ("Управление информационных технологий", 360),
    ("Бухгалтерия и финансовый контроль", 480),
    ("Служба главного механика", 370),
    ("Логистика, склады и снабжение", 360),
    ("Отдел кадров и делопроизводства", 340),
    ("Геологоразведочная партия", 300),
    ("Юридический департамент", 290),
]

# Формируем пул отделов с точным количеством
dept_pool = []
for d_name, count in departments:
    dept_pool.extend([d_name] * count)
random.shuffle(dept_pool)

rows = []

for i in range(1, N + 1):
    ws_id = f"WS-ALR-{i:04d}"
    f_name = random.choice(first_names)
    l_name = random.choice(last_names)
    if f_name.endswith("а") or f_name.endswith("я"):
        l_name += "а"
    user_name = f"{l_name} {f_name}"
    
    dept = dept_pool[i - 1]

    # --- 1. РАСПРЕДЕЛЕНИЕ ОБОРУДОВАНИЯ С ЕСТЕСТВЕННЫМ РАЗБРОСОМ ---
    # Базовые шансы: 2GB (5%), 4GB (20%), 8GB (45%), 16GB (25%), 32GB (5%)
    # Но в тяжелых отделах сдвигаем вправо, на складах - влево
    if "ИТ" in dept or "Геолог" in dept:
        ram = random.choices([4, 8, 16, 32], weights=[5, 25, 55, 15])[0]
        cores = random.choices([2, 4, 6, 8], weights=[5, 30, 45, 20])[0]
        disk = random.choice([256, 512, 1024])
    elif "Склад" in dept or "Логистика" in dept:
        ram = random.choices([2, 4, 8, 16], weights=[20, 45, 30, 5])[0]
        cores = random.choices([2, 4], weights=[60, 40])[0]
        disk = random.choice([120, 240, 500])
    elif "механика" in dept:
        ram = random.choices([4, 8, 16, 32], weights=[10, 40, 40, 10])[0]
        cores = random.choices([2, 4, 6, 8], weights=[10, 50, 30, 10])[0]
        disk = random.choice([240, 500, 1024])
    else: # Бухгалтерия, Кадры, Юристы
        ram = random.choices([2, 4, 8, 16], weights=[5, 30, 55, 10])[0]
        cores = random.choices([2, 4, 6], weights=[25, 65, 10])[0]
        disk = random.choice([120, 240, 500])

    # --- 2. СБОРКА НАБОРА ПО С ПРИМЕСЯМИ В КАЖДОМ ОТДЕЛЕ ---
    apps = set()
    
    # Общесистемный базовый софт
    apps.add(random.choice(["Яндекс Браузер", "Chromium-GOST", "Google Chrome", "Mozilla Firefox"]))
    apps.add(random.choice(["7-Zip", "WinRAR"]))

    # Офисный стек (у кого-то нативный, у кого-то Windows/MS)
    office_variant = random.choices(
        ["МойОфис Стандартный", "Р-7 Офис", "Microsoft Office 2016", "Microsoft Office 2019", "LibreOffice"],
        weights=[30, 25, 20, 20, 5]
    )[0]
    apps.add(office_variant)
    if "Microsoft" in office_variant and random.random() < 0.6:
        apps.add("Microsoft Outlook")

    # Специфика подразделения + шум/аномалии
    if "ИТ" in dept:
        # 75% нативный dev-стек, но 25% софта с проблемами или блокерами
        apps.add(random.choice(["Visual Studio Code", "DBeaver", "pgAdmin"]))
        if random.random() < 0.15:
            apps.add("Visual Studio") # Альтернатива/проблема
        if random.random() < 0.10:
            apps.add("AutoCAD") # Админ САПРа / сетевик
        if random.random() < 0.20:
            apps.add("Total Commander")
        if random.random() < 0.25:
            apps.add("Telegram Desktop")

    elif "механика" in dept:
        # Часть чертит в AutoCAD, часть в отечественном КОМПАС/nanoCAD, часть учетчики
        sub_type = random.choices(["cad_hard", "cad_native", "shop_floor"], weights=[40, 35, 25])[0]
        if sub_type == "cad_hard":
            apps.add("AutoCAD")
        elif sub_type == "cad_native":
            apps.add("КОМПАС-3D")
        else:
            apps.add("1С:Предприятие 8.3")
        if random.random() < 0.3:
            apps.add("VLC Media Player")

    elif "Геолог" in dept:
        # Смесь AutoCAD, SolidWorks и отечественного софта
        if random.random() < 0.45:
            apps.add(random.choice(["AutoCAD", "SolidWorks"]))
        if random.random() < 0.40:
            apps.add("КОМПАС-3D")
        if random.random() < 0.25:
            apps.add("1С:Предприятие 8.3")

    elif "Бухгалтерия" in dept:
        apps.add("1С:Предприятие 8.3")
        if random.random() < 0.60:
            apps.add("КриптоПро CSP")
        if random.random() < 0.25:
            apps.add("VipNet Client")
        if random.random() < 0.12:
            apps.add("SAP GUI") # Тяжелый блокер у финдирекции

    elif "Юридический" in dept:
        if random.random() < 0.50:
            apps.add("КриптоПро CSP") # ЭЦП для судов
        if random.random() < 0.70:
            apps.add("Adobe Acrobat Reader")
        if random.random() < 0.10:
            apps.add("SolidWorks") # Экспертиза тех. документации (блокер)

    elif "Кадров" in dept:
        apps.add("1С:Предприятие 8.3")
        if random.random() < 0.15:
            apps.add("Adobe Photoshop") # Дизайнер пропусков/медиа (блокер)
        if random.random() < 0.30:
            apps.add("Foxit Reader")

    elif "Логистика" in dept or "Склад" in dept:
        apps.add("1С:Предприятие 8.3")
        if random.random() < 0.30:
            apps.add("SAP GUI") # Складской блокер
        if random.random() < 0.40:
            apps.add("Total Commander")

    rows.append({
        "workstation_id": ws_id,
        "workstation_ext_id": ws_id,
        "user_fullname": user_name,
        "department": dept,
        "current_os": random.choices(["Windows 10 Pro", "Windows 11 Pro", "Windows 7 Pro (legacy)"], weights=[70, 20, 10])[0],
        "cpu_cores": cores,
        "ram_gb": ram,
        "disk_gb": disk,
        "installed_software": "; ".join(sorted(apps))
    })

fieldnames = [
    "workstation_id", "workstation_ext_id", "user_fullname", "department",
    "current_os", "cpu_cores", "ram_gb", "disk_gb", "installed_software"
]

with open("alrosa_fleet_2500.csv", "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
    writer.writeheader()
    writer.writerows(rows)

print(f"Готово! Сгенерирован органичный датасет: alrosa_fleet_2500.csv ({len(rows)} АРМ)")
