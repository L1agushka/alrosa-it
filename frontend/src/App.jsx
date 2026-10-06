import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { Count, Panel, StatusBadge } from "./ui";
import Mosaic from "./Mosaic";
import Builder from "./Builder";
import Workstations from "./Workstations";
import Welcome from "./Welcome";
import { analogs, defaultCriteria, download, evaluate, makeFleet, parseCsv, template } from "./engine";

const navigation = [
  { id: "dashboard", icon: "◇", title: "Обзор" },
  { id: "workstations", icon: "▦", title: "Рабочие места" },
  { id: "criteria", icon: "☰", title: "Критерии" },
  { id: "waves", icon: "≋", title: "Волны перехода" },
  { id: "report", icon: "▤", title: "Отчёт" },
  { id: "builder", icon: "⬡", title: "Конфигуратор ПК" },
];
const statuses = ["Готов", "Частично", "Не готов"];

function Criteria({ c, set }) {
  const row = (key, label, min, max, step, unit) => (
    <label className="slider" key={key}>
      <span>{label}<strong>{c[key]} {unit}</strong></span>
      <input type="range" min={min} max={max} step={step} value={c[key]} onChange={(e) => set({ ...c, [key]: +e.target.value })} />
    </label>
  );
  return (
    <div className="sliders">
      {row("minRam", "Минимум ОЗУ", 4, 32, 4, "ГБ")}
      {row("minCores", "Минимум ядер процессора", 2, 8, 1, "")}
      {row("maxGap", "Допустимая доля ПО без аналога", 0, 50, 5, "%")}
    </div>
  );
}

function ScanButton({ total, ready, onScan }) {
  const [phase, setPhase] = useState("idle");
  const [n, setN] = useState(0);
  const raf = useRef(0);
  const timer = useRef(0);
  useEffect(() => () => { cancelAnimationFrame(raf.current); clearTimeout(timer.current); }, []);

  const run = () => {
    if (phase === "run") return;
    cancelAnimationFrame(raf.current); clearTimeout(timer.current);
    onScan(); setPhase("run"); setN(0);
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / 1500, 1);
      setN(Math.round(total * (1 - (1 - p) * (1 - p))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else { setPhase("done"); timer.current = setTimeout(() => setPhase("idle"), 2600); }
    };
    raf.current = requestAnimationFrame(tick);
  };

  return (
    <button className={`scan ${phase}`} onClick={run} aria-live="polite">
      <span className="scan-ring" aria-hidden="true" />
      <span className="scan-in">
        {phase === "done" ? (
          <svg viewBox="0 0 24 24" className="scan-ico tick"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        ) : (
          <svg viewBox="0 0 32 32" className="scan-ico"><path d="M16 2 28 12 16 30 4 12Z" /><path d="M4 12h24M11 12l5 18 5-18M11 12l5-10 5 10" /></svg>
        )}
        <span className="scan-text">
          {phase === "idle" && "Запустить анализ"}
          {phase === "run" && <>Проверяем <b>{n}</b> из {total}</>}
          {phase === "done" && <>Готово: <b>{ready}</b> из {total} готовы</>}
        </span>
        <span className="scan-bar" style={{ transform: `scaleX(${phase === "run" ? n / total : 0})` }} />
      </span>
    </button>
  );
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [fleet, setFleet] = useState(makeFleet);
  const [c, setC] = useState(defaultCriteria);
  const [scanKey, setScanKey] = useState(0);
  const [focus, setFocus] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [entered, setEntered] = useState(false);

  const rows = useMemo(() => fleet.map((w) => w.fromBackend ? w : evaluate(w, c)), [fleet, c]);
  const n = (s) => rows.filter((r) => r.status === s).length;
  const ready = n("Готов");

  const blockers = useMemo(() => {
    const m = {};
    rows.forEach((r) => r.blockers.forEach((b) => { m[b.type] = m[b.type] || { count: 0, fix: b.fix }; m[b.type].count++; }));
    return Object.entries(m).sort((a, b) => b[1].count - a[1].count);
  }, [rows]);

  const waves = ["Волна 1", "Волна 2", "Волна 3", "—"].map((w) => [w, rows.filter((r) => r.wave === w)]);

  const upload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      setError("");
      const formData = new FormData();
      formData.append("file", f);
      formData.append("target_os", "Astra Linux Special Edition 1.7");

      const res = await fetch("/api/v1/audit/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Ошибка при аудите на сервере");
      }

      const data = await res.json();
      const statusMap = {
        ready: "Готов",
        upgrade_required: "Частично",
        blocked: "Не готов"
      };

      const serverFleet = data.workstations.map((ws) => {
        const blockers = [];
        (ws.hardware_issues || []).forEach((h) => {
          blockers.push({ type: "Оборудование", text: h, fix: "Модернизировать комплектующие" });
        });
        (ws.blocking_software || []).forEach((s) => {
          blockers.push({ type: "ПО", text: s, fix: "Заменить на отечественный аналог" });
        });

        return {
          fromBackend: true,
          id: ws.workstation_id,
          user: ws.user_fullname || "—",
          department: ws.department || "—",
          os: "Windows",
          ram: ws.hardware_issues?.length ? "2-4" : 8,
          cores: 4,
          programs: blockers.filter((b) => b.type === "ПО").length,
          compatible: blockers.filter((b) => b.type === "ПО").length === 0 ? "Все" : "Частично",
          status: statusMap[ws.status] || "Частично",
          wave: ws.wave ? `Волна ${ws.wave}` : "—",
          blockers,
        };
      });

      setFleet(serverFleet);
      setScanKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
    e.target.value = "";
  };

  const exportReport = () =>
    download("otchet-migracii.csv", "id;user;department;status;wave;blockers\n" +
      rows.map((r) => [r.id, r.user, r.department, r.status, r.wave, r.blockers.map((b) => b.text).join(" | ")].join(";")).join("\n"));

  const scan = () => { setPage("dashboard"); setScanKey((k) => k + 1); };

  return (
    <div className="app">
      <div className="bg-glow" aria-hidden="true" />
      {!entered && <Welcome onEnter={() => { setEntered(true); setScanKey((k) => k + 1); }} />}
      <aside className="sidebar">
        <div className="brand">
          <svg viewBox="0 0 32 32" className="brand-logo"><path d="M16 2 28 12 16 30 4 12Z" /><path d="M4 12h24M11 12l5 18 5-18M11 12l5-10 5 10" /></svg>
          <div><div className="brand-title">ALROSA IT</div><div className="brand-subtitle">Центр миграции</div></div>
        </div>
        <nav className="navigation">
          {navigation.map((i) => (
            <button key={i.id} className={`nav-item ${page === i.id ? "active" : ""}`} onClick={() => setPage(i.id)}>
              <span className="nav-icon">{i.icon}</span><span>{i.title}</span>
            </button>
          ))}
        </nav>
        <div className="user-card">
          <div className="avatar">АБ</div>
          <div className="user-info"><strong>Артур Бучинский</strong><span>Администратор</span></div>
          <span className="online-dot" />
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1 key={page}>{navigation.find((i) => i.id === page).title}</h1>
          <ScanButton total={rows.length} ready={ready} onScan={scan} />
        </header>

        <div className="page" key={page}>
          {page === "dashboard" && (
            <>
              <section className="hero">
                <div className="hero-text">
                  <p>Готовность парка к переходу на отечественную ОС</p>
                  <div className="hero-num"><Count to={(ready / rows.length) * 100} decimals={1} suffix="%" /></div>
                  <span className="hero-sub">{ready} из {rows.length} рабочих мест можно переводить уже сейчас</span>
                  <div className="legend-btns">
                    {statuses.map((s) => (
                      <button key={s} className={`chip ${focus === s ? "on" : ""}`} onClick={() => setFocus(focus === s ? null : s)}>
                        <i className={s === "Готов" ? "ok" : s === "Частично" ? "warn" : "bad"} />{s}<strong>{n(s)}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="hero-criteria"><Criteria c={c} set={setC} /></div>
                </div>
                <Mosaic rows={rows} scanKey={scanKey} focus={focus} onPick={setSelected} />
              </section>

              <Panel title="Блокирующие факторы" hint="Что мешает переводу сейчас. Меняйте критерии выше и смотрите, как карта перекрашивается.">
                <div className="problems">
                  {blockers.map(([t, v]) => (
                    <div className="problem" key={t}>
                      <strong className="problem-count">{v.count}</strong>
                      <div><strong>{t}</strong><span>{v.fix}</span></div>
                    </div>
                  ))}
                  {!blockers.length && <p className="empty">Блокеров нет. Все рабочие места проходят критерии.</p>}
                </div>
              </Panel>
            </>
          )}

          {page === "workstations" && <Workstations rows={rows} c={c} onPick={setSelected} onUpload={upload} error={error} />}

          {page === "criteria" && (
            <section className="content-grid">
              <Panel title="Критерии оборудования" hint="Изменения сразу пересчитывают статусы всех рабочих мест."><Criteria c={c} set={setC} /></Panel>
              <Panel title="Справочник совместимости ПО" hint="Чем заменяем привычные программы">
                <table><tbody>
                  {analogs.map(([a, b, s]) => (
                    <tr key={a}><td><strong>{a}</strong></td><td>{b}</td><td><span className={`status ${s === "Есть" ? "ready" : s === "Нет аналога" ? "blocked" : "partial"}`}>{s}</span></td></tr>
                  ))}
                </tbody></table>
              </Panel>
            </section>
          )}

          {page === "waves" && (
            <section className="wave-cols">
              {waves.map(([w, list], i) => (
                <div className="panel" key={w} style={{ "--i": i }}>
                  <div className="panel-header"><div><h3>{w === "—" ? "Не определено" : w}</h3><p>{list.length} рабочих мест</p></div></div>
                  <div className="chips">
                    {list.slice(0, 36).map((r, k) => <span key={r.id} className={`mini ${r.status === "Готов" ? "ok" : r.status === "Частично" ? "warn" : "bad"}`} style={{ "--k": k }} onClick={() => setSelected(r)}>{r.id.slice(4)}</span>)}
                    {list.length > 36 && <span className="more">+{list.length - 36}</span>}
                  </div>
                </div>
              ))}
            </section>
          )}

          {page === "report" && (
            <>
              <Panel title="Итоги и рекомендации" hint="Отчёт строится по текущим критериям"
                action={<div className="tools"><button className="ghost-btn" onClick={exportReport}>Скачать CSV</button><button className="ghost-btn" onClick={() => window.print()}>Печать</button></div>}>
                <div className="stats-grid">
                  {[["Всего", rows.length, ""], ["Готовы", ready, "ok"], ["Частично", n("Частично"), "warn"], ["Не готовы", n("Не готов"), "bad"]].map(([l, v, t], i) => (
                    <div className={`stat-card ${t}`} key={l} style={{ "--i": i }}><span>{l}</span><strong><Count to={v} /></strong></div>
                  ))}
                </div>
              </Panel>
              <Panel title="Что сделать">
                <ol className="recs">
                  <li><strong>Волна 1 ({waves[0][1].length} мест).</strong> Переводить немедленно: оборудование и ПО полностью подходят.</li>
                  {blockers.map(([t, v]) => <li key={t}><strong>{t}: {v.count} мест.</strong> {v.fix}.</li>)}
                  <li><strong>Волна 3 ({waves[2][1].length} мест).</strong> Сначала согласовать замену ПО с пользователями.</li>
                </ol>
              </Panel>
            </>
          )}

          {page === "builder" && <Builder criteria={c} />}
        </div>
      </main>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{selected.id}</h2><button className="close-button" aria-label="Закрыть" onClick={() => setSelected(null)}>×</button></div>
            <div className="modal-status"><StatusBadge status={selected.status} /><span>{selected.wave}</span></div>
            <div className="details-grid">
              <div><span>Сотрудник</span><strong>{selected.user}</strong></div>
              <div><span>Отдел</span><strong>{selected.department}</strong></div>
              <div><span>ОЗУ / ядра</span><strong>{selected.ram} ГБ / {selected.cores}</strong></div>
              <div><span>ПО с аналогом</span><strong>{selected.compatible} из {selected.programs}</strong></div>
            </div>
            <h3 className="modal-sub">Блокеры и что делать</h3>
            {selected.blockers.length ? selected.blockers.map((b) => <div className="check-row" key={b.type}><span>{b.text}</span><em>{b.fix}</em></div>) : <p className="empty">Блокеров нет. Можно переводить.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;