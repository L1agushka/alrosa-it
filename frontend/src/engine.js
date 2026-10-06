export const defaultCriteria = { minRam: 8, minCores: 4, maxGap: 20 };

export const analogs = [
  ["Microsoft Office", "Р7-Офис, МойОфис", "Есть"],
  ["Windows 10 / 11", "Astra Linux, РЕД ОС", "Есть"],
  ["1С:Предприятие", "1С для Linux", "Есть"],
  ["AutoCAD", "КОМПАС-3D", "Частично"],
  ["Adobe Photoshop", "Прямого аналога нет", "Нет аналога"],
  ["Клиент-банк с токеном", "Нужна проверка поставщика", "Вручную"],
];

const rng = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const depts = ["Бухгалтерия", "IT-отдел", "Отдел кадров", "Производство", "Финансовый отдел", "Логистика", "Геология", "Юристы"];
const first = ["Иван", "Алексей", "Анна", "Дмитрий", "Ольга", "Максим", "Елена", "Сергей"];
const last = ["Иванов", "Петров", "Сидоров", "Кузнецов", "Смирнов", "Волков", "Попов", "Соколов"];

export function makeFleet() {
  const r = rng(42);
  const pick = (a) => a[Math.floor(r() * a.length)];
  return Array.from({ length: 128 }, (_, i) => {
    const programs = 8 + Math.floor(r() * 12);
    const gap = r() < 0.55 ? 0 : Math.floor(r() * programs * 0.55);
    return {
      id: `АРМ-${String(i + 1).padStart(3, "0")}`, user: `${pick(last)} ${pick(first)}`, department: pick(depts),
      os: r() < 0.6 ? "Windows 10" : "Windows 11", ram: pick([4, 8, 8, 16, 16, 32]), cores: pick([2, 4, 4, 6, 8]),
      programs, compatible: programs - gap,
    };
  });
}

export function evaluate(ws, c) {
  const blockers = [];
  if (ws.ram < c.minRam) blockers.push({ type: "ОЗУ", text: `ОЗУ ${ws.ram} ГБ, нужно от ${c.minRam}`, fix: "Добавить планку памяти" });
  if (ws.cores < c.minCores) blockers.push({ type: "Процессор", text: `${ws.cores} ядра, нужно от ${c.minCores}`, fix: "Заменить рабочее место" });
  const miss = ws.programs - ws.compatible;
  const gap = Math.round((miss / ws.programs) * 100);
  if (gap > c.maxGap) blockers.push({ type: "ПО", text: `${miss} программ без аналога (${gap}%)`, fix: "Подобрать аналоги или оставить в виртуальной среде" });
  const hw = blockers.some((b) => b.type !== "ПО");
  const status = hw || gap > c.maxGap * 2 ? "Не готов" : gap > c.maxGap ? "Частично" : "Готов";
  const wave = status === "Готов" ? (miss === 0 ? "Волна 1" : "Волна 2") : status === "Частично" ? "Волна 3" : "—";
  return { ...ws, blockers, gap, status, wave };
}

export const template = "id;user;department;os;ram;cores;programs;compatible\nАРМ-001;Иванов Иван;Бухгалтерия;Windows 10;8;4;14;12\n";

export function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function splitCsvLine(line, delim) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === delim && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result.map((s) => s.replace(/^"|"$/g, "").trim());
}

export function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, "").trim();
  if (!clean) return [];

  const rawLines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length < 2) return [];

  const delim = rawLines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(rawLines[0], delim).map((h) => h.toLowerCase());

  const findIdx = (aliases) => headers.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));

  const idIdx = findIdx(["id", "workstation_id", "хост", "арм"]);
  const userIdx = findIdx(["user", "user_fullname", "пользователь", "сотрудник", "фио"]);
  const deptIdx = findIdx(["department", "отдел", "подразделение"]);
  const osIdx = findIdx(["os", "os_name", "ос", "система"]);
  const ramIdx = findIdx(["ram", "ram_gb", "озу", "память"]);
  const coresIdx = findIdx(["cores", "cpu_cores", "ядра", "процессор"]);
  const progIdx = findIdx(["programs", "installed_software", "софт", "программы"]);
  const compIdx = findIdx(["compatible", "совместимо"]);

  if (idIdx === -1 && ramIdx === -1) {
    throw new Error("Не удалось распознать колонки CSV. Проверьте заголовок файла.");
  }

  return rawLines.slice(1).map((line, idx) => {
    const cols = splitCsvLine(line, delim);
    const id = idIdx !== -1 && cols[idIdx] ? cols[idIdx] : `АРМ-${String(idx + 1).padStart(3, "0")}`;
    const user = userIdx !== -1 && cols[userIdx] ? cols[userIdx] : "Не указан";
    const department = deptIdx !== -1 && cols[deptIdx] ? cols[deptIdx] : "Общий отдел";
    const os = osIdx !== -1 && cols[osIdx] ? cols[osIdx] : "Windows 10";
    const ram = ramIdx !== -1 ? parseInt(cols[ramIdx], 10) || 8 : 8;
    const cores = coresIdx !== -1 ? parseInt(cols[coresIdx], 10) || 4 : 4;

    let programs = 10;
    let compatible = 8;
    if (progIdx !== -1 && cols[progIdx]) {
      const rawP = cols[progIdx];
      if (!isNaN(rawP) && rawP.trim() !== "") {
        programs = parseInt(rawP, 10) || 10;
        compatible = compIdx !== -1 && !isNaN(cols[compIdx]) ? parseInt(cols[compIdx], 10) : Math.max(programs - 2, 1);
      } else {
        const list = rawP.split(/[|,;]/).filter(Boolean);
        programs = Math.max(list.length, 1);
        compatible = Math.max(programs - 1, 1);
      }
    }

    return { id, user, department, os, ram, cores, programs, compatible };
  });
}
