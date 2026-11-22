import { useEffect, useRef } from "react";
import { StatusBadge } from "./ui";

export default function WorkstationModal({ selected, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement;
    dialog.current?.focus();
    const keyboard = e => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const buttons = dialog.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
        if (!buttons?.length) { e.preventDefault(); return; }
        const first=buttons[0], last=buttons[buttons.length-1];
        if (e.shiftKey && (document.activeElement===first || document.activeElement===dialog.current)) {e.preventDefault();last.focus();}
        else if (!e.shiftKey && document.activeElement===last) {e.preventDefault();first.focus();}
      }
    };
    document.addEventListener("keydown",keyboard);
    return () => {document.removeEventListener("keydown",keyboard); previous?.focus?.();};
  },[selected,onClose]);
  if (!selected) return null;
  const software = selected.installed || selected.installed_software || [];
  const blockers = selected.blockers || [];
  return <div className="modal-overlay" onClick={onClose}>
    <section ref={dialog} className="modal audit-details" role="dialog" aria-modal="true" aria-labelledby="station-title" tabIndex={-1} onClick={e=>e.stopPropagation()}>
      <header className="modal-header"><div><h2 id="station-title">{selected.id}</h2><p>{selected.department} · {selected.user}</p></div><button className="ghost-btn" onClick={onClose}>Закрыть</button></header>
      <div className="modal-status"><StatusBadge status={selected.status}/><strong>{selected.wave}</strong></div>
      <p className="preview-note">Проверка по текущим правилам подразделения. Прогноз ML отображается отдельно и не изменяет этот статус.</p>
      <div className="details-grid">
        <div><span>Оперативная память</span><strong>{selected.ram ?? "—"} ГБ</strong></div>
        <div><span>Ядра процессора</span><strong>{selected.cores ?? "—"}</strong></div>
        <div><span>Объём диска</span><strong>{selected.disk ?? "—"} ГБ</strong></div>
        <div><span>Текущая ОС</span><strong>{selected.os || "Не указана"}</strong></div>
      </div>
      <h3>Что мешает переходу</h3>
      {blockers.length ? <ul className="station-blockers">{blockers.map((b,i)=><li key={i}><strong>{b.type || "Ограничение"}</strong><p>{b.text || String(b)}</p>{b.fix && <span>Рекомендация: {b.fix}</span>}</li>)}</ul> : <p className="preview-note">Блокирующих факторов по текущим правилам не найдено.</p>}
      <h3>Установленные программы · {software.length}</h3>
      {software.length ? <ul className="station-software">{software.map((name,i)=><li key={i}>{name}</li>)}</ul> : <p>Список программ не передан в реестре.</p>}
    </section>
  </div>;
}
