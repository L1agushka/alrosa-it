import { useEffect, useState } from "react";
import useReducedMotion from "./design/useReducedMotion";

/* ───────── утилиты ───────── */
export function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reducedMotion]);
  return reducedMotion ? target : value;
}

export function Count({ to, decimals = 0, suffix = "" }) {
  const v = useCountUp(to);
  return <>{v.toFixed(decimals).replace(".", ",")}{suffix}</>;
}

export function StatusBadge({ status }) {
  const cls = status === "Готов" ? "ready" : status === "Частично" ? "partial" : "blocked";
  return <span className={`status ${cls}`}>{status}</span>;
}

export function Panel({ title, hint, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          {hint && <p>{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

