import { useMemo, useState } from "react";
import { download, template } from "./engine";

const tone = { "Готов": "ok", "Частично": "warn", "Не готов": "bad" };
const order = { "Не готов": 0, "Частично": 1, "Готов": 2 };
const sorts = { id: "По номеру", status: "Сначала проблемные", gap: "По доле ПО без аналога" };

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
        <input className="search ws-search" value={q} onChange={set(setQ)} aria-label="Поиск рабочего места, сотрудника или отдела" placeholder="Найти место, сотрудника или отдел" />
        <div className="seg">
          {[["", "Все", rows.length], ...Object.keys(tone).map((s) => [s, s, count(s)])].map(([v, l, n]) => (
            <button key={l} className={st === v ? "on" : ""} onClick={() => { setSt(v); setLimit(24); }}>{l} <span>{n}</span></button>
          ))}
        </div>
        <select className="search" aria-label="Подразделение" value={dept} onChange={set(setDept)}>
          <option value="">Все отделы</option>{depts.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="search" aria-label="Порядок сортировки" value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.entries(sorts).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div className="ws-files">
          <label className="ghost-btn upload-trigger" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.querySelector("input").click(); } }}>Загрузить CSV<input type="file" accept=".csv" hidden onChange={onUpload} /></label>
          <button className="ghost-btn" onClick={() => download("shablon.csv", template)}>Шаблон</button>
        </div>
      </div>

      {error && <div className="error">{error}. Скачайте шаблон и сверьте названия колонок.</div>}
      <div className="ws-count">Найдено <strong>{list.length}</strong> из {rows.length}<span className="ws-legend">Порог: ОЗУ {c.minRam} ГБ · CPU {c.minCores} ядер</span></div>

      {list.length ? (
        <div className="fleet-table-wrap">
          <table className="fleet-table">
            <caption className="sr-only">Реестр рабочих мест и результаты оценки по текущим критериям</caption>
            <thead><tr><th scope="col">Рабочее место</th><th scope="col">Сотрудник / отдел</th><th scope="col">ОЗУ</th><th scope="col">CPU, ядра</th><th scope="col">ПО, проходит / всего</th><th scope="col">Готовность</th><th scope="col">Волна / факторы</th></tr></thead>
            <tbody>{list.slice(0, limit).map((w) => <tr key={w.id}>
              <th scope="row"><button className="device-link" onClick={() => onPick(w)}>{w.id}<span aria-hidden="true">↗</span></button></th>
              <td><strong>{w.user}</strong><small>{w.department}</small></td>
              <td className={w.ram < c.minRam ? "deficit" : ""}>{w.ram} <small>ГБ</small></td>
              <td className={w.cores < c.minCores ? "deficit" : ""}>{w.cores}</td>
              <td>{w.compatible}<span className="muted"> / {w.programs}</span></td>
              <td><span className={`registry-status ${tone[w.status]}`}><i />{w.status}</span></td>
              <td><span>{w.wave === "—" ? "Без волны" : w.wave}</span><small>{w.blockers.map((b) => b.type).join(" · ") || "Блокеров по критериям нет"}</small></td>
            </tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="ws-empty"><strong>Ничего не найдено</strong><span>Попробуйте изменить запрос или фильтры.</span><button className="ghost-btn" onClick={reset}>Сбросить фильтры</button></div>
      )}

      {list.length > limit && <button className="ghost-btn ws-more" onClick={() => setLimit(limit + 24)}>Показать ещё ({list.length - limit})</button>}
    </div>
  );
}