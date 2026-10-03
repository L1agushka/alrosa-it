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

export function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const cols = head.split(/[;,]/).map((s) => s.trim().toLowerCase());
  const need = ["id", "user", "department", "os", "ram", "cores", "programs", "compatible"];
  const miss = need.filter((n) => !cols.includes(n));
  if (miss.length) throw new Error(`В файле нет колонок: ${miss.join(", ")}`);
  return lines.filter(Boolean).map((l) => {
    const v = l.split(/[;,]/); const o = {};
    cols.forEach((c, i) => (o[c] = v[i]?.trim()));
    return { ...o, ram: +o.ram, cores: +o.cores, programs: +o.programs, compatible: +o.compatible };
  });
}

export const template = "id;user;department;os;ram;cores;programs;compatible\nАРМ-001;Иванов Иван;Бухгалтерия;Windows 10;8;4;14;12\n";

export function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }));
  a.download = name; a.click();
}