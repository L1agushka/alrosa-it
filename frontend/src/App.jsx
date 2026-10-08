import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { Count, Panel, StatusBadge } from "./ui";
import Mosaic from "./Mosaic";
import Builder from "./Builder";
import Workstations from "./Workstations";
import Welcome from "./Welcome";
import { analogs, defaultCriteria, download, evaluate, parseCsv, template } from "./engine";

const navigation = [
  { id: "dashboard", icon: "◇", title: "Обзор" },
  { id: "workstations", icon: "▦", title: "Рабочие места" },
  { id: "criteria", icon: "☰", title: "Критерии" },
  { id: "waves", icon: "≋", title: "Волны перехода" },
  { id: "report", icon: "▤", title: "Отчёт" },
  { id: "builder", icon: "⬡", title: "Конфигуратор ПК" },
];
const statuses = ["Готов", "Частично", "Не готов"];

function Criteria({ c, set, osProfiles = [], targetOs, setTargetOs }) {
  const row = (key, label, min, max, step, unit) => (
    <label className="slider" key={key}>
      <span>{label}<strong>{c[key]} {unit}</strong></span>
      <input type="range" min={min} max={max} step={step} value={c[key]} onChange={(e) => set({ ...c, [key]: +e.target.value })} />
    </label>
  );
  return (
    <div className="sliders">
      {osProfiles.length > 0 && (
        <label className="slider">
          <span>Целевая ОС (из БД)<strong>{targetOs}</strong></span>
          <select
            className="search"
            style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, background: "var(--panel-2)", color: "var(--text)", border: "1px solid var(--line)" }}
            value={targetOs}
            onChange={(e) => {
              const selectedName = e.target.value;
              setTargetOs(selectedName);
              const prof = osProfiles.find((p) => p.name === selectedName);
              if (prof) {
                set({ ...c, minRam: prof.min_ram_gb, minCores: prof.min_cpu_cores });
              }
            }}
          >
            {osProfiles.map((p) => (
              <option key={p.id} value={p.name}>{p.name} (ОЗУ: {p.min_ram_gb} ГБ, Ядра: {p.min_cpu_cores})</option>
            ))}
          </select>
        </label>
      )}
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


const mapServerWorkstations = (workstations) => {
  const statusMap = {
    ready: "Готов",
    upgrade_required: "Частично",
    blocked: "Не готов"
  };
  return (workstations || []).map((ws) => {
    const blockers = [];
    const assess = ws.assessment || {};
    const hwIssues = assess.hardware_issues || ws.hardware_issues || [];
    hwIssues.forEach((h) => {
      blockers.push({ type: "Оборудование", text: h, fix: "Модернизировать комплектующие" });
    });
    const swBlockers = assess.blockers || ws.blocking_software || [];
    swBlockers.forEach((s) => {
      const name = typeof s === "object" ? (s.software_name || s.name || s.reason || "Несовместимое ПО") : s;
      blockers.push({ type: "ПО", text: name, fix: "Заменить на отечественный аналог" });
    });
    const realId = ws.workstation_ext_id || ws.workstation_id || `WS-${ws.id}`;
    const installed = Array.isArray(ws.installed_software) ? ws.installed_software : [];
    return {
      fromBackend: true,
      id: realId,
      user: ws.user_fullname || "—",
      department: typeof ws.department === "object" ? (ws.department?.name || "—") : (ws.department || "—"),
      os: ws.current_os || "Windows",
      ram: Number(ws.ram_gb) || 8,
      cores: Number(ws.cpu_cores) || 4,
      disk: Number(ws.disk_gb) || 256,
      programs: installed.length || 4,
      compatible: Math.max(0, (installed.length || 4) - blockers.length),
      blockingSoftware: swBlockers,
      blockers,
    };
  });
};

const SYSTEM_USERS = [
  { id: "alex", name: "Алексей Старовойтов", role: "Системный администратор", initials: "АС" },
  { id: "artur", name: "Артур Бучинский", role: "Ведущий архитектор", initials: "АБ" },
  { id: "viktoria", name: "Виктория Чуносова", role: "Backend-разработчик", initials: "ВЧ" },
];

function App() {
  const [page, setPage] = useState("dashboard");
  const [fleet, setFleet] = useState([]);
    const [auditSessions, setAuditSessions] = useState([]);
  const [softwareStats, setSoftwareStats] = useState([]);
  const [blockerStats, setBlockerStats] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("alrosa_user_id");
    return SYSTEM_USERS.find((u) => u.id === saved) || SYSTEM_USERS[0];
  });
  const [c, setC] = useState(defaultCriteria);
  const [scanKey, setScanKey] = useState(0);
  const [focus, setFocus] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [entered, setEntered] = useState(false);
  const [targetOs, setTargetOs] = useState("Astra Linux Special Edition 1.7");
  const [osProfiles, setOsProfiles] = useState([]);
  const [rawCompat, setRawCompat] = useState([]);

  useEffect(() => {
    fetch("/api/v1/catalog/os")
      .then((res) => (res.ok ? res.json() : []))
      .then((profiles) => {
        if (profiles.length > 0) {
          setOsProfiles(profiles);
          setTargetOs(profiles[0].name);
          setC((prev) => ({
            ...prev,
            minRam: profiles[0].min_ram_gb,
            minCores: profiles[0].min_cpu_cores
          }));
        }
      })
      .catch((err) => console.warn("Failed to load OS profiles:", err));

    fetch("/api/v1/catalog/compatibility")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setRawCompat(data))
      .catch((err) => console.warn("Failed to load catalog from DB:", err));

        // Загрузка списка сессий аудита
    fetch("/api/v1/audit/history")
      .then((res) => (res.ok ? res.json() : []))
      .then((sessions) => {
        setAuditSessions(sessions || []);
      })
      .catch((err) => console.warn("Failed to load audit history:", err));

    fetch("/api/v1/audit/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((latest) => {
        if (latest && latest.workstations && latest.workstations.length > 0) {
          setFleet(mapServerWorkstations(latest.workstations));
          if (latest.target_os) setTargetOs(latest.target_os);
          if (latest.id) setCurrentSessionId(latest.id);
        }
      })
      .catch((err) => console.warn("Failed to load latest audit session:", err));
  }, []);

  const compatList = useMemo(() => {
    if (!rawCompat.length) return analogs;
    const currentList = rawCompat.filter((item) => item.target_os === targetOs);
    if (!currentList.length) return analogs;
    return currentList.map((item) => {
      let label = "Есть";
      if (item.is_blocker || item.status === "blocker") label = "Нет аналога";
      else if (item.status === "web_alternative") label = "Вручную";
      else if (item.status === "partially_compatible") label = "Частично";
      return [item.software_name, item.domestic_alternative || "—", label];
    });
  }, [rawCompat, targetOs]);

  const rows = useMemo(() => fleet.map((w) => evaluate(w, c)), [fleet, c]);
  const n = (s) => rows.filter((r) => r.status === s).length;
  const ready = n("Готов");

  const blockers = useMemo(() => {
    const m = {};
    rows.forEach((r) => r.blockers.forEach((b) => { m[b.type] = m[b.type] || { count: 0, fix: b.fix }; m[b.type].count++; }));
    return Object.entries(m).sort((a, b) => b[1].count - a[1].count);
  }, [rows]);

  const waves = ["Волна 1", "Волна 2", "Волна 3", "—"].map((w) => [w, rows.filter((r) => r.wave === w)]);



  // Загрузка статистики категорий ПО из БД
  useEffect(() => {
    fetch("/api/v1/catalog/software")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const counts = {};
        (data || []).forEach((sw) => {
          const cat = sw.category || "Прочее";
          counts[cat] = (counts[cat] || 0) + 1;
        });
        const stats = Object.entries(counts).map(([category, count]) => ({ category, count }));
        setSoftwareStats(stats);
      })
      .catch((err) => console.warn("Failed to load software stats:", err));
  }, []);

  // Загрузка статистики блокеров для выбранной целевой ОС
  useEffect(() => {
    fetch("/api/v1/stats/blockers")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const blockers = (data.top_software || []).map((item) => ({
          name: item.key,
          category: "ПО",
          alternative: "Отечественный аналог",
          comment: `Блокирует миграцию на ${item.count} АРМ`
        }));
        setBlockerStats({ ...data, blockers });
      })
      .catch((err) => console.warn("Failed to load blocker stats:", err));
  }, [targetOs]);

  const loadSession = async (sessionId) => {
    if (!sessionId) return;
    try {
      setError("");
      const res = await fetch(`/api/v1/audit/history/${sessionId}`);
      if (!res.ok) throw new Error("Не удалось загрузить выбранную сессию аудита");
      const session = await res.json();
      setCurrentSessionId(session.id);
      if (session.target_os) setTargetOs(session.target_os);
      setFleet(mapServerWorkstations(session.workstations));
      setScanKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  const upload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      setError("");
      const formData = new FormData();
      formData.append("file", f);
      formData.append("target_os", targetOs);

      const res = await fetch("/api/v1/audit/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Ошибка при аудите на сервере");
      }

      const data = await res.json();
      const serverFleet = mapServerWorkstations(data.workstations);

            setFleet(serverFleet);
      setScanKey((k) => k + 1);
      // Обновляем список сессий
      fetch("/api/v1/audit/history")
        .then((r) => r.ok && r.json())
        .then((s) => {
          if (s && s.length) {
            setAuditSessions(s);
            setCurrentSessionId(s[0].id);
          }
        });
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
          <div className="avatar">{currentUser.initials}</div>
          <div className="user-info">
            <select
              className="user-select"
              value={currentUser.id}
              onChange={(e) => {
                const u = SYSTEM_USERS.find((x) => x.id === e.target.value);
                if (u) {
                  setCurrentUser(u);
                  localStorage.setItem("alrosa_user_id", u.id);
                }
              }}
              title="Переключить учетную запись оператора"
            >
              {SYSTEM_USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <span>{currentUser.role}</span>
          </div>
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
                  <div className="hero-criteria"><Criteria c={c} set={setC} osProfiles={osProfiles} targetOs={targetOs} setTargetOs={setTargetOs} /></div>
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

              <div className="content-grid" style={{ marginTop: 24 }}>
                <Panel
                  title="Стек корпоративного ПО по категориям"
                  hint={`Каталог ПО предприятия из PostgreSQL (${softwareStats.reduce((acc, s) => acc + s.count, 0)} позиций)`}
                >
                  <div className="category-bars">
                    {softwareStats.map((item) => {
                      const maxVal = Math.max(...softwareStats.map((s) => s.count), 1);
                      const pct = Math.round((item.count / maxVal) * 100);
                      return (
                        <div className="category-bar-item" key={item.category}>
                          <div className="category-bar-header">
                            <span>{item.category}</span>
                            <strong>{item.count} ПО</strong>
                          </div>
                          <div className="category-bar-track">
                            <div className="category-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {!softwareStats.length && <p className="empty">Каталог ПО пуст.</p>}
                  </div>
                </Panel>

                <Panel
                  title={`Критические блокеры: ${targetOs}`}
                  hint={`Реестр системных несовместимостей из БД (${blockerStats?.total_blockers || 0} блокеров)`}
                >
                  <div className="db-blockers-list">
                    {blockerStats?.blockers?.map((b) => (
                      <div className="db-blocker-card" key={b.name}>
                        <div className="db-blocker-top">
                          <strong>{b.name}</strong>
                          <span className="db-blocker-badge">{b.category}</span>
                        </div>
                        <div className="db-blocker-alt">
                          ↳ Рекомендуемый аналог: <strong>{b.alternative}</strong>
                        </div>
                        <div className="db-blocker-comment">{b.comment}</div>
                      </div>
                    ))}
                    {(!blockerStats || !blockerStats.blockers?.length) && (
                      <p className="empty">Для выбранной ОС критических блокеров в базе не обнаружено.</p>
                    )}
                  </div>
                </Panel>
              </div>
            </>
          )}

          {page === "workstations" && <Workstations rows={rows} c={c} onPick={setSelected} onUpload={upload} error={error} />}

          {page === "criteria" && (
            <section className="content-grid">
              <Panel title="Критерии оборудования" hint="Изменения сразу пересчитывают статусы всех рабочих мест."><Criteria c={c} set={setC} osProfiles={osProfiles} targetOs={targetOs} setTargetOs={setTargetOs} /></Panel>
              <Panel title="Справочник совместимости ПО" hint="Чем заменяем привычные программы">
                <table><tbody>
                  {compatList.map(([a, b, s]) => (
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