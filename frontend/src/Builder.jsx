import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "./ui";

/* ───────── данные ───────── */
const parts = {
  cpu: { title: "Процессор", items: [
    { name: "Core i3-12100", spec: "4 ядра · 4.3 ГГц", cores: 4, w: 60, perf: 36, price: 8900 },
    { name: "Ryzen 5 5600", spec: "6 ядер · 4.4 ГГц", cores: 6, w: 65, perf: 54, price: 14500 },
    { name: "Core i7-13700K", spec: "16 ядер · 5.4 ГГц", cores: 16, w: 125, perf: 82, price: 42900 },
    { name: "Ryzen 9 7950X", spec: "16 ядер · 5.7 ГГц", cores: 16, w: 170, perf: 98, price: 61900 },
  ] },
  ram: { title: "Память", items: [
    { name: "8 ГБ DDR4", spec: "1 × 8 ГБ", gb: 8, sticks: 1, w: 5, perf: 20, price: 2200 },
    { name: "16 ГБ DDR4", spec: "2 × 8 ГБ", gb: 16, sticks: 2, w: 10, perf: 45, price: 4400 },
    { name: "32 ГБ DDR5", spec: "2 × 16 ГБ", gb: 32, sticks: 2, w: 12, perf: 72, price: 9800 },
    { name: "64 ГБ DDR5", spec: "4 × 16 ГБ", gb: 64, sticks: 4, w: 24, perf: 95, price: 21500 },
  ] },
  gpu: { title: "Видеокарта", items: [
    { name: "Встроенная графика", spec: "Без отдельной карты", fans: 0, w: 0, perf: 8, price: 0 },
    { name: "GeForce GTX 1650", spec: "4 ГБ · 1 вентилятор", fans: 1, w: 75, perf: 34, price: 17900 },
    { name: "GeForce RTX 4060", spec: "8 ГБ · 2 вентилятора", fans: 2, w: 115, perf: 62, price: 32900 },
    { name: "GeForce RTX 4080", spec: "16 ГБ · 3 вентилятора", fans: 3, w: 320, perf: 94, price: 109900 },
  ] },
};
const tabs = ["cpu", "ram", "gpu"];
const LIFT = { cpu: 105, ram: 72, gpu: 48, psu: 26 };

/* изометрия: плоский чертёж (x, y) → экран */
const CX = 310, CY = 345;
const ISO = `translate(${CX} ${CY}) scale(1 .55) rotate(45)`;
const P = (x, y) => [CX + (x - y) * 0.7071, CY + (x + y) * 0.7071 * 0.55];

function useTween(target, ms = 650) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const t0 = performance.now(), a = from.current;
    let raf;
    const tick = (t) => {
      const p = Math.min((t - t0) / ms, 1);
      from.current = a + (target - a) * (1 - Math.pow(1 - p, 3));
      setV(from.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/* ───────── детали сцены ───────── */
function Fan({ x, y, r, speed }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} className="bx-fanring" />
      <g className="bx-spin" style={{ "--d": `${speed}s` }}>
        {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cy={-r * 0.5} rx={r * 0.2} ry={r * 0.42} className="bx-blade" transform={`rotate(${a})`} />)}
      </g>
      <circle r={r * 0.18} className="bx-hub" />
    </g>
  );
}

function Part({ lift, delay = 0, depth = 5, active, ghost, onClick, base, top }) {
  return (
    <g className={`bx-part ${active ? "on" : ""} ${ghost ? "ghost" : ""}`} style={{ transform: `translateY(${-lift}px)`, transitionDelay: `${delay}ms` }} onClick={onClick}>
      <g className="bx-drop">
        <g className="bx-bob" style={{ animationDelay: `${delay}ms` }}>
          {!ghost && <g transform={`translate(0 ${depth})`}><g transform={ISO} className="bx-under">{base}</g></g>}
          <g transform={ISO}>{base}{top}</g>
        </g>
      </g>
    </g>
  );
}

function Callout({ pt, lift, side, k, v, active, onClick }) {
  const dx = (side === "L" ? 26 : 594) - pt[0];
  const anchor = side === "L" ? "start" : "end";
  return (
    <g className={`bx-co ${active ? "on" : ""} ${onClick ? "click" : ""}`} style={{ transform: `translate(${pt[0]}px, ${pt[1]}px) translateY(${-lift}px)` }} onClick={onClick}>
      <line x2={dx} />
      <circle r="3.5" />
      <text className="k" x={dx} y="-19" textAnchor={anchor}>{k}</text>
      <text className="v" x={dx} y="-5" textAnchor={anchor}>{v}</text>
    </g>
  );
}

function Scene({ sel, tab, open, setTab, watts, psu }) {
  const cpu = parts.cpu.items[sel.cpu], gpu = parts.gpu.items[sel.gpu], ram = parts.ram.items[sel.ram];
  const L = (k) => (open ? LIFT[k] : 0) + (tab === k ? 10 : 0);
  const gx0 = -170, gw = 80 + 72 * gpu.fans;
  const cpuA = P(-100, -45), ramA = P(55, -125), gpuA = P(gpu.fans ? gx0 + gw / 2 : -20, 85), psuA = P(190, -82);
  const dropAt = [[P(-100, -45), L("cpu")], [P(55, -65), L("ram")], [P(gpu.fans ? gx0 + gw / 2 : -20, 85), L("gpu")], [psuA, L("psu")]];
  const flow = `${Math.max(0.5, 1.8 - watts / 300).toFixed(2)}s`;

  return (
    <svg viewBox="0 95 620 430" className={`bx-svg ${open ? "open" : ""}`} role="img" aria-label="Изометрическая схема системного блока">
      <defs>
        <linearGradient id="bxBoard" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1a2a3f" /><stop offset="1" stopColor="#0d1623" /></linearGradient>
        <linearGradient id="bxChip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dcebf6" /><stop offset="1" stopColor="#6d8aa0" /></linearGradient>
        <pattern id="bxGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(127,216,255,.08)" /></pattern>
      </defs>

      {/* плата */}
      <g transform="translate(0 12)"><g transform={ISO}><rect x="-200" y="-150" width="400" height="300" rx="14" fill="#070b11" /></g></g>
      <g transform={ISO}>
        <rect x="-200" y="-150" width="400" height="300" rx="14" className="bx-board" />
        <rect x="-200" y="-150" width="400" height="300" rx="14" fill="url(#bxGrid)" />
        <path className="bx-trace" d="M-50 -45 H-20 V-130 M-50 -70 H-10 M-100 5 V40 M60 5 V40 H110 M-130 -95 V-130 H-60" />
        <g className={`bx-cables ${open ? "off" : ""}`} style={{ "--fd": flow }}>
          <path d="M150 -44 V30 H-100 V5" />
          {gpu.fans > 0 && <path d={`M150 30 V85 H${gx0 + gw}`} />}
        </g>
        {gpu.fans === 0 && <rect x="-170" y="53" width="296" height="64" rx="6" className="bx-slot" />}
      </g>

      {/* процессор */}
      <Part key={"c" + sel.cpu} lift={L("cpu")} active={tab === "cpu"} onClick={() => setTab("cpu")}
        base={<rect x="-150" y="-95" width="100" height="100" rx="8" className="bx-slab" />}
        top={<>
          <rect x="-138" y="-83" width="76" height="76" rx="5" fill="url(#bxChip)" />
          <rect x="-118" y="-63" width="36" height="36" rx="3" className="bx-die" />
          <Fan x={-100} y={-45} r={27} speed={2.4 - cpu.perf / 60} />
        </>} />

      {/* оперативная память: 4 слота */}
      {[0, 1, 2, 3].map((i) => {
        const x = 10 + i * 24, on = i < ram.sticks;
        return (
          <Part key={`r${i}-${sel.ram}`} lift={on ? L("ram") : 0} delay={i * 70} depth={4} ghost={!on} active={tab === "ram"} onClick={() => setTab("ram")}
            base={<rect x={x} y="-125" width="14" height="120" rx="2.5" className="bx-slab" />}
            top={on && <>
              {[0, 1, 2, 3].map((c) => <rect key={c} x={x + 2.5} y={-108 + c * 26} width="9" height="17" rx="1.5" className="bx-ramchip" />)}
              <rect x={x} y="-125" width="14" height="4" className="bx-led" style={{ animationDelay: `${i * 0.3}s` }} />
            </>} />
        );
      })}

      {/* видеокарта */}
      {gpu.fans > 0 && (
        <Part key={"g" + sel.gpu} lift={L("gpu")} active={tab === "gpu"} onClick={() => setTab("gpu")}
          base={<rect x={gx0} y="53" width={gw} height="64" rx="6" className="bx-slab" />}
          top={<>
            <rect x={gx0 + 4} y="57" width={gw - 8} height="56" rx="4" className="bx-gputop" />
            {Array.from({ length: gpu.fans }, (_, i) => <Fan key={i} x={gx0 + gw / 2 - (gpu.fans - 1) * 36 + i * 72} y={85} r={25} speed={1.7 - gpu.perf / 90} />)}
            <rect x={gx0 + gw - 9} y="62" width="4" height="46" rx="2" className="bx-led green" />
          </>} />
      )}
      {gpu.fans === 0 && <g onClick={() => setTab("gpu")} className="bx-hit"><rect x="-170" y="53" width="296" height="64" fill="transparent" transform={ISO} /></g>}

      {/* блок питания */}
      <Part lift={L("psu")} active={false} depth={7}
        base={<rect x="110" y="-120" width="80" height="76" rx="6" className="bx-slab" />}
        top={<>
          {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="118" x2="182" y1={-110 + i * 6} y2={-110 + i * 6} className="bx-vent" />)}
          <text x="150" y="-66" className="bx-psu">{psu} Вт</text>
        </>} />

      {/* линии «взрыва» */}
      {dropAt.map(([a, lift], i) => (
        <g key={i} transform={`translate(${a[0]} ${a[1]})`}><line y2="-1" className="bx-dline" style={{ transform: `scaleY(${lift})` }} /></g>
      ))}

      {/* выноски */}
      <Callout pt={cpuA} lift={L("cpu")} side="L" k="ПРОЦЕССОР" v={cpu.name} active={tab === "cpu"} onClick={() => setTab("cpu")} />
      <Callout pt={ramA} lift={L("ram")} side="R" k="ПАМЯТЬ" v={ram.name} active={tab === "ram"} onClick={() => setTab("ram")} />
      <Callout pt={gpuA} lift={L("gpu")} side="L" k="ВИДЕОКАРТА" v={gpu.name} active={tab === "gpu"} onClick={() => setTab("gpu")} />
      <Callout pt={psuA} lift={L("psu")} side="R" k="БЛОК ПИТАНИЯ" v={`от ${psu} Вт`} />
    </svg>
  );
}

/* ───────── страница ───────── */
export default function Builder({ criteria }) {
  const [sel, setSel] = useState({ cpu: 1, gpu: 1, ram: 1 });
  const [tab, setTab] = useState("cpu");
  const [open, setOpen] = useState(false);
  const cpu = parts.cpu.items[sel.cpu], gpu = parts.gpu.items[sel.gpu], ram = parts.ram.items[sel.ram];

  const s = useMemo(() => {
    const watts = cpu.w + gpu.w + ram.w + 60;
    const okRam = ram.gb >= criteria.minRam, okCpu = cpu.cores >= criteria.minCores;
    const score = Math.round((Math.min(1, ram.gb / (criteria.minRam * 2)) * 0.5 + Math.min(1, cpu.cores / criteria.minCores) * 0.5) * 100);
    return {
      watts, psu: Math.ceil((watts * 1.4) / 50) * 50, price: cpu.price + gpu.price + ram.price, okRam, okCpu, score,
      office: Math.round(cpu.perf * 0.5 + ram.perf * 0.4 + gpu.perf * 0.1), gaming: Math.round(cpu.perf * 0.3 + gpu.perf * 0.6 + ram.perf * 0.1),
      status: !okRam || !okCpu ? "Не готов" : ram.gb < criteria.minRam * 2 ? "Частично" : "Готов",
    };
  }, [cpu, gpu, ram, criteria]);

  const score = useTween(s.score), watts = useTween(s.watts), price = useTween(s.price);
  const C = 2 * Math.PI * 34;
  const tone = s.status === "Готов" ? "ok" : s.status === "Частично" ? "warn" : "bad";
  const text = {
    "Готов": "Сборка проходит все критерии. Можно переводить на отечественную ОС.",
    "Частично": "Критерии выполнены, но запас по памяти небольшой. Тяжёлое ПО будет работать медленно.",
    "Не готов": "Сборка не проходит критерии. Замените отмеченные детали или нажмите «Подобрать».",
  }[s.status];

  const cheapest = (cat, ok) => {
    const items = parts[cat].items;
    let best = -1;
    items.forEach((it, i) => { if (ok(it) && (best < 0 || it.price < items[best].price)) best = i; });
    return best < 0 ? items.length - 1 : best;
  };
  const auto = () => setSel({ cpu: cheapest("cpu", (i) => i.cores >= criteria.minCores), gpu: 0, ram: cheapest("ram", (i) => i.gb >= criteria.minRam * 2) });

  const checks = [
    ["Оперативная память", `${ram.gb} ГБ`, `от ${criteria.minRam} ГБ`, s.okRam],
    ["Ядра процессора", `${cpu.cores}`, `от ${criteria.minCores}`, s.okCpu],
  ];

  return (
    <section className="bx">
      <div className="bx-stage">
        <div className="bx-top">
          <div className="seg">
            <button className={!open ? "on" : ""} onClick={() => setOpen(false)}>Собрать</button>
            <button className={open ? "on" : ""} onClick={() => setOpen(true)}>Разобрать</button>
          </div>
          <span className="bx-hint">Нажмите на деталь или подпись</span>
        </div>
        <Scene sel={sel} tab={tab} open={open} setTab={setTab} watts={s.watts} psu={s.psu} />
      </div>

      <div className="bx-side">
        <div className={`bx-verdict ${tone}`}>
          <svg viewBox="0 0 80 80" className="bx-ring">
            <circle cx="40" cy="40" r="34" className="bg" />
            <circle cx="40" cy="40" r="34" className="fg" style={{ strokeDasharray: C, strokeDashoffset: C * (1 - s.score / 100) }} />
            <text x="40" y="45" textAnchor="middle">{Math.round(score)}</text>
          </svg>
          <div className="bx-vtext">
            <StatusBadge status={s.status} />
            <p>{text}</p>
          </div>
        </div>

        <div className="bx-checks">
          {checks.map(([l, v, need, ok]) => (
            <div key={l} className={ok ? "ok" : "bad"}>
              <i key={String(ok)}>{ok ? "✓" : "✕"}</i>
              <span>{l}</span>
              <b>{v}</b>
              <em>{need}</em>
            </div>
          ))}
        </div>

        <div className="bx-tabs" role="tablist">
          {tabs.map((k) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{parts[k].title}</button>)}
        </div>

        <div className="bx-opts" key={tab}>
          {parts[tab].items.map((it, i) => (
            <button key={it.name} className={sel[tab] === i ? "on" : ""} style={{ "--i": i }} onClick={() => setSel({ ...sel, [tab]: i })}>
              <span className="bx-o-main"><strong>{it.name}</strong><span>{it.spec}</span></span>
              <span className="bx-o-side"><b>{it.price.toLocaleString("ru-RU")} ₽</b><span>{it.w} Вт</span></span>
              <span className="bx-o-bar"><span style={{ width: `${it.perf}%` }} /></span>
            </button>
          ))}
        </div>

        <div className="bx-sum">
          <div><span>Потребление</span><strong>{Math.round(watts)} Вт</strong></div>
          <div><span>Блок питания</span><strong>от {s.psu} Вт</strong></div>
          <div><span>Стоимость</span><strong>{Math.round(price).toLocaleString("ru-RU")} ₽</strong></div>
        </div>

        <div className="bx-meters">
          {[["Офисные задачи", s.office], ["Графика и игры", s.gaming]].map(([l, v]) => (
            <div key={l}><div><span>{l}</span><b>{v}</b></div><div className="progress"><span style={{ width: `${v}%`, transition: "width .7s var(--ease)", animation: "none" }} /></div></div>
          ))}
        </div>

        <button className="primary-button bx-auto" onClick={auto}>Подобрать под критерии</button>
      </div>
    </section>
  );
}