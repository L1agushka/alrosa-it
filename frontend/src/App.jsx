import RulesAndNLPTab from "./RulesAndNLPTab";
import WorkstationModal from "./WorkstationModal";
import SoftwareCatalog from "./SoftwareCatalog";
import AdminPanel from "./AdminPanel"; // 🆕 Импорт панели администратора
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import "./Design.css";
import { Count, Panel } from "./ui";
import Mosaic from "./Mosaic";
import Builder from "./Builder";
import Workstations from "./Workstations";
import Welcome from "./Welcome";
import MLAnalytics from "./MLAnalytics";
import LoginScreen from "./LoginScreen.jsx";
import { analogs, defaultCriteria, download, evaluate } from "./engine";
import { apiFetch } from "./api.js";

const navigation = [
    { id: "dashboard", icon: "◇", title: "Обзор" },
    { id: "workstations", icon: "▦", title: "Рабочие места" },
    { id: "criteria", icon: "☰", title: "Критерии" },
    { id: "waves", icon: "≋", title: "Волны перехода" },
    { id: "report", icon: "▤", title: "Отчёт" },
    { id: "builder", icon: "⬡", title: "Конфигуратор ПК" },
    { id: "ml", icon: "⌬", title: "Прогноз ML" },
    { id: "nlp-rules", icon: "◈", title: "Правила ПО" },
    { id: "admin", icon: "⚙️", title: "Управление" }, // 🆕
];

const statuses = ["Готов", "Частично", "Не готов"];

/* ─────────────────────────────────────────────
   Критерии: пороги (из ОС) + веса (из CriteriaWeight)
   ───────────────────────────────────────────── */
function Criteria({ c, set, osProfiles = [], targetOs, setTargetOs, canEdit, onSave }) {
    const selectedOs = osProfiles.find(p => p.name === targetOs);
    const osMinimums = {minRam:selectedOs?.min_ram_gb, minCores:selectedOs?.min_cpu_cores, minDisk:selectedOs?.min_disk_gb};
    const thresholdRow = (key, label, min, max, step) => (
        <label className="slider" key={key}>
            <span>{label}<strong>{c[key]}</strong></span>
            <input
                type="range"
                min={Math.max(min, osMinimums[key] || 0)} max={Math.max(max, c[key])} step={step}
                value={c[key]}
                disabled={!canEdit}
                onChange={(e) => set({ ...c, [key]: +e.target.value })}
            />
        </label>
    );

    const weightRow = (code, label) => {
        const value = c.weights?.[code] ?? 0;
        return (
            <label className="slider" key={code}>
                <span>{label}<strong>{value}</strong></span>
                <input
                    type="range"
                    min={0} max={100} step={5}
                    value={value}
                    disabled={!canEdit}
                    onChange={(e) =>
                        set({ ...c, weights: { ...c.weights, [code]: +e.target.value } })
                    }
                />
            </label>
        );
    };

    return (
        <div className="sliders">
            {osProfiles.length > 0 && (
                <label className="slider">
                    <span>Целевая ОС<strong>{targetOs}</strong></span>
                    <select
                        className="search"
                        style={{
                            width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8,
                            background: "var(--panel-2)", color: "var(--text)",
                            border: "1px solid var(--line)",
                        }}
                        value={targetOs}
                        onChange={(e) => {
                            const p = osProfiles.find((x) => x.name === e.target.value);
                            if (!p) return;
                            setTargetOs(p.name);
                            set({
                                ...c,
                                minRam: p.min_ram_gb,
                                minCores: p.min_cpu_cores,
                                minDisk: p.min_disk_gb,
                            });
                        }}
                    >
                        {osProfiles.map((p) => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                    </select>
                </label>
            )}

            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                Пороги оборудования (из выбранной ОС)
            </div>
            {thresholdRow("minRam",   "Мин. ОЗУ (ГБ)",       2, 32, 2)}
            {thresholdRow("minCores", "Мин. ядер CPU",       2, 16, 2)}
            {thresholdRow("minDisk",  "Мин. диск (ГБ)",     10, 500, 10)}
            {thresholdRow("maxGap",   "Макс. % ПО без аналога", 0, 100, 5)}

            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                Веса критериев (0–100)
            </div>
            {weightRow("ram",              "Вес: мало ОЗУ")}
            {weightRow("cpu",              "Вес: слабый CPU")}
            {weightRow("disk",             "Вес: мало диска")}
            {weightRow("blocker_software", "Вес: блокер ПО")}
            {weightRow("unknown_software", "Вес: ПО без аналога")}

            {onSave && (
                <button
                    className="ghost-btn"
                    style={{ marginTop: 8 }}
                    onClick={onSave}
                    disabled={!canEdit}
                >
                    Сохранить политику группы
                </button>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Кнопка запуска анализа
   ───────────────────────────────────────────── */
function ScanButton({ onScan }) {
 return <button className="ghost-btn overview-button" onClick={onScan}>Показать обзор</button>;
}

/* ─────────────────────────────────────────────
   Маппинг серверных данных.
   ───────────────────────────────────────────── */
const mapServerWorkstations = (workstations) => {
    return (workstations || []).map((ws) => {
        const assess = ws.assessment || {};
        const hwIssues = assess.hardware_issues || ws.hardware_issues || [];

        const swBlockersRaw = assess.blockers || ws.blocking_software || [];
        const swBlockers = swBlockersRaw.map((s) =>
            typeof s === "object"
                ? (s.software_name || s.name || s.message || s.reason || "Несовместимое ПО")
                : s
        );

        const installed = Array.isArray(ws.installed_software)
            ? ws.installed_software
            : [];

        return {
            fromBackend: true,
            id: ws.workstation_ext_id || ws.workstation_id || `WS-${ws.id}`,
            user: ws.user_fullname || "—",
            department:
                typeof ws.department === "object"
                    ? (ws.department?.name || "—")
                    : (ws.department || "—"),
            os: ws.current_os || "Windows",
            ram: Number(ws.ram_gb) || 0,
            cores: Number(ws.cpu_cores) || 0,
            disk: Number(ws.disk_gb) || 0,
            programs: installed.length || 4,
            compatible: Math.max(0, (installed.length || 4) - swBlockers.length),
            blockingSoftware: swBlockers,
            installed: installed, // массив имён установленного ПО
            _hwIssues: hwIssues,
            _serverAssessment: assess,
        };
    });
};

/* ─────────────────────────────────────────────
   Главный компонент
   ───────────────────────────────────────────── */
function App() {
    const [token, setToken] = useState(() => localStorage.getItem("alrosa_token"));
    const [me, setMe] = useState(null);

    const [page, setPage] = useState("dashboard");
    const [fleet, setFleet] = useState([]);
    const [auditSessions, setAuditSessions] = useState([]);
    const [softwareStats, setSoftwareStats] = useState([]);
    const [blockerStats, setBlockerStats] = useState(null);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    // Стейт для кастомных правил
    const [policies, setPolicies] = useState([]);
    const [group, setGroup] = useState("Общий");
    const [policyMessage, setPolicyMessage] = useState("");
    const [newGroup, setNewGroup] = useState("");

    const [c, setC] = useState(defaultCriteria);
    const [targetOs, setTargetOs] = useState("Astra Linux Special Edition 1.7");
    const [osProfiles, setOsProfiles] = useState([]);
    const [rawCompat, setRawCompat] = useState([]);

    const [scanKey, setScanKey] = useState(0);
    const [focus, setFocus] = useState(null);
    const [selected, setSelected] = useState(null);
    const [error, setError] = useState("");
    const [entered, setEntered] = useState(false);

    /* ─────────── загрузка при старте ─────────── */
    useEffect(() => {
        if (!token) return;

        // 1) Пользователь
        apiFetch("/api/v1/auth/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((u) => setMe(u))
            .catch(() => {});

        // 4) ОС + последний аудит
        Promise.all([
            apiFetch("/api/v1/catalog/os").then((r) => (r.ok ? r.json() : [])),
            apiFetch("/api/v1/audit/latest").then((r) => (r.ok ? r.json() : null)),
        ])
            .then(([profiles, latest]) => {
                setOsProfiles(profiles || []);

                const desired = latest?.target_os_name || profiles?.[0]?.name;
                const p =
                    (profiles || []).find((x) => x.name === desired) ||
                    (profiles || [])[0];

                if (p) {
                    setTargetOs(p.name);
                    setC((prev) => ({
                        ...prev,
                        minRam: p.min_ram_gb ?? prev.minRam,
                        minCores: p.min_cpu_cores ?? prev.minCores,
                        minDisk: p.min_disk_gb ?? prev.minDisk,
                    }));
                }

                if (latest?.workstations?.length) {
                    setFleet(mapServerWorkstations(latest.workstations));
                }
                if (latest?.id) setCurrentSessionId(latest.id);
            })
            .catch((err) => console.warn("os/latest:", err));

        // 5) Справочники
        apiFetch("/api/v1/catalog/compatibility")
            .then((r) => (r.ok ? r.json() : []))
            .then(setRawCompat)
            .catch((err) => console.warn("compat:", err));

        apiFetch("/api/v1/audit/history")
            .then((r) => (r.ok ? r.json() : []))
            .then((s) => setAuditSessions(s || []))
            .catch((err) => console.warn("history:", err));

        apiFetch("/api/v1/catalog/software")
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => {
                const counts = {};
                (data || []).forEach((sw) => {
                    const cat = sw.category || "Прочее";
                    counts[cat] = (counts[cat] || 0) + 1;
                });
                setSoftwareStats(
                    Object.entries(counts).map(([category, count]) => ({ category, count }))
                );
            })
            .catch((err) => console.warn("software:", err));
    }, [token]);

    // Блокеры — зависят от targetOs
    useEffect(() => {
        if (!token) return;
        apiFetch("/api/v1/stats/blockers" + (currentSessionId ? "?session_id=" + currentSessionId : ""))
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!data) return;
                const blockers = (data.top_software || []).map((item) => ({
                    name: item.key,
                    category: "ПО",
                    alternative: "Отечественный аналог",
                    comment: `Блокирует миграцию на ${item.count} АРМ`,
                }));
                setBlockerStats({ ...data, blockers });
            })
            .catch((err) => console.warn("blockers:", err));
    }, [targetOs, token, currentSessionId]);

    /* ─────────── справочник совместимости ─────────── */
    const compatList = useMemo(() => {
        if (!rawCompat.length) return analogs;
        const current = rawCompat.filter((it) => it.target_os_name === targetOs);
        if (!current.length) return analogs;
        return current.map((item) => {
            let label = "Есть";
            if (item.is_blocker || item.status === "blocker") label = "Нет аналога";
            else if (item.status === "web_alternative") label = "Вручную";
            else if (item.status === "partially_compatible") label = "Частично";
            return [item.software_name, item.analog_name || "—", label];
        });
    }, [rawCompat, targetOs]);

    const loadPolicies = async () => {
        const response = await apiFetch("/api/v1/criteria/groups");
        if (!response.ok) throw new Error("Не удалось загрузить политики групп");
        setPolicies(await response.json());
    };
    useEffect(() => {
        if (token) loadPolicies().catch(e => setError(e.message));
    }, [token, fleet]);

    useEffect(() => {
        const settings = policies.find(p => p.group_name === group)?.settings || {};
        const os = osProfiles.find(p => p.name === targetOs);
        setC({
            ...defaultCriteria, ...settings,
            minRam: Math.max(os?.min_ram_gb || 0, settings.minRam ?? os?.min_ram_gb ?? 4),
            minCores: Math.max(os?.min_cpu_cores || 0, settings.minCores ?? os?.min_cpu_cores ?? 2),
            minDisk: Math.max(os?.min_disk_gb || 0, settings.minDisk ?? os?.min_disk_gb ?? 30),
        });
    }, [group, policies, targetOs, osProfiles]);
    useEffect(() => setPolicyMessage(""), [group]);

    const canEdit = me?.role === "admin" || me?.role === "analyst";
    const groupSelector = (
        <div className="panel group-selector" style={{marginBottom: 20}}>
            <label>Группа рабочих мест
                <select className="search" value={group} onChange={e => setGroup(e.target.value)} style={{marginLeft: 16}}>
                    {policies.map(p => <option key={p.group_name}>{p.group_name}</option>)}
                </select>
            </label>
            {canEdit && <div style={{display:"flex", gap:12, marginTop:12}}>
                <input className="search" aria-label="Новая группа" placeholder="Название новой группы" value={newGroup} onChange={e => setNewGroup(e.target.value)} maxLength={255} />
                <button className="ghost-btn" onClick={async () => {
                    const name = newGroup.trim();
                    if (!name) return;
                    if (policies.some(p => p.group_name === name)) { setGroup(name); setNewGroup(""); return; }
                    try {
                        const res = await apiFetch("/api/v1/criteria/groups/" + encodeURIComponent(name), {
                            method:"PUT", headers:{"Content-Type":"application/json"},
                            body:JSON.stringify({...defaultCriteria, minRam:null, minCores:null, minDisk:null})
                        });
                        if (!res.ok) throw new Error("Не удалось создать группу");
                        await loadPolicies(); setGroup(name); setNewGroup("");
                    } catch (e) { setError(e.message); }
                }}>Создать группу</button>
            </div>}
            <p>Политика применяется к рабочим местам этого подразделения в реестре. У каждой группы свои пороги, веса и правила ПО.</p>
            {policyMessage && <p role="status">{policyMessage}</p>}
        </div>
    );
    const rows = useMemo(() => fleet.map(w => {
        const policy = policies.find(p => p.group_name === w.department);
        const settings = policy?.settings || defaultCriteria;
        const os = osProfiles.find(p => p.name === targetOs);
        const config = w.department === group ? c : {
            ...defaultCriteria, ...settings,
            minRam: Math.max(os?.min_ram_gb || 0, settings.minRam ?? os?.min_ram_gb ?? 4),
            minCores: Math.max(os?.min_cpu_cores || 0, settings.minCores ?? os?.min_cpu_cores ?? 2),
            minDisk: Math.max(os?.min_disk_gb || 0, settings.minDisk ?? os?.min_disk_gb ?? 30),
        };
        return evaluate(w, {...config,
            minRam:Math.max(os?.min_ram_gb || 0, config.minRam),
            minCores:Math.max(os?.min_cpu_cores || 0, config.minCores),
            minDisk:Math.max(os?.min_disk_gb || 0, config.minDisk),
        }, policy?.rules || [], rawCompat.filter(r => r.target_os_name === targetOs));
    }), [fleet, c, policies, group, rawCompat, targetOs, osProfiles]);

    const n = (s) => rows.filter((r) => r.status === s).length;
    const ready = n("Готов");

    const blockers = useMemo(() => {
        const m = {};
        rows.forEach((r) =>
            r.blockers.forEach((b) => {
                m[b.type] = m[b.type] || { count: 0, fix: b.fix };
                m[b.type].count++;
            })
        );
        return Object.entries(m).sort((a, b) => b[1].count - a[1].count);
    }, [rows]);

    const waves = ["Волна 1", "Волна 2", "Волна 3", "—"].map((w) => [
        w,
        rows.filter((r) => r.wave === w),
    ]);

    /* ─────────── загрузка аудита ─────────── */
    const upload = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
            setError("");
            const formData = new FormData();
            formData.append("file", f);
            formData.append("target_os", targetOs);

            const res = await apiFetch("/api/v1/audit/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Ошибка при аудите на сервере");
            }

            const data = await res.json();
            setFleet(mapServerWorkstations(data.workstations));
            setScanKey((k) => k + 1);

            apiFetch("/api/v1/audit/history")
                .then((r) => (r.ok ? r.json() : []))
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

    /* ─────────── сохранение весов на сервер ─────────── */
    const saveCriteria = async () => {
        try {
            setError("");
            const res = await apiFetch("/api/v1/criteria/groups/" + encodeURIComponent(group), {
                method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(c)
            });
            if (!res.ok) throw new Error("Политика не сохранена: проверьте права и значения");
            await loadPolicies();
            setPolicyMessage("Политика группы сохранена. Для нового исторического снимка загрузите аудит повторно.");
        } catch(e) { setError(e.message); }
    };

    /* ─────────── экспорт / scan ─────────── */
    const exportReport = () =>
        download(
            "otchet-migracii.csv",
            "id;user;department;status;wave;blockers\n" +
            rows
                .map((r) =>
                    [
                        r.id, r.user, r.department, r.status, r.wave,
                        r.blockers.map((b) => b.text).join(" | "),
                    ].map(value => {
                        let text = String(value ?? "");
                        if (/^[=+@-]/.test(text)) text = "'" + text;
                        return '"' + text.replaceAll('"', '""') + '"';
                    }).join(";")
                )
                .join("\n")
        );

    const scan = () => { setPage("dashboard"); setScanKey((k) => k + 1); };

    /* ─────────── guard ─────────── */
    if (!token) {
        return (
            <LoginScreen
                onLogin={(t) => {
                    localStorage.setItem("alrosa_token", t);
                    setToken(t);
                }}
            />
        );
    }

    const isAdmin = me?.role === "admin"; // 🆕 Отдельный флаг для админа

    return (
        <div className="app">
            <a className="skip-link" href="#main-content">К содержимому</a>
            {!entered && (
                <Welcome
                    onEnter={() => {
                        setEntered(true);
                        setScanKey((k) => k + 1);
                    }}
                />
            )}

            <aside className="sidebar" inert={!entered ? true : undefined}>
                <div className="brand">
                    <svg viewBox="0 0 32 32" className="brand-logo">
                        <path d="M16 2 28 12 16 30 4 12Z" />
                        <path d="M4 12h24M11 12l5 18 5-18M11 12l5-10 5 10" />
                    </svg>
                    <div>
                        <div className="brand-title">ALROSA IT</div>
                        <div className="brand-subtitle">Центр миграции</div>
                    </div>
                </div>
                <nav className="navigation" aria-label="Разделы сервиса">
                    {navigation.filter(i => i.id !== "admin" || isAdmin).map((i) => (
                        <button
                            key={i.id}
                            aria-current={page === i.id ? "page" : undefined}
                            className={`nav-item ${page === i.id ? "active" : ""}`}
                            onClick={() => setPage(i.id)}
                        >
                            <span className="nav-icon" aria-hidden="true">{i.icon}</span>
                            <span>{i.title}</span>
                        </button>
                    ))}
                </nav>
                <div className="user-card">
                    <div className="avatar">{me?.full_name?.[0] || "?"}</div>
                    <div className="user-info">
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {me?.full_name || "Пользователь"}
                        </div>
                        <span>{me?.role || ""}</span>
                    </div>
                    <button
                        className="ghost-btn"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        onClick={() => {
                            localStorage.removeItem("alrosa_token");
                            setToken(null);
                        }}
                    >
                        Выйти
                    </button>
                </div>
            </aside>

            <main className="main" inert={!entered ? true : undefined} id="main-content" tabIndex={-1}>
                <header className="topbar">
                    <h1 key={page}>
                        {navigation.find((i) => i.id === page)?.title || "Панель"}
                    </h1>
                    <div className="topbar-actions"><ScanButton onScan={scan} />{canEdit && <label className="upload-action">Загрузить реестр<input type="file" aria-label="Загрузить реестр CSV или XLSX" accept=".csv,.xlsx" onChange={upload} /></label>}</div>
                </header>

                <div className="page" key={page}>
                    {error && <div className="error" role="alert">{error}</div>}
                    {page === "dashboard" && (
                        <>
                            <section className="hero">
                                <div className="hero-text">
                                    <p>Готовность парка к переходу на отечественную ОС</p>
                                    <div className="hero-num">
                                        <Count
                                            to={(ready / (rows.length || 1)) * 100}
                                            decimals={1}
                                            suffix="%"
                                        />
                                    </div>
                                    <span className="hero-sub">
                    {ready} из {rows.length} рабочих мест соответствуют текущим правилам
                  </span>
                                    <div className="legend-btns">
                                        {statuses.map((s) => (
                                            <button
                                                key={s}
                                                className={`chip ${focus === s ? "on" : ""}`}
                                                onClick={() => setFocus(focus === s ? null : s)}
                                            >
                                                <i
                                                    className={
                                                        s === "Готов" ? "ok" : s === "Частично" ? "warn" : "bad"
                                                    }
                                                />
                                                {s}
                                                <strong>{n(s)}</strong>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="preview-note">Предпросмотр по действующим правилам групп. Перед переходом проверьте работу программ и оборудования.</p>
                                    <button className="ghost-btn" onClick={() => setPage("criteria")}>Проверить критерии групп</button>
                                </div>
                                <Mosaic
                                    rows={rows}
                                    scanKey={scanKey}
                                    focus={focus}
                                    onPick={setSelected}
                                />
                            </section>

                            <Panel title="Блокирующие факторы" hint="Что мешает переводу сейчас.">
                                <div className="problems">
                                    {blockers.map(([t, v]) => (
                                        <div className="problem" key={t}>
                                            <strong className="problem-count">{v.count}</strong>
                                            <div>
                                                <strong>{t}</strong>
                                                <span>{v.fix}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {!blockers.length && (
                                        <p className="empty">
                                            Блокирующих факторов не найдено. Проверьте полноту реестра перед переходом.
                                        </p>
                                    )}
                                </div>
                            </Panel>

                            <div className="content-grid" style={{ marginTop: 24 }}>
                                <Panel
                                    title="Справочный каталог ПО"
                                    hint={`Программы в справочнике (${softwareStats.reduce(
                                        (acc, s) => acc + s.count,
                                        0
                                    )} позиций)`}
                                >
                                    <div className="category-bars">
                                        {softwareStats.map((item) => {
                                            const maxVal = Math.max(
                                                ...softwareStats.map((s) => s.count), 1
                                            );
                                            const pct = Math.round((item.count / maxVal) * 100);
                                            return (
                                                <div className="category-bar-item" key={item.category}>
                                                    <div className="category-bar-header">
                                                        <span>{item.category}</span>
                                                        <strong>{item.count} ПО</strong>
                                                    </div>
                                                    <div className="category-bar-track">
                                                        <div
                                                            className="category-bar-fill"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {!softwareStats.length && <p className="empty">Каталог ПО пуст.</p>}
                                    </div>
                                </Panel>

                                <Panel
                                    title={`Причины в сохранённом аудите: ${blockerStats?.target_os || targetOs}`}
                                    hint={`Диагностика выбранного снимка из БД (${blockerStats?.total_blockers || 0} причин)`}
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
                                            <p className="empty">
                                                В сохранённом аудите причин по ПО не обнаружено.
                                            </p>
                                        )}
                                    </div>
                                </Panel>
                            </div>
                            <Panel title="Как пользоваться результатом" className="help-panel">
                              <details><summary>С чего начать?</summary><p>Настройте требования группы в разделе «Критерии», проверьте правила ПО и загрузите реестр CSV или XLSX. Шаблон доступен в разделе «Рабочие места».</p></details>
                              <details><summary>Почему одинаковые компьютеры попали в разные волны?</summary><p>Требования к оборудованию, допустимая доля ПО без аналога и исключения для программ задаются отдельно для каждой группы.</p></details>
                              <details><summary>Меняются ли прошлые аудиты после правки правил?</summary><p>Нет. Обзор показывает предпросмотр по текущим правилам, а сохранённый аудит остаётся снимком результата на момент загрузки.</p></details>
                              <details><summary>Можно ли сразу переносить все готовые места?</summary><p>Соответствие правилам помогает определить первую волну перехода. Совместимость драйверов, лицензий и рабочих сценариев нужно проверить отдельно.</p></details>
                              <details><summary>Как связаны ML и волны перехода?</summary><p>Волны определяет аудит по правилам. ML даёт отдельную оценку на синтетически обученной модели и не снимает блокирующие факторы.</p></details>
                            </Panel>
                        </>
                    )}

                    {page === "workstations" && (
                        <Workstations
                            rows={rows}
                            c={c}
                            onPick={setSelected}
                            onUpload={upload}
                            error={error}
                            canEdit={canEdit}
                        />
                    )}

                    {page === "criteria" && (
                        <div>{groupSelector}<section className="content-grid">
                            <Panel
                                title={"Критерии: " + group}
                                hint="Предпросмотр текущей политики. История аудитов сохраняет результат на момент загрузки."
                            >
                                <Criteria
                                    c={c}
                                    set={setC}
                                    osProfiles={osProfiles}
                                    targetOs={targetOs}
                                    setTargetOs={setTargetOs}
                                    canEdit={canEdit}
                                    onSave={canEdit ? saveCriteria : null}
                                />
                            </Panel>
                            <Panel
                                title="Справочник совместимости ПО"
                                hint="Каталог решений и аналогов из базы данных"
                            >
                                <SoftwareCatalog compatibility={rawCompat} rules={policies.find(p => p.group_name === group)?.rules || []} targetOs={targetOs} group={group} />
                            </Panel>
                        </section></div>
                    )}

                    {page === "waves" && (
                        <section className="wave-cols">
                            {waves.map(([w, list], i) => (
                                <div className="panel" key={w} style={{ "--i": i }}>
                                    <div className="panel-header">
                                        <div>
                                            <h3>{w === "—" ? "Не определено" : w}</h3>
                                            <p>{list.length} рабочих мест</p>
                                        </div>
                                    </div>
                                    <div className="chips">
                                        {list.slice(0, 36).map((r, k) => (
                                            <span
                                                key={r.id}
                                                className={`mini ${
                                                    r.status === "Готов"
                                                        ? "ok"
                                                        : r.status === "Частично"
                                                            ? "warn"
                                                            : "bad"
                                                }`}
                                                style={{ "--k": k }}
                                                onClick={() => setSelected(r)}
                                            >
                        {r.id.slice(4)}
                      </span>
                                        ))}
                                        {list.length > 36 && (
                                            <span className="more">+{list.length - 36}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {page === "report" && (
                        <>
                            <Panel
                                title="Итоги и рекомендации"
                                hint="Отчёт строится по текущим критериям"
                                action={
                                    <div className="tools">
                                        <button className="ghost-btn" onClick={exportReport}>
                                            Скачать CSV
                                        </button>
                                        <button
                                            className="ghost-btn"
                                            onClick={() => window.print()}
                                        >
                                            Печать
                                        </button>
                                    </div>
                                }
                            >
                                <div className="stats-grid">
                                    {[
                                        ["Всего", rows.length, ""],
                                        ["Готовы", ready, "ok"],
                                        ["Частично", n("Частично"), "warn"],
                                        ["Не готовы", n("Не готов"), "bad"],
                                    ].map(([l, v, t], i) => (
                                        <div className={`stat-card ${t}`} key={l} style={{ "--i": i }}>
                                            <span>{l}</span>
                                            <strong><Count to={v} /></strong>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                            <Panel title="Что сделать">
                                <ol className="recs">
                                    <li>
                                        <strong>Волна 1 ({waves[0][1].length} мест).</strong>{" "}
                                        Первая очередь перехода: оборудование и ПО соответствуют текущим правилам.
                                    </li>
                                    {blockers.map(([t, v]) => (
                                        <li key={t}>
                                            <strong>{t}: {v.count} мест.</strong> {v.fix}.
                                        </li>
                                    ))}
                                    <li>
                                        <strong>Волна 3 ({waves[2][1].length} мест).</strong>{" "}
                                        Сначала согласовать замену ПО с пользователями.
                                    </li>
                                </ol>
                            </Panel>
                        </>
                    )}

                    {page === "builder" && <Builder criteria={c} />}
                    {page === "ml" && <MLAnalytics fleet={fleet} onPick={setSelected} />}

                    {page === "nlp-rules" && (
                        <div>{groupSelector}<RulesAndNLPTab key={group}
                            group={group}
                            canEdit={canEdit}
                            onRulesChanged={(rules) => setPolicies(prev => prev.map(p => p.group_name === group ? {...p, rules} : p))}
                        /></div>
                    )}

                    {/* 🆕 Вкладка управления пользователями (только для админа) */}
                    {page === "admin" && isAdmin && <AdminPanel />}
                </div>
            </main>

            {selected && (
                <WorkstationModal selected={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}

export default App;