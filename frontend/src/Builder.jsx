import { useMemo, useState } from "react";
import { Panel, StatusBadge } from "./ui";

const parts = {
  cpu: {
    title: "Процессор",
    items: [
      { name: "Core i3-12100", short: "i3-12100", spec: "4 ядра · 4.3 ГГц", w: 60, perf: 36 },
      { name: "Ryzen 5 5600", short: "R5 5600", spec: "6 ядер · 4.4 ГГц", w: 65, perf: 54 },
      { name: "Core i7-13700K", short: "i7-13700K", spec: "16 ядер · 5.4 ГГц", w: 125, perf: 82 },
      { name: "Ryzen 9 7950X", short: "R9 7950X", spec: "16 ядер · 5.7 ГГц", w: 170, perf: 98 },
    ],
  },
  gpu: {
    title: "Видеокарта",
    items: [
      { name: "Встроенная графика", short: "iGPU", spec: "Без отдельной карты", w: 0, perf: 8, fans: 0 },
      { name: "GeForce GTX 1650", short: "GTX 1650", spec: "4 ГБ · 1 вентилятор", w: 75, perf: 34, fans: 1 },
      { name: "GeForce RTX 4060", short: "RTX 4060", spec: "8 ГБ · 2 вентилятора", w: 115, perf: 62, fans: 2 },
      { name: "GeForce RTX 4080", short: "RTX 4080", spec: "16 ГБ · 3 вентилятора", w: 320, perf: 94, fans: 3 },
    ],
  },
  ram: {
    title: "Оперативная память",
    items: [
      { name: "8 ГБ DDR4", short: "8 ГБ", spec: "1 × 8 ГБ", w: 5, perf: 20, gb: 8, sticks: 1 },
      { name: "16 ГБ DDR4", short: "16 ГБ", spec: "2 × 8 ГБ", w: 10, perf: 45, gb: 16, sticks: 2 },
      { name: "32 ГБ DDR5", short: "32 ГБ", spec: "2 × 16 ГБ", w: 12, perf: 72, gb: 32, sticks: 2 },
      { name: "64 ГБ DDR5", short: "64 ГБ", spec: "4 × 16 ГБ", w: 24, perf: 95, gb: 64, sticks: 4 },
    ],
  },
};

/* ───────── векторный ПК ───────── */
function Fan({ x, y, r, speed }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} className="fan-ring" />
      <g className="spin" style={{ "--d": `${speed}s` }}>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy={-r * 0.5} rx={r * 0.2} ry={r * 0.42} className="blade" transform={`rotate(${a})`} />
        ))}
      </g>
      <circle r={r * 0.2} className="hub" />
    </g>
  );
}

function PcScene({ sel, active, onPick }) {
  const cpu = parts.cpu.items[sel.cpu];
  const gpu = parts.gpu.items[sel.gpu];
  const ram = parts.ram.items[sel.ram];
  const cpuSpeed = 2.4 - cpu.perf / 60;
  const gpuW = gpu.fans ? 70 + gpu.fans * 82 : 0;
  const hot = (k) => (active === k ? "part active" : "part");
  const key = (e, k) => (e.key === "Enter" || e.key === " ") && onPick(k);

  return (
    <svg viewBox="0 0 520 430" className="pc-svg" role="img" aria-label="Схема системного блока">
      <defs>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7fd8ff" stopOpacity=".12" />
          <stop offset="1" stopColor="#7fd8ff" stopOpacity=".02" />
        </linearGradient>
        <linearGradient id="chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cfe9f7" />
          <stop offset="1" stopColor="#6f8da3" />
        </linearGradient>
        <linearGradient id="pcb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14202c" />
          <stop offset="1" stopColor="#0e1620" />
        </linearGradient>
      </defs>

      <rect x="8" y="8" width="504" height="414" rx="24" className="case" />
      <rect x="8" y="8" width="504" height="414" rx="24" fill="url(#glass)" />
      <rect x="28" y="28" width="464" height="310" rx="12" fill="url(#pcb)" className="board" />

      {/* дорожки */}
      <g className="traces">
        <path d="M185 100 H240 M185 130 H225 V190 H250 M125 185 V215 M200 185 V225" />
        <path d="M350 120 H400 V215 H440 M350 160 H470" />
      </g>

      {/* CPU */}
      <g className={hot("cpu")} tabIndex="0" role="button" aria-label="Выбрать процессор" onClick={() => onPick("cpu")} onKeyDown={(e) => key(e, "cpu")}>
        <g key={"cpu" + sel.cpu} className="swap">
          <rect x="66" y="60" width="118" height="118" rx="10" className="socket" />
          <rect x="82" y="76" width="86" height="86" rx="8" fill="url(#chip)" />
          <Fan x={125} y={119} r={36} speed={cpuSpeed} />
          <text x="125" y="196" className="tag">{cpu.short}</text>
        </g>
      </g>

      {/* RAM */}
      <g className={hot("ram")} tabIndex="0" role="button" aria-label="Выбрать оперативную память" onClick={() => onPick("ram")} onKeyDown={(e) => key(e, "ram")}>
        {[0, 1, 2, 3].map((i) => {
          const on = i < ram.sticks;
          return (
            <g key={i + "-" + sel.ram} className={on ? "stick swap" : "stick off"} style={{ "--i": i }}>
              <rect x={266 + i * 26} y="56" width="16" height="124" rx="3" className="ram-body" />
              {on && <rect x={269 + i * 26} y="62" width="10" height="8" rx="2" className="led" style={{ "--i": i }} />}
              {on && [0, 1, 2].map((c) => <rect key={c} x={270 + i * 26} y={80 + c * 28} width="8" height="18" rx="1.5" className="ram-chip" />)}
            </g>
          );
        })}
        <text x="313" y="196" className="tag">{ram.gb} ГБ</text>
      </g>

      {/* GPU */}
      <g className={hot("gpu")} tabIndex="0" role="button" aria-label="Выбрать видеокарту" onClick={() => onPick("gpu")} onKeyDown={(e) => key(e, "gpu")}>
        <rect x="46" y="226" width="400" height="62" rx="8" className="pcie" />
        {gpu.fans > 0 && (
          <g key={"gpu" + sel.gpu} className="swap">
            <rect x="46" y="226" width={gpuW} height="62" rx="10" className="gpu-body" />
            {Array.from({ length: gpu.fans }, (_, i) => (
              <Fan key={i} x={86 + i * 80} y={257} r={25} speed={1.6 - gpu.perf / 90} />
            ))}
            <rect x={46 + gpuW - 8} y="238" width="6" height="38" rx="3" className="led gpu-led" />
          </g>
        )}
        <text x={gpu.fans ? 46 + gpuW / 2 : 246} y="308" className="tag">{gpu.short}</text>
      </g>

      {/* питание */}
      <rect x="28" y="356" width="210" height="52" rx="8" className="psu" />
      <text x="133" y="387" className="psu-text">БП</text>
      <path d="M238 380 H470 V150 M238 372 H450 V230" className="cable" />
      <path d="M133 356 V338" className="cable" />
    </svg>
  );
}

/* ───────── конфигуратор ───────── */
export default function Builder({ criteria }) {
  const [sel, setSel] = useState({ cpu: 1, gpu: 1, ram: 1 });
  const [tab, setTab] = useState("cpu");
  const cpu = parts.cpu.items[sel.cpu];
  const gpu = parts.gpu.items[sel.gpu];
  const ram = parts.ram.items[sel.ram];

  const stats = useMemo(() => {
    const watts = cpu.w + gpu.w + ram.w + 60;
    const psu = Math.ceil((watts * 1.4) / 50) * 50;
    const office = Math.round(cpu.perf * 0.5 + ram.perf * 0.4 + gpu.perf * 0.1);
    const gaming = Math.round(cpu.perf * 0.3 + gpu.perf * 0.6 + ram.perf * 0.1);
    const cores = parseInt(cpu.spec);
    const status = ram.gb < criteria.minRam || cores < criteria.minCores ? "Не готов" : ram.gb < criteria.minRam * 2 ? "Частично" : "Готов";
    return { watts, psu, office, gaming, status };
  }, [cpu, gpu, ram, criteria]);

  const verdict = {
    "Готов": "Подходит для перехода на отечественную ОС и офисное ПО.",
    "Частично": "Перейти можно, но тяжёлые программы будут работать медленно.",
    "Не готов": `Не проходит критерии: нужно от ${criteria.minRam} ГБ ОЗУ и ${criteria.minCores} ядер.`,
  }[stats.status];

  return (
    <section className="builder">
      <div className="panel stage">
        <PcScene sel={sel} active={tab} onPick={setTab} />
        <div className="stage-note">Нажмите на деталь на схеме, чтобы заменить её</div>
      </div>

      <div className="builder-side">
        <div className="tabs" role="tablist">
          {Object.entries(parts).map(([k, p]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "tab on" : "tab"} onClick={() => setTab(k)}>
              {p.title}
            </button>
          ))}
        </div>

        <div className="options" key={tab}>
          {parts[tab].items.map((it, i) => (
            <button key={it.name} className={sel[tab] === i ? "option on" : "option"} style={{ "--i": i }} onClick={() => setSel({ ...sel, [tab]: i })}>
              <span className="option-main">
                <strong>{it.name}</strong>
                <span>{it.spec}</span>
              </span>
              <span className="option-w">{it.w} Вт</span>
            </button>
          ))}
        </div>

        <Panel title="Итог сборки" hint={verdict} action={<StatusBadge status={stats.status} />}>
          <div className="meters">
            {[["Офисные задачи", stats.office], ["Графика и игры", stats.gaming]].map(([l, v]) => (
              <div className="meter" key={l}>
                <div><span>{l}</span><strong>{v}</strong></div>
                <div className="progress"><span style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="power">
            <div><span>Потребление</span><strong>{stats.watts} Вт</strong></div>
            <div><span>Блок питания от</span><strong>{stats.psu} Вт</strong></div>
          </div>
        </Panel>
      </div>
    </section>
  );
}