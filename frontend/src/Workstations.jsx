import { useMemo, useState } from "react";
import { download, template } from "./engine";

const tone = { "Готов": "ok", "Частично": "warn", "Не готов": "bad" };
const order = { "Не готов": 0, "Частично": 1, "Готов": 2 };
const sorts = { id: "По номеру", status: "Сначала проблемные", gap: "По доле ПО без аналога" };

function Seg({ label, value, on, need }) {
  const n = 8, fail = on < need;
  return (
    <div className={`seg-row ${fail ? "fail" : ""}`}>
      <span>{label}</span>
      <div className="segs">
        {Array.from({ length: n }, (_, i) => (
          <i key={i} className={`${i < on ? "on" : ""} ${i === need - 1 ? "req" : ""}`} />
        ))}
      </div>
      <b>{value}</b>
    </div>
  );
}

function Card({ w, c, i, onPick }) {
  const ticks = Math.min(w.programs, 24);
  const good = Math.round((w.compatible / w.programs) * ticks);
  return (
    <button className={`wcard ${tone[w.status]}`} style={{ "--i": i }} onClick={() => onPick(w)}>
      <div className="wc-top">
        <span className="wc-id">{w.id}</span>
        <span className="wc-status"><i />{w.status}</span>
      </div>
      <div className="wc-user"><strong>{w.user}</strong><span>{w.department}</span></div>
      <div className="wc-body">
        <Seg label="ОЗУ" value={`${w.ram} ГБ`} on={Math.min(8, w.ram / 4)} need={Math.min(8, c.minRam / 4)} />
        <Seg label="Ядра" value={w.cores} on={Math.min(8, w.cores)} need={Math.min(8, c.minCores)} />
        <div className="ticks-row">
          <span>ПО <b>{w.compatible}/{w.programs}</b></span>
          <div className="ticks">{Array.from({ length: ticks }, (_, k) => <i key={k} className={k < good ? "ok" : "miss"} />)}</div>
        </div>
      </div>
      <div className="wc-foot">
        <span className="wc-wave">{w.wave === "—" ? "Без волны" : w.wave}</span>
        {w.blockers.map((b) => <em key={b.type}>{b.type}</em>)}
      </div>
    </button>
  );
}

export default function Workstations({ rows, c, onPick, onUpload, error }) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [dept, setDept] = useState("");
  const [sort, setSort] = useState("id");
  const [limit, setLimit] = useState(24);

  const depts = useMemo(() => [...new Set(rows.map((r) => r.department))].sort(), [rows]);
  const list = useMemo(() => {
    const t = q.toLowerCase();
    const f = rows.filter((r) => (!st || r.status === st) && (!dept || r.department === dept) && [r.id, r.user, r.department].some((x) => x.toLowerCase().includes(t)));
    if (sort === "status") f.sort((a, b) => order[a.status] - order[b.status] || a.id.localeCompare(b.id));
    if (sort === "gap") f.sort((a, b) => b.gap - a.gap);
    return f;
  }, [rows, q, st, dept, sort]);

  const reset = () => { setQ(""); setSt(""); setDept(""); };
  const count = (s) => rows.filter((r) => r.status === s).length;
  const set = (fn) => (e) => { fn(e.target.value); setLimit(24); };

  return (
    <div className="ws">
      <div className="ws-tools">
        <input className="search ws-search" value={q} onChange={set(setQ)} placeholder="Найти место, сотрудника или отдел" />
        <div className="seg">
          {[["", "Все", rows.length], ...Object.keys(tone).map((s) => [s, s, count(s)])].map(([v, l, n]) => (
            <button key={l} className={st === v ? "on" : ""} onClick={() => { setSt(v); setLimit(24); }}>{l} <span>{n}</span></button>
          ))}
        </div>
        <select className="search" value={dept} onChange={set(setDept)}>
          <option value="">Все отделы</option>{depts.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="search" value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.entries(sorts).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div className="ws-files">
          <label className="ghost-btn">Загрузить CSV<input type="file" accept=".csv" hidden onChange={onUpload} /></label>
          <button className="ghost-btn" onClick={() => download("shablon.csv", template)}>Шаблон</button>
        </div>
      </div>

      {error && <div className="error">{error}. Скачайте шаблон и сверьте названия колонок.</div>}
      <div className="ws-count">Найдено <strong>{list.length}</strong> из {rows.length}<span className="ws-legend"><i className="req" />отметка = минимум по критериям</span></div>

      {list.length ? (
        <div className="ws-grid">
          {list.slice(0, limit).map((w, i) => <Card key={w.id} w={w} c={c} i={i % 24} onPick={onPick} />)}
        </div>
      ) : (
        <div className="ws-empty"><strong>Ничего не найдено</strong><span>Попробуйте изменить запрос или фильтры.</span><button className="ghost-btn" onClick={reset}>Сбросить фильтры</button></div>
      )}

      {list.length > limit && <button className="ghost-btn ws-more" onClick={() => setLimit(limit + 24)}>Показать ещё ({list.length - limit})</button>}
    </div>
  );
}