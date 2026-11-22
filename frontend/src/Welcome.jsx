export default function Welcome({ onEnter }) {
 return <section className="welcome intro" aria-labelledby="intro-title"><div className="intro-inner">
 <div className="intro-brand">ALROSA IT <span>Учебный проект · АВТ-551</span></div>
 <p className="eyebrow">Планирование перехода на отечественное ПО</p>
 <h1 id="intro-title">Подготовьте план перехода рабочих мест</h1>
 <p className="intro-lead">Загрузите реестр компьютеров. Проверьте оборудование и программы по правилам подразделений и определите очередность перехода.</p>
 <button className="primary-btn" onClick={onEnter}>Открыть рабочее пространство <span aria-hidden="true">→</span></button>
 <p className="intro-note">Вы уже вошли в систему. Загрузка реестра доступна администратору и аналитику.</p>
 <ol className="intro-steps"><li><b>01</b><strong>Настройте правила</strong><span>Требования к оборудованию и ПО для каждой группы.</span></li><li><b>02</b><strong>Загрузите реестр</strong><span>CSV или XLSX с рабочими местами и установленными программами.</span></li><li><b>03</b><strong>Разберите результат</strong><span>Блокеры, волны перехода и отдельный прогноз ML.</span></li></ol>
 <footer className="intro-footer">Команда: Виктория Чуносова · Артур Бучинский · Алексей Старовойтов</footer>
 </div></section>;
}
