import { useRef, useState } from "react";

const cls = { "Готов": "ok", "Частично": "warn", "Не готов": "bad" };

export default function Mosaic({ rows, scanKey, focus, onPick }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const cols = 16;
  const lines = [];
  for (let i = 0; i < rows.length; i += cols) lines.push(rows.slice(i, i + cols));

  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", e.clientX - r.left + "px");
    ref.current.style.setProperty("--my", e.clientY - r.top + "px");
  };

  return (
    <div>
      <div className="mosaic" ref={ref} onMouseMove={move}>
        <div className="beam" key={"b" + scanKey} />
        <div className="spot" />
        <div key={scanKey}>
          {lines.map((line, ri) => (
            <div className="hrow" key={ri}>
              {line.map((w, ci) => (
                <button
                  key={w.id}
                  className={`cell ${cls[w.status]} ${focus && focus !== w.status ? "dim" : ""}`}
                  style={{ "--c": ci, "--r": ri }}
                  aria-label={`${w.id}, ${w.status}`}
                  onMouseEnter={() => setHover(w)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onPick(w)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mosaic-info">
        {hover ? (
          <><strong>{hover.id}</strong> {hover.department} · {hover.status} · {hover.blockers.length ? hover.blockers.map((b) => b.type).join(", ") : "блокеров нет"}</>
        ) : (
          "Наведите на кристалл: каждый — одно рабочее место"
        )}
      </div>
    </div>
  );
}

