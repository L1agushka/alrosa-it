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

export function evaluate(ws, c) {
  const blockers = [];
  const ramVal = Number(ws.ram) || 0;
  const coresVal = Number(ws.cores) || 0;
  const diskVal = Number(ws.disk) || 0;

  // Проверка ОЗУ
  if (ramVal < c.minRam) {
    blockers.push({
      type: "ОЗУ",
      text: `ОЗУ ${ramVal} ГБ (требуется от ${c.minRam} ГБ)`,
      fix: "Добавить планку памяти"
    });
  }

  // Проверка CPU
  if (coresVal < c.minCores) {
    blockers.push({
      type: "Процессор",
      text: `${coresVal} ядра (требуется от ${c.minCores})`,
      fix: "Модернизировать процессор"
    });
  }

  // Проверка диска
  if (diskVal < 30) {
    blockers.push({
      type: "Диск",
      text: `Диск ${diskVal} ГБ (требуется от 30 ГБ)`,
      fix: "Установить SSD большего объёма"
    });
  }

  // Программные блокеры
  const blockingList = ws.blockingSoftware || [];
  blockingList.forEach((sw) => {
    blockers.push({
      type: "ПО",
      text: `Несовместимое ПО: ${sw}`,
      fix: "Заменить на отечественный аналог / VDI"
    });
  });

  const totalPrograms = ws.programs || (blockingList.length ? blockingList.length + 2 : 1);
  const missingPrograms = blockingList.length > 0
      ? blockingList.length
      : Math.max(0, totalPrograms - (ws.compatible || 0));
  const gap = totalPrograms > 0 ? Math.round((missingPrograms / totalPrograms) * 100) : 0;

  if (gap > c.maxGap && blockingList.length === 0) {
    blockers.push({
      type: "ПО",
      text: `${missingPrograms} программ без аналога (${gap}%)`,
      fix: "Подобрать отечественные аналоги"
    });
  }

  const hasSoftwareBlockers = blockingList.length > 0 || gap > c.maxGap;
  const hasHardwareDeficit = ramVal < c.minRam || coresVal < c.minCores || diskVal < 30;

  // Логика волн
  let status = "Готов";
  let wave = "Волна 1";

  if (hasSoftwareBlockers) {
    status = "Не готов";
    wave = "Волна 3";
  } else if (hasHardwareDeficit) {
    status = "Частично";
    wave = "Волна 2";
  } else {
    status = "Готов";
    wave = "Волна 1";
  }

  return { ...ws, blockers, gap, status, wave };
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