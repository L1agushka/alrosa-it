import { useEffect, useMemo, useState } from "react";
import { Count, Panel } from "./ui";

const toneMap = {
  "Низкий": "ready",
  "Умеренный": "partial",
  "Высокий": "blocked"
};

// Практические рекомендации к факторам влияния ML-модели
const FACTOR_RECOMMENDATIONS = {
  "ПО без нативного": "Миграция на nanoCAD, МойОфис и веб-версии сервисов",
  "ОЗУ": "Закупка и дооснащение планками памяти DDR4 до 16 ГБ",
  "СКЗИ": "Установка КриптоПро CSP 5.0 R3 и Рутокен для Astra Linux",
  "периферии": "Проверка совместимости драйверов CUPS/SANE и JaCarta/Рутокен",
  "Специфика": "Индивидуальный регламент миграции технологического сегмента",
  "1С": "Перевод информационных баз 1С на веб-клиент через Nginx"
};

export default function MLAnalytics({ fleet = [], onPick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");

  // What-If параметры
  const [simRam, setSimRam] = useState(false);
  const [simCad, setSimCad] = useState(false);
  const [simWeb1c, setSimWeb1c] = useState(false);
  const [simCrypto, setSimCrypto] = useState(false);

  useEffect(() => {
    fetch("/api/v1/stats/ml-risk")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res && res.available) {
          setData(res);
        }
      })
      .catch((e) => console.error("ML load error:", e))
      .finally(() => setLoading(false));
  }, [fleet]);

  const rawList = data?.workstations || [];
  const factors = data?.feature_importances || [];

  // Пересчет What-If симуляции
  const simulatedList = useMemo(() => {
    return rawList.map((w) => {
      let p = w.incident_probability;
      const origFactor = w.key_risk_factor || "";
      const applied = [];

      if (simRam) {
        if (origFactor.includes("ОЗУ") || origFactor.includes("дефицит")) {
          p = Math.max(16.0, p - 68.0);
          applied.push("ОЗУ 16 ГБ");
        } else if (p > 30.0) {
          p = Math.max(12.0, p - 8.0);
        }
      }

      if (simCad) {
        if (origFactor.includes("САПР") || origFactor.includes("AutoCAD") || origFactor.includes("SolidWorks") || w.department?.includes("механика") || w.department?.includes("Геолог")) {
          p = Math.max(14.0, p - 45.0);
          applied.push("nanoCAD/Компас");
        }
      }

      if (simWeb1c) {
        if (origFactor.includes("1С") || w.department?.includes("Бухгалтерия") || w.department?.includes("Логистика")) {
          p = Math.max(12.0, p - 14.0);
          applied.push("Web-1C");
        }
      }

      if (simCrypto) {
        if (origFactor.includes("СКЗИ") || origFactor.includes("Крипто") || w.department?.includes("Бухгалтерия") || w.department?.includes("Юридический")) {
          p = Math.max(12.0, p - 15.0);
          applied.push("Облачная ЭЦП");
        }
      }

      p = Math.max(8.0, Math.min(95.0, Math.round(p * 10) / 10));

      let level = "Низкий";
      if (p >= 50.0) level = "Высокий";
      else if (p >= 24.0) level = "Умеренный";

      let displayFactor = origFactor;
      if (applied.length > 0) {
        displayFactor = `Модернизировано: ${applied.join(" + ")}`;
      }

      return {
        ...w,
        incident_probability: p,
        risk_level: level,
        key_risk_factor: displayFactor
      };
    });
  }, [rawList, simRam, simCad, simWeb1c, simCrypto]);

  // Сводные метрики после симуляции
  const simSummary = useMemo(() => {
    const total = simulatedList.length || 1;
    const high = simulatedList.filter((x) => x.risk_level === "Высокий").length;
    const med = simulatedList.filter((x) => x.risk_level === "Умеренный").length;
    const low = simulatedList.filter((x) => x.risk_level === "Низкий").length;
    const avg = simulatedList.reduce((acc, x) => acc + x.incident_probability, 0) / total;

    const ramPcs = simRam ? rawList.filter((w) => (w.key_risk_factor || "").includes("ОЗУ")).length : 0;
    const estimatedCost = ramPcs * 3200;

    const baseHigh = data?.summary?.high_risk_count || 0;
    const baseMed = data?.summary?.medium_risk_count || 0;
    const highDiff = Math.max(0, baseHigh - high);
    const medDiff = Math.max(0, baseMed - med);
    const savedHours = Math.round((highDiff * 4.5) + (medDiff * 1.5));

    return {
      fleet_risk_index: Math.round(avg * 10) / 10,
      high_risk_count: high,
      medium_risk_count: med,
      low_risk_count: low,
      ramPcs,
      estimatedCost,
      savedHours,
      reducedHighCount: highDiff
    };
  }, [simulatedList, data, simRam, rawList]);

  // Анализ очагов риска по подразделениям компании
  const departmentRisks = useMemo(() => {
    const map = {};
    simulatedList.forEach((w) => {
      const dept = w.department || "Не указано подразделение";
      if (!map[dept]) {
        map[dept] = { total: 0, high: 0, med: 0, low: 0, issues: {} };
      }
      map[dept].total++;
      if (w.risk_level === "Высокий") map[dept].high++;
      else if (w.risk_level === "Умеренный") map[dept].med++;
      else map[dept].low++;

      const factor = w.key_risk_factor || "Прочие особенности";
      map[dept].issues[factor] = (map[dept].issues[factor] || 0) + 1;
    });

    return Object.entries(map)
      .map(([dept, s]) => {
        const topIssue = Object.entries(s.issues).sort((a, b) => b[1] - a[1])[0]?.[0] || "Штатно";
        const readinessPct = Math.round((s.low / s.total) * 100);
        return {
          dept,
          ...s,
          topIssue,
          readinessPct
        };
      })
      .sort((a, b) => b.high - a.high || a.readinessPct - b.readinessPct)
      .slice(0, 5);
  }, [simulatedList]);

  // Выгрузка ведомости для закупки/модернизации в CSV
  const downloadProcurementCSV = () => {
    const targetPcs = simulatedList.filter((w) => w.key_risk_factor.startsWith("Модернизировано:"));
    if (!targetPcs.length) return;

    let csv = "ID АРМ;Подразделение;Мероприятие модернизации;Вероятность сбоя после мер;Текущий статус\n";
    targetPcs.forEach((w) => {
      csv += `${w.workstation_id};"${w.department}";"${w.key_risk_factor}";${w.incident_probability}%;${w.risk_level}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Vedomost_Modernizacii_ALROSA_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Выгрузка дорожной карты миграции парка в CSV
  const downloadRoadmapCSV = () => {
    let csv = "ID АРМ;Подразделение;Рекомендуемая волна миграции;Вероятность инцидента;Ключевой фактор риска\n";
    simulatedList.forEach((w) => {
      const wave = w.risk_level === "Низкий" ? "Волна 1 (Бесшовная)" : w.risk_level === "Умеренный" ? "Волна 2 (Плановая адаптация)" : "Волна 3 (Индивидуальный проект)";
      csv += `${w.workstation_id};"${w.department}";"${wave}";${w.incident_probability}%;"${w.key_risk_factor}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Dorozhnaya_Karta_Migracii_ALROSA_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return simulatedList.filter((w) => {
      const matchText = [w.workstation_id, w.department, w.key_risk_factor].some((x) =>
        (x || "").toLowerCase().includes(term)
      );
      const matchStatus = !st || w.risk_level === st;
      return matchText && matchStatus;
    });
  }, [simulatedList, q, st]);

  const count = (level) => simulatedList.filter((r) => r.risk_level === level).length;
  const isSimulationActive = simRam || simCad || simWeb1c || simCrypto;

  if (loading) {
    return <div className="panel empty">Загрузка ML-модели и профилей рабочих мест...</div>;
  }

  return (
    <>
      {/* ВЕРХНЯЯ СВОДКА С КНОПКОЙ ДОРОЖНОЙ КАРТЫ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <div style={{ fontSize: "14px", color: "var(--muted)" }}>
          Предиктивная аналитика сбоев парка АРМ на базе обученного ансамбля моделей
        </div>
        <button
          className="on"
          onClick={downloadRoadmapCSV}
          style={{
            padding: "8px 18px",
            background: "var(--ice)",
            color: "var(--bg)",
            border: "none",
            borderRadius: "6px",
            fontWeight: "700",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer"
          }}
        >
          <span>📄</span> Сформировать дорожную карту (CSV)
        </button>
      </div>

      {/* КАРТОЧКИ ВОЛН МИГРАЦИИ */}
      <div className="stats-grid">
        <div className="stat-card" style={{ "--i": 0 }}>
          <span>Индекс риска парка</span>
          <strong><Count to={simSummary.fleet_risk_index} decimals={1} suffix="%" /></strong>
          <small>{isSimulationActive ? "Прогноз после симуляции мер" : "Средневзвешенная вероятность сбоя"}</small>
        </div>
        <div className="stat-card ok" style={{ "--i": 1 }}>
          <span>Низкий риск (Волна 1)</span>
          <strong><Count to={simSummary.low_risk_count} /></strong>
          <small>Бесшовная миграция без тикетов</small>
        </div>
        <div className="stat-card warn" style={{ "--i": 2 }}>
          <span>Умеренный риск (Волна 2)</span>
          <strong><Count to={simSummary.medium_risk_count} /></strong>
          <small>Требует ручной адаптации профилей</small>
        </div>
        <div className="stat-card bad" style={{ "--i": 3 }}>
          <span>Высокий риск (Индивидуально)</span>
          <strong><Count to={simSummary.high_risk_count} /></strong>
          <small>КриптоПро, САПР или ОЗУ ≤ 4 ГБ</small>
        </div>
      </div>

      {/* WHAT-IF ОПТИМИЗАТОР С ПРИВЯЗКОЙ К ДЕЙСТВИЯМ */}
      <Panel
        title="Сценарное моделирование (What-If оптимизатор модернизации)"
        hint="Интерактивный пересчет рисков парка при реализации мер превентивной подготовки ПК"
        action={
          isSimulationActive && (
            <button
              className="ghost-btn"
              onClick={() => { setSimRam(false); setSimCad(false); setSimWeb1c(false); setSimCrypto(false); }}
            >
              Сбросить симуляцию
            </button>
          )
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "16px" }}>
          <label className={`chip ${simRam ? "on" : ""}`} style={{ cursor: "pointer", padding: "12px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
            <input type="checkbox" checked={simRam} onChange={(e) => setSimRam(e.target.checked)} style={{ display: "none" }} />
            <i className="ok" />
            <div>
              <strong>Апгрейд памяти до 16 ГБ</strong>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>Устраняет нехватку ОЗУ на старых ПК</div>
            </div>
          </label>

          <label className={`chip ${simCad ? "on" : ""}`} style={{ cursor: "pointer", padding: "12px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
            <input type="checkbox" checked={simCad} onChange={(e) => setSimCad(e.target.checked)} style={{ display: "none" }} />
            <i className="warn" />
            <div>
              <strong>Замена AutoCAD → nanoCAD</strong>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>Снимает критический софтверный блокер</div>
            </div>
          </label>

          <label className={`chip ${simWeb1c ? "on" : ""}`} style={{ cursor: "pointer", padding: "12px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
            <input type="checkbox" checked={simWeb1c} onChange={(e) => setSimWeb1c(e.target.checked)} style={{ display: "none" }} />
            <i className="ok" />
            <div>
              <strong>Перевод 1С в Web-интерфейс</strong>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>Исключает сбои толстого клиента под Linux</div>
            </div>
          </label>

          <label className={`chip ${simCrypto ? "on" : ""}`} style={{ cursor: "pointer", padding: "12px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
            <input type="checkbox" checked={simCrypto} onChange={(e) => setSimCrypto(e.target.checked)} style={{ display: "none" }} />
            <i className="ok" />
            <div>
              <strong>Облачная ЭЦП / Web-токены</strong>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>Упрощает интеграцию КриптоПро CSP</div>
            </div>
          </label>
        </div>

        {isSimulationActive && (
          <div style={{ background: "var(--panel-2)", padding: "16px 20px", borderRadius: "8px", border: "1px solid var(--line)", display: "grid", gap: "14px" }}>
            <div className="details-grid">
              <div>
                <span>Снижение риска парка</span>
                <strong style={{ color: "var(--ok)", fontSize: "18px" }}>
                  -{( Math.max(0, (data?.summary?.fleet_risk_index || 0) - simSummary.fleet_risk_index) ).toFixed(1)}%
                </strong>
              </div>
              <div>
                <span>ПК выведено из зоны сбоя</span>
                <strong style={{ color: "var(--ok)", fontSize: "18px" }}>
                  {simSummary.reducedHighCount} АРМ
                </strong>
              </div>
              <div>
                <span>Сэкономлено часов поддержки</span>
                <strong style={{ color: "var(--ice)", fontSize: "18px" }}>
                  +{simSummary.savedHours} ч.
                </strong>
              </div>
              <div>
                <span>Оценка бюджета (железо)</span>
                <strong style={{ fontSize: "18px" }}>
                  {simSummary.estimatedCost ? `${simSummary.estimatedCost.toLocaleString()} ₽` : "0 ₽"}
                </strong>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
              <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>
                Сформирован адресный перечень рабочих мест, подлежащих модернизации для этой конфигурации.
              </span>
              <button
                className="on"
                onClick={downloadProcurementCSV}
                style={{
                  padding: "6px 14px",
                  background: "var(--ok)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "700",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                📥 Выгрузить перечень для закупки (CSV)
              </button>
            </div>
          </div>
        )}
      </Panel>

      {/* ОСНОВНОЙ АНАЛИТИЧЕСКИЙ БЛОК: РЕКОМЕНДАЦИИ И ОЧАГИ РИСКА */}
      <div className="content-grid">
        {/* РЕКОМЕНДАЦИИ НА БАЗЕ ФАКТОРОВ ВЛИЯНИЯ */}
        <Panel
          title="Ключевые факторы риска и меры устранения"
          hint="Ранжирование узких мест миграции и рекомендованные действия ИТ-службы"
        >
          <div style={{ display: "grid", gap: "14px" }}>
            {factors.slice(0, 5).map((f) => {
              const matchedKey = Object.keys(FACTOR_RECOMMENDATIONS).find((k) => f.feature.includes(k));
              const actionText = matchedKey ? FACTOR_RECOMMENDATIONS[matchedKey] : "Проведение технического аудита перед установкой ОС";

              return (
                <div key={f.feature} style={{ display: "grid", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <strong>{f.feature}</strong>
                    <span style={{ color: "var(--ice)", fontWeight: "700" }}>{f.weight_pct}%</span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${Math.min(f.weight_pct * 4, 100)}%` }} />
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "2px" }}>
                    ↳ <em>Мера:</em> {actionText}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* ВМЕСТО ФОРМУЛ: ОЧАГИ РИСКА ПО ПОДРАЗДЕЛЕНИЯМ */}
        <Panel
          title="Критические зоны риска по подразделениям"
          hint="Подразделения с максимальной концентрацией потенциальных сбоев"
        >
          <div style={{ display: "grid", gap: "12px" }}>
            {departmentRisks.map((d) => (
              <div
                key={d.dept}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "grid",
                  gap: "6px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "13.5px", color: "var(--text)" }}>{d.dept}</strong>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {d.high > 0 && <span className="status blocked" style={{ fontSize: "10.5px" }}>{d.high} высокий риск</span>}
                    <span className="status ready" style={{ fontSize: "10.5px" }}>{d.readinessPct}% готово</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--muted)" }}>
                  <span>Всего ПК: {d.total}</span>
                  <span style={{ color: "#f87171" }}>Главный блокер: {d.topIssue}</span>
                </div>

                <div className="progress" style={{ height: "4px" }}>
                  <span style={{ width: `${d.readinessPct}%`, background: d.readinessPct > 70 ? "var(--ok)" : d.readinessPct > 40 ? "var(--warn)" : "var(--bad)" }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ТАБЛИЦА РАБОЧИХ МЕСТ С ФИЛЬТРАЦИЕЙ И ПЕРЕХОДОМ В КАРТОЧКУ */}
      <Panel
        title="Предиктивный скоринг рабочих мест"
        hint="Адресная вероятность сбоя для каждого АРМ с учетом примененных мер What-If"
      >
        <div className="ws-tools" style={{ marginBottom: "16px" }}>
          <input
            className="search ws-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Найти АРМ или подразделение..."
          />
          <div className="seg">
            {[["", "Все", simulatedList.length], ["Низкий", "Волна 1", count("Низкий")], ["Умеренный", "Волна 2", count("Умеренный")], ["Высокий", "Волна 3", count("Высокий")]].map(([v, l, n]) => (
              <button
                key={l}
                className={st === v ? "on" : ""}
                onClick={() => setSt(v)}
              >
                {l} <span>{n}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Рабочее место</th>
                <th>Подразделение</th>
                <th>Ключевой фактор риска</th>
                <th style={{ textAlign: "right" }}>Вероятность инцидента</th>
                <th style={{ textAlign: "center" }}>Волна миграции</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((w, i) => (
                <tr
                  key={w.workstation_id}
                  style={{ "--i": i % 15, cursor: "pointer" }}
                  onClick={() => w.raw_workstation && onPick && onPick(w.raw_workstation)}
                >
                  <td style={{ fontWeight: "700", color: "var(--ice)" }}>{w.workstation_id}</td>
                  <td>{w.department}</td>
                  <td style={{ color: "var(--muted)", fontSize: "13px" }}>{w.key_risk_factor}</td>
                  <td style={{ textAlign: "right", fontWeight: "700", fontVariantNumeric: "tabular-nums" }}>
                    {w.incident_probability}%
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`status ${toneMap[w.risk_level] || "ready"}`}>
                      {w.risk_level === "Низкий" ? "Волна 1" : w.risk_level === "Умеренный" ? "Волна 2" : "Волна 3"}
                    </span>
                  </td>
                  <td className="chev">→</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="empty">Ничего не найдено по текущим фильтрам.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
