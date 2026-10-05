import { memo, useMemo } from "react";

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

/* человечек, пузыри и галочка описаны ОДИН раз и вставляются через <use>:
   вместо ~9 узлов на человека остаётся 2–3 */
const bub = (stroke, ch) => (
  <>
    <circle cy="-22" r="5.5" style={{ fill: "#1c2838", stroke }} />
    <text y="-19.2" style={{ fill: "#e8eef5", fontSize: 8, fontWeight: 800, textAnchor: "middle" }}>{ch}</text>
  </>
);

function Office({ rows, di, focus, onPick, scanKey, done }) {
  const { rooms, pos, h } = useMemo(() => plan(rows), [rows]);

  return (
    <div className="mz-stage">
      <div className="beam" key={"b" + scanKey} />
      <svg viewBox={`0 0 ${W} ${h + 6}`} className="mz-svg" key={scanKey}>
        <defs>
          <g id="of-pc">
            <rect x="-6" y="-3" width="12" height="11" rx="5" style={{ fill: "#3a4b63" }} />
            <circle cy="-8" r="4.6" style={{ fill: "#e6d8c9" }} />
            <rect x="-12" y="4" width="24" height="9" rx="2.5" style={{ fill: "#1a2433", stroke: "#2e3f56" }} />
            <rect x="-6" y="5.2" width="12" height="5.6" rx="1.2" style={{ fill: "var(--scr)" }} />
          </g>
          <g id="of-bb">{bub("#de6b78", "!")}</g>
          <g id="of-bw">{bub("#e3b062", "…")}</g>
          <path id="of-tk" d="M-3 -22 l2.4 2.6 l4.2 -5" style={{ fill: "none", stroke: "#7fd8ff", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }} />
        </defs>

        {rooms.map((room, ri) => (
          <g key={room.name} className="rg" data-d={di[room.name]} style={{ "--r": ri }}>
            <rect className="room-bg" x={room.x} y={room.y} width={RW} height={room.h} rx="12" />
            <text className="room-t" x={room.x + 14} y={room.y + 24}>{room.name}</text>
            <text className="room-t room-n" x={room.x + RW - 14} y={room.y + 24}>
              {room.list.filter((w) => w.status === "Готов").length}/{room.list.length}
            </text>
            {room.list.map((r, i) => {
              const [x, y] = pos[r.id];
              const moved = done.includes(r.wave);
              return (
                <g key={r.id} transform={`translate(${x} ${y})`} data-id={r.id} tabIndex="0" role="button" aria-label={`${r.id}, ${r.status}`}
                  className={`o ${cls[r.status]}${moved ? " done" : ""}${focus && focus !== r.status ? " faded" : ""}`} style={{ "--d": (i % 16) * 40 }}
                  onClick={() => onPick(r)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick(r)}>
                  <use href="#of-pc" className="pp" />
                  {moved ? <use href="#of-tk" /> : r.status !== "Готов" && <use href={r.status === "Не готов" ? "#of-bb" : "#of-bw"} />}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default memo(Office);