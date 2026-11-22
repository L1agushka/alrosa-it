import { useEffect, useState } from "react";
import { Panel } from "./ui";
import { apiFetch } from "./api";

const options = [["upgrade_ram", "ОЗУ до 16 ГБ"], ["replace_cad", "Замена инженерного ПО"], ["web_1c", "Веб-клиент 1С"], ["compatible_crypto", "Совместимое криптоокружение"]];
const initial = Object.fromEntries(options.map(([key]) => [key, false]));
export default function MLAnalytics({ fleet = [], onPick }) {
  const [data, setData] = useState(null);
  const [scenario, setScenario] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const simulated = Object.values(scenario).some(Boolean);
    apiFetch(`/api/v1/stats/ml-risk${simulated ? "/simulate" : ""}`, simulated ? { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(scenario) } : {})
      .then(async r => { if (!r.ok) throw new Error(r.status === 404 ? "Загрузите реестр, чтобы получить прогноз." : "Не удалось получить прогноз. Попробуйте ещё раз."); return r.json(); })
      .then(result => { if (active) setData(result); })
      .catch(e => { if (active) { setError(e.message); setData(null); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fleet, scenario, retry]);
  const rows = (data?.workstations || []).filter(w => `${w.workstation_id} ${w.department}`.toLowerCase().includes(q.toLowerCase()));
  const s = data?.summary || {};
  const model = data?.inference_mode === "model";
  const uncertain = (data?.workstations || []).filter(w => w.data_quality.some(t => t.includes("отсутствовало") || t.includes("вне диапазона"))).length;
  return <div className="ml-view">
    <p className="page-intro">Оцените, какие рабочие места требуют дополнительной проверки перед пилотом. Прогноз ML дополняет аудит; волны перехода определяются правилами групп.</p>
    <Panel title="Сценарий подготовки" hint="Выберите предполагаемые изменения. Сервер повторно рассчитает прогноз той же моделью; реестр и результаты аудита сохранятся.">
      <div className="scenario-options">{options.map(([key, title]) => <label key={key}><input type="checkbox" checked={scenario[key]} onChange={e => setScenario({...scenario, [key]:e.target.checked})} />{title}</label>)}</div>
      <p className="preview-note">Замена ПО означает предположение о совместимом решении. Её ещё нужно проверить в рабочих сценариях.</p>
    </Panel>
    {loading && <p role="status">Рассчитываем прогноз…</p>}
    {error && <div role="alert" className="error">{error} <button className="ghost-btn" onClick={() => setRetry(retry + 1)}>Повторить</button></div>}
    {!loading && data?.available && <>
      <div className="notice" role="status"><strong>{model ? data.model_name : "Резервный индекс: модель недоступна"}</strong><p>{model ? data.data_notice : "Показан упрощённый индекс по признакам. Метрики обученной модели к нему неприменимы."}</p></div>
      {model && uncertain > 0 && <p className="quality-warning"><strong>{uncertain} из {s.total_analyzed} рабочих мест отличаются от обучающей выборки.</strong> Проверьте допущения в таблице. Для этих записей прогноз особенно неопределён.</p>}
      <div className="ml-metrics">
        <div><span>Средняя оценка по парку</span><strong>{s.fleet_risk_index}%</strong><small>До сценария: {data.baseline_summary.fleet_risk_index}%</small></div>
        <div><span>Высокая оценка риска</span><strong>{s.high_risk_count}</strong><small>Порог от {data.risk_thresholds.high}%</small></div>
        <div><span>Проверено рабочих мест</span><strong>{s.total_analyzed}</strong><small>Последний сохранённый аудит</small></div>
      </div>
      {model && <Panel title="Как проверена модель" hint="Эти показатели характеризуют синтетический тест, а не точность на реальных инцидентах АЛРОСА.">
        <div className="validation-grid"><div><strong>500</strong><span>записей в отложенном тесте</span></div><div><strong>{data.metrics.roc_auc}</strong><span>ROC-AUC · baseline {data.baseline_metrics?.metrics?.roc_auc ?? data.baseline_metrics?.roc_auc ?? "—"}</span></div><div><strong>{data.metrics.brier_score}</strong><span>Brier score · меньше лучше</span></div><div><strong>{(data.metrics.accuracy * 100).toFixed(1)}%</strong><span>Accuracy на тесте</span></div></div>
        <p>Обучение: {data.model_info?.split?.train_rows} записей. Калибровка проводится только на обучающей части. Признаки: оборудование, ПО, подразделение и допущение о периферии.</p>
        <details><summary>Воспроизводимость и ограничения</summary><p>{data.scenario_notice}</p><p>Периферия в реестре не измерена: принято два устройства. Новые подразделения и значения вне диапазона обучения отмечены в данных рабочих мест.</p><p className="checksum">SHA-256 датасета: {data.model_info?.dataset_sha256}</p><p className="checksum">SHA-256 модели: {data.model_info?.model_sha256}</p></details>
      </Panel>}
      <Panel title="Рабочие места для проверки" hint="Изменение показано в процентных пунктах. Низкий риск не снимает блокирующее ПО.">
        <label className="field-label" htmlFor="ml-search">Найти рабочее место или группу</label>
        <input id="ml-search" className="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Номер компьютера или подразделение" />
        <div className="table-scroll"><table className="ml-table"><thead><tr><th>Рабочее место / группа</th><th>До → сценарий</th><th>Изменение</th><th>Волна аудита</th><th>Наблюдаемые признаки</th></tr></thead><tbody>{rows.map(w => <tr key={w.workstation_id}><td><button className="text-button" onClick={() => { const item = fleet.find(f => f.id === w.workstation_id); if(item) onPick(item); }}>{w.workstation_id}</button><small>{w.department}</small></td><td>{w.baseline_probability}% → <b>{w.incident_probability}%</b><small>{w.risk_level}</small></td><td>{w.risk_change_pp > 0 ? "+" : ""}{w.risk_change_pp} п.п.</td><td>{w.audit_wave ?? "—"}</td><td>{w.key_risk_factor}<details><summary>Данные и допущения</summary><ul>{w.data_quality.map((text,i) => <li key={i}>{text}</li>)}</ul>{w.actions.length > 0 && <p>Сценарий: {w.actions.join(", ")}</p>}</details></td></tr>)}</tbody></table>{!rows.length && <p className="empty">По этому запросу рабочих мест нет.</p>}</div>
      </Panel>

    </>}
    {!loading && data && !data.available && <p className="empty">В этом аудите нет рабочих мест для прогноза.</p>}
  </div>;
}
