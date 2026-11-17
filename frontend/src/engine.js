export const defaultCriteria = {
  // пороги (из OperatingSystem)
  minRam: 4,
  minCores: 2,
  minDisk: 30,
  maxGap: 20,
  // веса (из CriteriaWeight) — для будущего скоринга
  weights: {
    ram: 30, cpu: 25, disk: 20, blocker_software: 100, unknown_software: 5,
  },
};

export const analogs = [
  ["Microsoft Office", "Р7-Офис, МойОфис", "Есть"],
  ["Windows 10 / 11", "Astra Linux, РЕД ОС", "Есть"],
  ["1С:Предприятие", "1С для Linux", "Есть"],
  ["AutoCAD", "КОМПАС-3D", "Частично"],
  ["Adobe Photoshop", "Прямого аналога нет", "Нет аналога"],
  ["Клиент-банк с токеном", "Нужна проверка поставщика", "Вручную"],
];

export function evaluate(ws, c, customRules = []) {
  const ramVal = Number(ws.ram) || 0;
  const coresVal = Number(ws.cores) || 0;
  const diskVal = Number(ws.disk) || 0;
  const weights = c.weights || {};
  const blockers = [];
  let score = 0;

  // 1. Проверяем железо и собираем score
  const lacksRam = ramVal < c.minRam;
  const lacksCpu = coresVal < c.minCores;
  const lacksDisk = diskVal < (c.minDisk ?? 30);

  if (lacksRam) {
    blockers.push({ type: "ОЗУ", text: `ОЗУ ${ramVal} ГБ (требуется от ${c.minRam} ГБ)`, fix: "Добавить планку памяти" });
    score += weights.ram ?? 0;
  }
  if (lacksCpu) {
    blockers.push({ type: "Процессор", text: `${coresVal} ядра (требуется от ${c.minCores})`, fix: "Модернизировать процессор" });
    score += weights.cpu ?? 0;
  }
  if (lacksDisk) {
    blockers.push({ type: "Диск", text: `Диск ${diskVal} ГБ (требуется от ${c.minDisk ?? 30} ГБ)`, fix: "Установить SSD" });
    score += weights.disk ?? 0;
  }

  // 2. Проверяем ПО с бэкенда
  const blockingList = ws.blockingSoftware || [];
  blockingList.forEach((sw) => {
    blockers.push({ type: "ПО", text: `Несовместимое ПО: ${sw}`, fix: "Заменить на аналог" });
    score += weights.blocker_software ?? 0;
  });

  // 3. Кастомные правила
  const installed = ws.installed || [];
  const installedLower = installed.map((x) => String(x).toLowerCase());
  let customBlockersCount = 0;

  for (const rule of customRules) {
    if (!rule.pattern) continue;
    const hit = installedLower.find((name) => name.includes(rule.pattern.toLowerCase()));
    if (!hit) continue;

    if (rule.status === "blocker") {
      blockers.push({ type: "ПО", text: `Заблокировано: ${rule.software_name || hit}`, fix: `Заменить: ${rule.alternative || "—"}` });
      score += rule.weight ?? 100;
      customBlockersCount++;
    } else if (rule.status === "alternative") {
      score += rule.weight ?? 20;
    }
  }

  // 4. Проверяем ПО без аналога (Gap)
  const totalPrograms = ws.programs || 1;
  const missingPrograms = blockingList.length > 0 ? blockingList.length : Math.max(0, totalPrograms - (ws.compatible || 0));
  const gap = totalPrograms > 0 ? Math.round((missingPrograms / totalPrograms) * 100) : 0;
  const lacksSoftware = gap > c.maxGap && blockingList.length === 0;

  if (lacksSoftware) {
    blockers.push({ type: "ПО", text: `${missingPrograms} программ без аналога (${gap}%)`, fix: "Подобрать аналоги" });
    score += weights.unknown_software ?? 0;
  }

  // --- ЛОГИКА ВОЛН С УЧЕТОМ ВЕСОВ ---

  let status = "Готов";
  let wave = "Волна 1";

  // Критический вес, при котором проблема становится блокером (например, >= 50)
  const CRITICAL_WEIGHT = 50;

  // Есть ли жесткие софтверные блокеры (с бэкенда или кастомные с высоким весом)?
  const hasHardSoftwareBlocker =
      blockingList.length > 0 ||
      customRules.some(r => {
        if (r.status !== "blocker") return false;
        const hit = installedLower.find(name => name.includes(r.pattern.toLowerCase()));
        return hit && (r.weight ?? 100) >= CRITICAL_WEIGHT;
      });

  // Есть ли проблемы с железом?
  const hasHardwareIssue = lacksRam || lacksCpu || lacksDisk;

  // Если есть жесткий софт-блокер -> Волна 3 (Не готов)
  if (hasHardSoftwareBlocker) {
    status = "Не готов";
    wave = "Волна 3";
  }
  // Если нет жестких софт-блокеров, но есть проблема с железом ИЛИ софтом
  else if (hasHardwareIssue || lacksSoftware || customBlockersCount > 0) {

    // А теперь смотрим на веса!
    // Если сумма весов проблем меньше CRITICAL_WEIGHT, мы можем простить их и поставить "Готов" или "Частично"
    // Например, если вес ОЗУ = 10, мы не блокируем ПК.

    let isCritical = false;

    if (lacksRam && (weights.ram ?? 0) >= CRITICAL_WEIGHT) isCritical = true;
    if (lacksCpu && (weights.cpu ?? 0) >= CRITICAL_WEIGHT) isCritical = true;
    if (lacksDisk && (weights.disk ?? 0) >= CRITICAL_WEIGHT) isCritical = true;
    if (lacksSoftware && (weights.unknown_software ?? 0) >= CRITICAL_WEIGHT) isCritical = true;

    if (isCritical) {
      status = "Не готов";
      wave = "Волна 3";
    } else {
      status = "Частично";
      wave = "Волна 2";
    }
  }

  return { ...ws, blockers, gap, score, status, wave };
}

export const template = "workstation_id,department,user_fullname,current_os,cpu_cores,ram_gb,disk_gb,installed_software\nWS-001,Бухгалтерия,Иванова А.С.,Windows 10 Pro,4,8,120,Microsoft Office 2016/2019; 1С:Предприятие (клиент); Google Chrome\n";

export function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseCsv(text) {
  return [];
}