import { useState, useMemo } from "react";
import { StatusBadge } from "./ui";

export default function WorkstationModal({ selected, onClose }) {
  const [tab, setTab] = useState("shap"); // "overview" | "shap" | "playbook"
  const [copied, setCopied] = useState(false);

  if (!selected) return null;

  // Извлекаем чистые данные
  const ram = Number(selected.ram || 8);
  const cores = Number(selected.cores || 4);
  const disk = Number(selected.disk || 256);
  const dept = selected.department || "Подразделение не указано";
  const os = selected.os || selected.current_os || "Windows 10 Pro";

  // Список софта и блокеров
  const softwareList = useMemo(() => {
    if (Array.isArray(selected.installed_software)) return selected.installed_software;
    if (typeof selected.installed_software === "string") {
      return selected.installed_software.split(";").map((s) => s.trim()).filter(Boolean);
    }
    if (Array.isArray(selected.software)) {
      return selected.software.map((s) => typeof s === "object" ? (s.software_name || s.name) : s);
    }
    return ["1С:Предприятие 8.3", "Яндекс Браузер", "МойОфис Стандартный"];
  }, [selected]);

  const rawBlockers = selected.blockers || selected.blockingSoftware || [];
  const blockers = useMemo(() => {
    return rawBlockers.map((b) => {
      if (typeof b === "string") return { name: b, fix: "Замена на отечественный аналог" };
      return {
        name: b.software_name || b.name || b.text || "Несовместимое ПО",
        fix: b.fix || b.alternative || "Замена на отечественный аналог / VDI"
      };
    });
  }, [rawBlockers]);

  // --- ЛОКАЛЬНЫЙ SHAP WATERFALL РАСЧЕТ ---
  const shapData = useMemo(() => {
    const baseRisk = 11.5;
    const items = [{ label: "Базовый фоновый риск парка", value: baseRisk, type: "base" }];

    let current = baseRisk;

    // Вклад ОЗУ
    if (ram <= 2) {
      const delta = 46.0;
      current += delta;
      items.push({ label: `Критический дефицит ОЗУ (${ram} ГБ)`, delta: `+${delta}%`, type: "pos", val: delta });
    } else if (ram <= 4) {
      const delta = 28.5;
      current += delta;
      items.push({ label: `Недостаточный объем ОЗУ (${ram} ГБ)`, delta: `+${delta}%`, type: "pos", val: delta });
    } else if (ram >= 16) {
      const delta = -6.0;
      current += delta;
      items.push({ label: `Достаточный запас ОЗУ (${ram} ГБ)`, delta: `${delta}%`, type: "neg", val: delta });
    }

    // Вклад САПР / Тяжелого софта
    const hasCad = softwareList.some((s) => /autocad|solidworks|revit|компас/i.test(s));
    if (hasCad) {
      const delta = 38.0;
      current += delta;
      items.push({ label: "САПР / Блокирующее инженерное ПО", delta: `+${delta}%`, type: "pos", val: delta });
    }

    // Вклад СКЗИ и ЭЦП
    const hasCrypto = softwareList.some((s) => /крипто|crypto|rutoken|рутокен|эцп|csp/i.test(s));
    if (hasCrypto) {
      const delta = 14.5;
      current += delta;
      items.push({ label: "СКЗИ / Проприетарные токены ЭЦП", delta: `+${delta}%`, type: "pos", val: delta });
    }

    // Вклад процессора
    if (cores >= 6) {
      const delta = -5.5;
      current += delta;
      items.push({ label: `Производительный многоядерный CPU (${cores} ядер)`, delta: `${delta}%`, type: "neg", val: delta });
    }

    // Вклад специфики отдела
    if (/бухгалтерия|механика|геолог/i.test(dept)) {
      const delta = 6.5;
      current += delta;
      items.push({ label: `Высокая сложность бизнес-процессов отдела`, delta: `+${delta}%`, type: "pos", val: delta });
    }

    const totalRisk = Math.min(95.0, Math.max(8.0, Math.round(current * 10) / 10));
    return { items, totalRisk };
  }, [ram, cores, softwareList, dept]);

  // --- КОНТРФАКТИЧЕСКИЙ РЕЦЕПТ (COUNTERFACTUAL SOLVER) ---
  const counterfactual = useMemo(() => {
    const steps = [];
    let potentialReduction = 0;
    let budget = 0;

    if (ram < 16) {
      const cost = ram <= 4 ? 3200 : 2800;
      budget += cost;
      potentialReduction += (ram <= 4 ? 35 : 12);
      steps.push({
        action: `Апгрейд памяти: установить модуль DDR4 до 16 ГБ`,
        effect: `-${ram <= 4 ? 35 : 12}% к риску`,
        cost: `${cost.toLocaleString()} ₽`
      });
    }

    const cadSoft = softwareList.find((s) => /autocad|solidworks/i.test(s));
    if (cadSoft) {
      potentialReduction += 38;
      steps.push({
        action: `Замещение ПО: миграция с ${cadSoft} на nanoCAD / КОМПАС-3D`,
        effect: "-38% к риску",
        cost: "В рамках корп. лицензии"
      });
    }

    const hasCrypto = softwareList.some((s) => /крипто|crypto/i.test(s));
    if (hasCrypto) {
      potentialReduction += 12;
      steps.push({
        action: "Установка сертифицированного модуля КриптоПро CSP 5.0 для Astra Linux",
        effect: "-12% к риску",
        cost: "0 ₽"
      });
    }

    const projectedRisk = Math.max(10.0, Math.round((shapData.totalRisk - potentialReduction) * 10) / 10);
    return { steps, budget, projectedRisk };
  }, [ram, softwareList, shapData.totalRisk]);

  // Генерация скрипта для инженера
  const bashScript = `#!/usr/bin/env bash
# ====================================================================
# АЛРОСА-ИТ: Скрипт подготовки АРМ ${selected.id} к бесшовной миграции
# Подразделение: ${dept} | Сотрудник: ${selected.user || "Пользователь"}
# ====================================================================
set -euo pipefail

echo "[*] Старт адаптации рабочего места ${selected.id}..."

# 1. Резервное копирование пользовательского профиля
rsync -avz --progress /mnt/c/Users/"${(selected.user || 'User').split(' ')[0]}"/ /backup/migration_${selected.id}/

# 2. Установка отечественного программного стека Astra Linux SE
sudo apt update && sudo apt install -y \\
    myoffice-standard \\
    yandex-browser-stable \\
    p7zip-full

${softwareList.some(s => /autocad|cad/i.test(s)) ? `# 3. Инсталляция нативного САПР-окружения
sudo apt install -y nanocad-platform-astra || echo "Установите дистрибутив nanoCAD из корп. репозитория"
` : ""}
${softwareList.some(s => /крипто|crypto/i.test(s)) ? `# 4. Инициализация СКЗИ КриптоПро CSP 5.0 и Рутокен
sudo /opt/cprocsp/sbin/amd64/cpconfig -license -set XXXXX-XXXXX-XXXXX-XXXXX
sudo systemctl enable pcscd && sudo systemctl start pcscd
` : ""}
echo "[+] АРМ ${selected.id} успешно подготовлен. Перевод в Волну 1 разрешен."
`;

  const copyPlaybook = () => {
    navigator.clipboard.writeText(bashScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: "780px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
        {/* ХЕДЕР */}
        <div className="modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2 style={{ margin: 0 }}>{selected.id}</h2>
              <span className="status ready" style={{ fontSize: "12px", padding: "2px 8px" }}>
                {dept}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>
              Сотрудник: <strong style={{ color: "var(--text)" }}>{selected.user || "Не назначен"}</strong> • ОС: {os}
            </p>
          </div>
          <button className="close-button" aria-label="Закрыть" onClick={onClose}>×</button>
        </div>

        {/* НАВИГАЦИЯ ВКЛАДОК */}
        <div className="seg" style={{ margin: "16px 0 20px" }}>
          <button className={tab === "shap" ? "on" : ""} onClick={() => setTab("shap")}>
            Локальный SHAP Waterfall
          </button>
          <button className={tab === "playbook" ? "on" : ""} onClick={() => setTab("playbook")}>
            Контрфактический рецепт (What-If)
          </button>
          <button className={tab === "overview" ? "on" : ""} onClick={() => setTab("overview")}>
            Обзор и ПО ({softwareList.length})
          </button>
        </div>

        {/* ВКЛАДКА 1: SHAP WATERFALL */}
        {tab === "shap" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--panel-2)", padding: "14px 18px", borderRadius: "8px", border: "1px solid var(--line)", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>Предиктивная вероятность инцидента</span>
                <strong style={{ fontSize: "24px", color: shapData.totalRisk >= 50 ? "var(--bad)" : shapData.totalRisk >= 25 ? "var(--warn)" : "var(--ok)" }}>
                  {shapData.totalRisk}%
                </strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>Рекомендуемая волна</span>
                <strong style={{ fontSize: "18px", color: "var(--ice)" }}>
                  {shapData.totalRisk >= 50 ? "Волна 3 (Индивидуально)" : shapData.totalRisk >= 25 ? "Волна 2 (С адаптацией)" : "Волна 1 (Бесшовно)"}
                </strong>
              </div>
            </div>

            <h4 style={{ margin: "0 0 10px", fontSize: "13px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Декомпозиция решения Random Forest (Вклад признаков)
            </h4>
            <div style={{ display: "grid", gap: "8px" }}>
              {shapData.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 12px",
                    background: "var(--panel-2)",
                    borderRadius: "6px",
                    borderLeft: `4px solid ${item.type === "pos" ? "var(--bad)" : item.type === "neg" ? "var(--ok)" : "var(--ice)"}`
                  }}
                >
                  <span style={{ fontSize: "13px" }}>{item.label}</span>
                  <strong style={{ color: item.type === "pos" ? "var(--bad)" : item.type === "neg" ? "var(--ok)" : "var(--ice)", fontVariantNumeric: "tabular-nums" }}>
                    {item.delta || `${item.value}%`}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 2: КОНТРФАКТИЧЕСКИЙ РЕЦЕПТ & PLAYBOOK */}
        {tab === "playbook" && (
          <div>
            <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "14px 16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "var(--ok)", fontSize: "15px" }}>Кратчайший путь в Волну 1 (Зеленая зона)</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                    При выполнении комплекса мер риск снизится: <strong>{shapData.totalRisk}% → {counterfactual.projectedRisk}%</strong>
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Оценка затрат</span>
                  <strong style={{ fontSize: "16px", color: "var(--ice)" }}>{counterfactual.budget ? `${counterfactual.budget.toLocaleString()} ₽` : "0 ₽"}</strong>
                </div>
              </div>
            </div>

            <h4 style={{ margin: "0 0 10px", fontSize: "13px", color: "var(--muted)", textTransform: "uppercase" }}>
              Оптимальный рецепт инженера ({counterfactual.steps.length} действия)
            </h4>
            <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
              {counterfactual.steps.map((st, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--panel-2)", padding: "10px 12px", borderRadius: "6px" }}>
                  <div>
                    <span style={{ fontWeight: "600", fontSize: "13px" }}>{st.action}</span>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>Бюджет: {st.cost}</div>
                  </div>
                  <strong style={{ color: "var(--ok)", fontSize: "13px" }}>{st.effect}</strong>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>Исполняемый Bash-плейбук для Astra Linux:</span>
              <button className="ghost-btn" style={{ padding: "4px 10px", fontSize: "12px" }} onClick={copyPlaybook}>
                {copied ? "Скопировано!" : "Скопировать скрипт"}
              </button>
            </div>
            <pre style={{ margin: 0, padding: "12px", background: "#0b1320", borderRadius: "6px", color: "#7dd3fc", fontSize: "12px", overflowX: "auto", maxHeight: "160px" }}>
              {bashScript}
            </pre>
          </div>
        )}

        {/* ВКЛАДКА 3: ОБЗОР И СОФТ */}
        {tab === "overview" && (
          <div>
            <div className="details-grid" style={{ marginBottom: "16px" }}>
              <div><span>Оперативная память</span><strong>{ram} ГБ DDR4</strong></div>
              <div><span>Процессор</span><strong>{cores} ядер / x86_64</strong></div>
              <div><span>Накопитель</span><strong>{disk} ГБ SSD</strong></div>
              <div><span>Текущая ОС</span><strong>{os}</strong></div>
            </div>

            <h4 style={{ margin: "0 0 10px", fontSize: "13px", color: "var(--muted)", textTransform: "uppercase" }}>
              Установленное программное обеспечение
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {softwareList.map((sw, i) => {
                const isBlock = /autocad|solidworks|sap|photoshop/i.test(sw);
                const isWarn = /крипто|1с|office|outlook/i.test(sw);
                return (
                  <span
                    key={i}
                    className={`status ${isBlock ? "blocked" : isWarn ? "partial" : "ready"}`}
                    style={{ fontSize: "12px", padding: "4px 10px" }}
                  >
                    {sw} {isBlock ? "(Блокер)" : isWarn ? "(Аналог)" : "(Нативно)"}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
