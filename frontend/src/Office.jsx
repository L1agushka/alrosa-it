import { useMemo } from "react";

const cls = { "Готов": "ok", "Частично": "warn", "Не готов": "bad" };
const SX = 34, SY = 38, W = 760, COLS = 4, RW = COLS * SX + 28, GAP = 12;

function plan(rows) {
  const groups = {};
  rows.forEach((r) => (groups[r.department] ||= []).push(r));
  const rooms = [], pos = {}, rowMax = [];
  let x = 0, y = 0, row = 0;
  Object.keys(groups).sort().forEach((name) => {
    const list = groups[name], h = Math.ceil(list.length / COLS) * SY + 52;
    if (x + RW > W && x > 0) { x = 0; row++; y += (rowMax[row - 1] || 0) + GAP; }
    rowMax[row] = Math.max(rowMax[row] || 0, h);
    rooms.push({ x, y, row, name, list });
    list.forEach((r, i) => { pos[r.id] = [x + 14 + SX / 2 + (i % COLS) * SX, y + 56 + Math.floor(i / COLS) * SY]; });
    x += RW + GAP;
  });
  return { rooms: rooms.map((r) => ({ ...r, h: rowMax[r.row] })), pos, h: y + (rowMax[row] || 0) };
}

export default function Office({ rows, hov, setHov, focus, onPick, scanKey, done }) {
  const { rooms, pos, h } = useMemo(() => plan(rows), [rows]);

  return (
    <div className="mz-stage">
      <div className="beam" key={"b" + scanKey} />
      <svg viewBox={`0 0 ${W} ${h + 6}`} className="mz-svg" key={scanKey}>
        {rooms.map((r) => (
          <g key={r.name} className="room">
            <rect x={r.x} y={r.y} width={RW} height={r.h} rx="12" />
            <text x={r.x + 14} y={r.y + 24}>{r.name}</text>
            <text x={r.x + RW - 14} y={r.y + 24} className="room-n">
              {r.list.filter((w) => w.status === "Готов").length}/{r.list.length}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const [x, y] = pos[r.id];
          const moved = done.includes(r.wave);
          const faded = (focus && focus !== r.status) || (hov && hov.department !== r.department);
          return (
            <g key={r.id} className={`o ${cls[r.status]} ${moved ? "done" : ""} ${faded ? "faded" : ""}`} tabIndex="0" role="button"
              aria-label={`${r.id}, ${r.status}`} style={{ transform: `translate(${x}px, ${y}px)`, "--d": (i % 16) * 45, "--b": `${((i * 7) % 10) / 4}s` }}
              onMouseEnter={() => setHov(r)} onMouseLeave={() => setHov(null)} onFocus={() => setHov(r)} onBlur={() => setHov(null)}
              onClick={() => onPick(r)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick(r)}>
              <g className="pop">
                <g className="man">
                  <rect className="shirt" x="-6" y="-3" width="12" height="11" rx="5" />
                  <circle className="head" cy="-8" r="4.6" />
                </g>
                <rect className="desk" x="-12" y="4" width="24" height="9" rx="2.5" />
                <rect className="scr" x="-6" y="5.2" width="12" height="5.6" rx="1.2" />
                {!moved && r.status !== "Готов" && (
                  <g className="bub"><circle cy="-22" r="5.5" /><text y="-19.2">{r.status === "Не готов" ? "!" : "…"}</text></g>
                )}
                {moved && <path className="tick" d="M-3 -22 l2.4 2.6 l4.2 -5" />}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}