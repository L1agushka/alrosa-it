export const defaultCriteria = { minRam: 8, minCores: 4, maxGap: 20 };

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

  // Проверка аппаратных требований
  if (ramVal < c.minRam) {
    blockers.push({
      type: "ОЗУ",
      text: `ОЗУ ${ramVal} ГБ (требуется от ${c.minRam} ГБ)`,
      fix: "Добавить планку памяти"
    });
  }

  if (coresVal < c.minCores) {
    blockers.push({
      type: "Процессор",
      text: `${coresVal} ядра (требуется от ${c.minCores})`,
      fix: "Модернизировать процессор"
    });
  }

  // Проверка программных блокеров
  const blockingList = ws.blockingSoftware || [];
  blockingList.forEach((sw) => {
    blockers.push({
      type: "ПО",
      text: `Несовместимое ПО: ${sw}`,
      fix: "Заменить на отечественный аналог / VDI"
    });
  });

  const totalPrograms = ws.programs || (blockingList.length ? blockingList.length + 2 : 1);
  const missingPrograms = blockingList.length > 0 ? blockingList.length : Math.max(0, totalPrograms - (ws.compatible || 0));
  const gap = totalPrograms > 0 ? Math.round((missingPrograms / totalPrograms) * 100) : 0;

  if (gap > c.maxGap && blockingList.length === 0) {
    blockers.push({
      type: "ПО",
      text: `${missingPrograms} программ без аналога (${gap}%)`,
      fix: "Подобрать отечественные аналоги"
    });
  }

  const hasSoftwareBlockers = blockingList.length > 0 || gap > c.maxGap;
  const hasHardwareDeficit = ramVal < c.minRam || coresVal < c.minCores;

  // Бизнес-логика волн миграции:
  // Волна 3: есть блокеры ПО (AutoCAD, SAP и т.д.)
  // Волна 2: софт готов, но не хватает ОЗУ / ядер CPU (апгрейд железа)
  // Волна 1: железо и софт полностью соответствуют критериям
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

  return {
    ...ws,
    blockers,
    gap,
    status,
    wave
  };
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

export function parseCsv(text) {
  return [];
}
