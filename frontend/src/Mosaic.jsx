import { useMemo, useRef, useState } from "react";
import Office from "./Office";

const cls = { "Готов": "ok", "Частично": "warn", "Не готов": "bad" };
const SX = 30, SY = 25, W = 760, R = 13;
const hex = [[0, -R], [R * 0.866, -R / 2], [R * 0.866, R / 2], [0, R], [-R * 0.866, R / 2], [-R * 0.866, -R / 2]].map((p) => p.join(",")).join(" ");
const modes = [["grid", "Все"], ["office", "Офис"], ["status", "Статусы"], ["wave", "Волны"], ["dept", "Отделы"]];
const keyOf = { status: (r) => r.status, wave: (r) => (r.wave === "—" ? "Не определено" : r.wave), dept: (r) => r.department };

function layout(rows, mode) {
  const pos = {}, labels = [];
  if (mode === "grid") {
    const w = 16 * SX + SX / 2, ox = (W - w) / 2 + R;
    rows.forEach((r, i) => { const c = i % 16, rw = Math.floor(i / 16); pos[r.id] = [ox + c * SX + (rw % 2 ? SX / 2 : 0), 30 + rw * SY]; });
    return { pos, labels, h: Math.ceil(rows.length / 16) * SY + 60 };
  }
  const groups = {};
  rows.forEach((r) => (groups[keyOf[mode](r)] ||= []).push(r));
  const order = mode === "status" ? ["Готов", "Частично", "Не готов"] : Object.keys(groups).sort();
  let x = 0, y = 0, rowH = 0;
  order.filter((k) => groups[k]).forEach((k) => {
    const list = groups[k], cols = Math.max(4, Math.ceil(Math.sqrt(list.length * 1.5))), rws = Math.ceil(list.length / cols);
    const bw = cols * SX + SX / 2 + 24, bh = rws * SY + 56;
    if (x + bw > W && x > 0) { x = 0; y += rowH; rowH = 0; }
    labels.push({ x: x + 4, y: y + 14, text: k, n: list.length });
    list.forEach((r, i) => { const c = i % cols, rw = Math.floor(i / cols); pos[r.id] = [x + R + 4 + c * SX + (rw % 2 ? SX / 2 : 0), y + 42 + rw * SY]; });
    x += bw; rowH = Math.max(rowH, bh);
  });
  return { pos, labels, h: y + rowH };
}

/* подсказка живёт в своём компоненте: наведение не перерисовывает всю карту */
function Info({ bind, rows }) {
  const [hov, setHov] = useState(null);
  bind.current = setHov;
  const dept = hov && rows.filter((r) => r.department === hov.department);
  return (
    <div className="mz-info">
      {hov ? (
        <>
          <strong>{hov.id}</strong><span>{hov.department}</span><span>{hov.status}</span>
          <em>{hov.blockers.length ? hov.blockers.map((b) => b.type).join(" · ") : "блокеров нет"}</em>
          <span className="mz-dept">В отделе готовы {dept.filter((r) => r.status === "Готов").length} из {dept.length}</span>
        </>
      ) : "Наведите на человечка или камень: подсветится весь отдел"}
    </div>
  );
}

export default function Mosaic({ rows, scanKey, focus, onPick }) {
  const [mode, setMode] = useState("grid");
  const [done, setDone] = useState([]);
  const info = useRef(() => {});
  const last = useRef(null);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const depts = useMemo(() => [...new Set(rows.map((r) => r.department))].sort(), [rows]);
  const di = useMemo(() => Object.fromEntries(depts.map((d, i) => [d, i])), [depts]);
  /* подсветка отдела — чистый CSS по атрибуту data-hov, без перерисовок React */
  const css = useMemo(() => depts.map((_, i) => `.mz[data-hov="${i}"] .c:not([data-d="${i}"]),.mz[data-hov="${i}"] .rg:not([data-d="${i}"]){opacity:.18}`).join(""), [depts]);
  const { pos, labels, h } = useMemo(() => layout(rows, mode === "office" ? "grid" : mode), [rows, mode]);

  const clear = (root) => { if (last.current) { last.current = null; delete root.dataset.hov; info.current(null); } };
  const over = (e) => {
    const g = e.target.closest?.("[data-id]"), root = e.currentTarget;
    if (!g) return clear(root);
    if (g.dataset.id === last.current) return;
    last.current = g.dataset.id;
    const r = byId.get(g.dataset.id);
    root.dataset.hov = di[r.department];
    info.current(r);
  };

  const moved = rows.filter((r) => done.includes(r.wave)).length;
  const toggle = (w) => setDone((d) => (d.includes(w) ? d.filter((x) => x !== w) : [...d, w]));

  return (
    <div className="mz" onPointerOver={over} onPointerLeave={(e) => clear(e.currentTarget)} onFocus={over} onBlur={(e) => clear(e.currentTarget)}>
      <style>{css}</style>
      <div className="mz-bar">
        <div className="seg" role="tablist">
          {modes.map(([k, l]) => <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? "on" : ""} onClick={() => setMode(k)}>{l}</button>)}
        </div>
        {mode === "office" ? (
          <div className="move">
            <span>Переезд на новую ОС</span>
            {["Волна 1", "Волна 2", "Волна 3"].map((w) => <button key={w} className={done.includes(w) ? "on" : ""} onClick={() => toggle(w)}>{w}</button>)}
            <strong>{moved}</strong>
          </div>
        ) : <span className="mz-hint">{mode === "grid" ? "Один шестиугольник = одно рабочее место" : "Камни перегруппированы"}</span>}
      </div>

      {mode === "office" ? (
        <Office rows={rows} di={di} focus={focus} onPick={onPick} scanKey={scanKey} done={done} />
      ) : (
        <div className="mz-stage">
          <div className="beam" key={"b" + scanKey} />
          <svg viewBox={`0 0 ${W} ${Math.max(300, h + 10)}`} className="mz-svg">
            <g key={mode} className="labels">
              {labels.map((l) => <text key={l.text} x={l.x} y={l.y}>{l.text}<tspan dx="8">{l.n}</tspan></text>)}
            </g>
            <g key={scanKey}>
              {rows.map((r, i) => {
                const [x, y] = pos[r.id];
                return (
                  <g key={r.id} className={`c ${cls[r.status]}${focus && focus !== r.status ? " faded" : ""}`} data-id={r.id} data-d={di[r.department]}
                    tabIndex="0" role="button" aria-label={`${r.id}, ${r.status}`}
                    style={{ transform: `translate(${x}px, ${y}px)`, transitionDelay: `${(i % 24) * 14}ms`, "--d": (i % 16) * 55 }}
                    onClick={() => onPick(r)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick(r)}>
                    <polygon points={hex} className="hex" />
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}

      <Info bind={info} rows={rows} />
    </div>
  );
}