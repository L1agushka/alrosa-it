import { useEffect, useRef, useState } from "react";

const name = "ALROSA IT".split("");
const team = ["Artur", "Viktoria", "Alex"];

export default function Welcome({ onEnter }) {
  const [leaving, setLeaving] = useState(false);
  const btn = useRef(null);
  const timer = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => btn.current?.focus(), 1800);
    return () => { clearTimeout(t); clearTimeout(timer.current); };
  }, []);

  const go = () => {
    if (leaving) return;
    setLeaving(true);
    timer.current = setTimeout(onEnter, 950);
  };

  return (
    <div className={`welcome ${leaving ? "leaving" : ""}`}>
      <div className="w-gridwrap" aria-hidden="true"><div className="w-grid" /></div>

      <div className="w-center">
        <div className="w-mark">
          <svg className="w-logo" viewBox="0 0 32 32" aria-hidden="true">
            <defs>
              <linearGradient id="wg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#d6f3ff" />
                <stop offset="1" stopColor="#4aa8d8" />
              </linearGradient>
            </defs>
            <path className="w-fill" d="M16 2 28 12 16 30 4 12Z" />
            <path className="w-line" pathLength="1" d="M16 2 28 12 16 30 4 12Z" />
            <path className="w-line w-late" pathLength="1" d="M4 12h24M11 12l5 18 5-18M11 12l5-10 5 10" />
            <path className="w-glint" d="M10.5 6.5l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9Z" />
          </svg>
        </div>

        <div className="w-text">
          <h1 className="w-title" aria-label="ALROSA IT">
            {name.map((ch, i) => (
              <span key={i} className={i > 6 ? "it" : ""} style={{ "--i": i }} aria-hidden="true">{ch === " " ? "\u00A0" : ch}</span>
            ))}
          </h1>
          <p className="w-sub">Центр миграции на отечественное ПО</p>

          <button ref={btn} className="enter" onClick={go}>
            <span className="enter-ring" aria-hidden="true" />
            <span className="enter-in">
              Войти
              <svg viewBox="0 0 24 24" className="enter-arrow"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </button>
        </div>
      </div>

      <div className="w-credit">
        <i className="wc-rule" aria-hidden="true" />
        <span className="wc-line">Сделано инди-компанией друзей</span>
        <div className="wc-ava" aria-label="AVA">
          {["A", "V", "A"].map((ch, i) => <span key={i} style={{ "--i": i }}>{ch}</span>)}
        </div>
        <div className="wc-names">
          {team.map((n, i) => (
            <span key={n} style={{ "--i": i }}><b>{n[0]}</b>{n.slice(1)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}