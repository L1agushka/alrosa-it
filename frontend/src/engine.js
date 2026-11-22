export const defaultCriteria = {
  minRam: 4, minCores: 2, minDisk: 30, maxGap: 20,
  weights: {ram: 30, cpu: 25, disk: 20, blocker_software: 100, unknown_software: 5},
};

export const analogs = [
  ["Microsoft Office", "Р7-Офис, МойОфис", "Есть"],
  ["Windows 10 / 11", "Astra Linux, РЕД ОС", "Есть"],
  ["1С:Предприятие", "1С для Linux", "Есть"],
  ["AutoCAD", "Требуется проверка совместимости", "Вручную"],
];

export function evaluate(ws, c, customRules = [], compatibility = null) {
  const weights = c.weights || defaultCriteria.weights;
  const blockers = [];
  let score = 0, critical = false, needsAction = false;
  for (const [code, value, required, label, fix] of [
    ["ram", Number(ws.ram) || 0, c.minRam, "ОЗУ", "Увеличить ОЗУ"],
    ["cpu", Number(ws.cores) || 0, c.minCores, "Процессор", "Модернизировать процессор"],
    ["disk", Number(ws.disk) || 0, c.minDisk, "Диск", "Увеличить диск"],
  ]) {
    if (value < required) {
      blockers.push({type: label, text: label + ": " + value + " (требуется " + required + ")", fix});
      score += weights[code];
      critical ||= weights[code] >= 50;
      needsAction = true;
    }
  }
  const installed = ws.installed || [];
  let unknown = 0, compatibleCount = 0;
  for (const name of installed) {
    const matching = customRules.filter(r => r.pattern && name.toLowerCase().includes(r.pattern.toLowerCase()));
    const local = matching.sort((a,b) => b.pattern.length - a.pattern.length)[0];
    if (local) {
      if (local.status === "native_ready") { compatibleCount++; continue; }
      score += local.weight;
      critical ||= local.status === "blocker";
      needsAction = true;
      blockers.push({type: "ПО", text: name + ": " + local.note, fix: local.alternative});
      continue;
    }
    const rule = compatibility?.find(r => r.software_name.toLowerCase() === name.toLowerCase());
    if (compatibility && !rule) unknown++;
    if (rule && !rule.is_blocker) compatibleCount++;
    if (rule?.is_blocker) {
      critical = true;
      score += weights.blocker_software;
      blockers.push({type: "ПО", text: "Несовместимое ПО: " + name, fix: rule.analog_name || "Проверить замену"});
    }
  }
  // The builder has no inventory, so its supplied compatibility counts remain usable.
  if (!compatibility) unknown = Math.max(0, (ws.programs || 0) - (ws.compatible || 0));
  const total = compatibility ? installed.length : (ws.programs || 0);
  const gap = total ? Math.floor(unknown / total * 100 + 0.5) : 0;
  if (gap > c.maxGap) {
    needsAction = true;
    score += weights.unknown_software;
    critical ||= weights.unknown_software >= 50;
    blockers.push({type:"ПО", text: unknown + " программ требуют проверки (" + gap + "%)", fix:"Проверить совместимость"});
  }
  const status = critical ? "Не готов" : needsAction ? "Частично" : "Готов";
  return {...ws, programs:compatibility ? installed.length : ws.programs,
    compatible:compatibility ? compatibleCount : ws.compatible,
    criteria:c, blockers, gap, score, status, wave: critical ? "Волна 3" : needsAction ? "Волна 2" : "Волна 1"};
}

export const template = "workstation_id,department,user_fullname,current_os,cpu_cores,ram_gb,disk_gb,installed_software\nWS-001,Бухгалтерия,Демо,Windows 10 Pro,4,8,120,Google Chrome\n";

export function download(filename, text) {
  const blob = new Blob(["\uFEFF" + text], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
export function parseCsv() { return []; }
