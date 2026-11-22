import {useMemo, useState} from "react";

export default function SoftwareCatalog({compatibility = [], rules = [], targetOs, group}) {
  const [search,setSearch] = useState("");
  const [status,setStatus] = useState("all");
  const items = useMemo(() => {
    const local = rules.map(r => ({id:r.id, name:r.software_name, pattern:r.pattern,
      alternative:r.alternative, status:r.status, local:true}));
    const base = compatibility.filter(r => r.target_os_name === targetOs)
      .filter(r => !rules.some(p => p.pattern && r.software_name.toLowerCase().includes(p.pattern)))
      .map(r => ({id:r.id, name:r.software_name, alternative:r.analog_name,
        status:r.is_blocker ? "blocker" : r.status, local:false}));
    return [...local,...base].filter(r => {
      const native=r.status === "native_ready", blocked=r.status === "blocker";
      return (r.name + " " + (r.alternative || "")).toLowerCase().includes(search.toLowerCase()) &&
        (status === "all" || status === "native" && native || status === "blocker" && blocked ||
         status === "review" && !native && !blocked);
    });
  },[compatibility,rules,targetOs,search,status]);
  return <div>
    <p>Условия ПО для группы «{group}». Локальные правила имеют приоритет над базовым каталогом. Соответствия требуют проверки конкретных версий.</p>
    <div className="tools" style={{marginBottom:16}}>
      <input className="search" aria-label="Поиск в каталоге ПО" placeholder="Поиск программы или аналога" value={search} onChange={e=>setSearch(e.target.value)} />
      <select className="search" aria-label="Статус совместимости" value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="all">Все</option><option value="native">Совместим</option>
        <option value="review">Аналог / Проверка</option><option value="blocker">Блокер</option>
      </select>
    </div>
    <div className="table-wrapper" style={{maxHeight:460,overflowY:"auto"}}>
      <table><thead><tr><th>Программа / паттерн</th><th>Условие или аналог</th><th>Статус</th></tr></thead>
        <tbody>{items.map(r=><tr key={(r.local?"rule-":"catalog-")+r.id}>
          <td><strong>{r.name}</strong>{r.local && <div>Правило группы: {r.pattern}</div>}</td>
          <td>{r.alternative || "Проверка поставщика"}</td>
          <td><span className={"status "+(r.status==="blocker"?"blocked":r.status==="native_ready"?"ready":"partial")}>
            {r.status==="blocker"?"Блокер":r.status==="native_ready"?"Совместим":"Проверка"}</span></td>
        </tr>)}
        {!items.length && <tr><td colSpan={3}>Ничего не найдено</td></tr>}</tbody>
      </table>
    </div>
  </div>;
}
