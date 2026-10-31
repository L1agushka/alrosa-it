import {useEffect, useRef, useState} from 'react';
import OpticalSurface from './design/OpticalSurface';
import './landing.css';

function Diamond({className=''}) {
  return <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M16 2 28 12 16 30 4 12Z M4 12h24 M11 12l5 18 5-18 M11 12l5-10 5 10"/></svg>;
}
const links=[['#how','Процесс'],['#features','Возможности'],['#proof','Результат'],['#team','Команда AVA']];
const capabilities=[
  ['01','Аппаратная оценка','Оперативная память, ядра процессора и требования целевой ОС. Критерии доступны для настройки.'],
  ['02','Программный контур','Каталог ПО, альтернативы и корпоративные политики. Причины ограничений остаются рядом с результатом.'],
  ['03','Риски и сценарии','ML-аналитика и сценарное моделирование помогают рассмотреть варианты подготовки. Прогнозы отделены от подтверждённой совместимости.'],
  ['04','План перехода','Распределение рабочих мест по волнам, детальная карточка устройства, отчёт, экспорт CSV и печать.'],
  ['05','Инженерные инструменты','Конфигуратор АРМ и NLP-сопоставление названий программ для работы с инвентаризацией.'],
];

export default function Welcome({onEnter}) {
  const [menuOpen,setMenuOpen]=useState(false);
  const [leaving,setLeaving]=useState(false);
  const timer=useRef(null);
  const menuButton=useRef(null);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previous};
  },[]);
  const go=()=>{
    if(leaving)return;
    setLeaving(true);
    timer.current=setTimeout(onEnter,matchMedia('(prefers-reduced-motion: reduce)').matches?0:240);
  };
  const closeMenu=()=>{setMenuOpen(false);menuButton.current?.focus()};
  useEffect(()=>{
    if(!menuOpen)return;
    const key=event=>{if(event.key==='Escape'){setMenuOpen(false);menuButton.current?.focus()}};
    document.addEventListener('keydown',key);
    return()=>document.removeEventListener('keydown',key);
  },[menuOpen]);
  return <div className={`landing mineral-landing${leaving?' leaving':''}`}>
    <a href="#main-content" className="skip-link">Перейти к основному контенту</a>
    <header className="welcome-header">
      <a href="#hero" className="welcome-brand"><Diamond/><span>ALROSA IT<small>СИСТЕМА ОЦЕНКИ МИГРАЦИИ</small></span></a>
      <OpticalSurface as="nav" level="premium" radius={24} className="welcome-nav" aria-label="Разделы страницы">
        {links.map(([href,label])=><a key={href} href={href}>{label}</a>)}
      </OpticalSurface>
      <button className="welcome-entry" onClick={go}>Войти в систему <span aria-hidden="true">↗</span></button>
      <button ref={menuButton} className="welcome-menu-button" aria-expanded={menuOpen} aria-controls="welcome-mobile-menu" aria-label={menuOpen?'Закрыть меню':'Открыть меню'} onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?'×':'☰'}</button>
      {menuOpen&&<nav id="welcome-mobile-menu" className="welcome-mobile-menu" aria-label="Мобильная навигация" onKeyDown={e=>{if(e.key==='Escape')closeMenu()}}>
        {links.map(([href,label])=><a key={href} href={href} onClick={closeMenu}>{label}<span aria-hidden="true">↗</span></a>)}
        <button onClick={go}>Войти в систему ↗</button>
      </nav>}
    </header>
    <main id="main-content">
      <section id="hero" className="welcome-hero">
        <div className="welcome-hero-copy">
          <p className="welcome-kicker"><span/> WINDOWS → ASTRA LINUX</p>
          <h1>Сложный переход.<br/><em>Ясная картина.</em></h1>
          <p className="welcome-lead">Каждое рабочее место — часть большого решения. Соберите данные о парке, изучите ограничения и подготовьте последовательный переход на отечественное ПО.</p>
          <div className="welcome-actions"><button className="welcome-primary" onClick={go}>Войти в систему <span aria-hidden="true">↗</span></button><a href="#how">Изучить процесс <span aria-hidden="true">↓</span></a></div>
          <div className="welcome-hero-foot"><span>ALROSA IT</span><span>Инженерная точность.<br/>Осознанные решения.</span></div>
        </div>
        <div className="mineral-stage ava-dark">
          <div className="mineral-grain" aria-hidden="true"/>
          <span className="mineral-coordinate">AVA / MATERIAL 01</span>
          <svg className="mineral-sculpture" viewBox="0 0 600 680" aria-hidden="true"><defs><linearGradient id="mineral-face" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0dbc2"/><stop offset=".45" stopColor="#a47c58"/><stop offset="1" stopColor="#49493b"/></linearGradient><linearGradient id="mineral-shadow"><stop stopColor="#49483b"/><stop offset="1" stopColor="#b4946e"/></linearGradient></defs><g stroke="#e0cbb0" strokeWidth=".7"><path d="M300 80 520 235 300 595 80 235Z" fill="url(#mineral-face)"/><path d="M80 235h440L300 595Z" fill="url(#mineral-shadow)"/><path d="M210 235 300 80l90 155-90 360Z" fill="#e7d5b2" fillOpacity=".35"/><path d="m80 235 130 0 90 360M520 235H390L300 80M210 235h180" fill="none"/></g></svg>
          <OpticalSurface level="premium" radius={24} className="mineral-lens"><span className="mineral-lens-label">ОТ ДАННЫХ К РЕШЕНИЮ</span><strong>Увидеть<br/>каждую грань.</strong><span className="mineral-lens-foot">Реестр · Оценка · План <Diamond/></span></OpticalSurface>
          <div className="mineral-caption"><span>Оборудование / ПО / Готовность</span><span>◇</span></div>
        </div>
      </section>
      <section id="how" className="welcome-process welcome-section">
        <div className="welcome-section-heading"><p className="welcome-kicker">01 / ПРОЦЕСС</p><h2>От инвентаризации<br/>к следующему шагу.</h2><p>Единая рабочая среда для анализа парка. Отдельное внимание — тому, что ещё предстоит проверить.</p></div>
        <div className="process-list">
          {[['01','Соберите исходные данные','Загрузите CSV с характеристиками рабочих мест. Шаблон доступен в реестре устройств.'],['02','Разберите ограничения','Настройте критерии, изучите аппаратные дефициты и программные блокеры. Откройте карточку любого устройства.'],['03','Подготовьте переход','Сравните волны, изучите рекомендации и выгрузите отчёт для дальнейшей работы.']].map(([n,title,text])=><article key={n}><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div><span aria-hidden="true">↗</span></article>)}
        </div>
      </section>
      <section id="features" className="welcome-features ava-dark welcome-section">
        <div className="welcome-section-heading"><p className="welcome-kicker">02 / РАБОЧАЯ СРЕДА</p><h2>Детали связаны.<br/><em>Решение — ваше.</em></h2><Diamond className="feature-diamond"/></div>
        <div className="capability-list">{capabilities.map(([n,title,text])=><article key={n}><span>{n}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>
      <section id="proof" className="welcome-result welcome-section">
        <div className="welcome-section-heading"><p className="welcome-kicker">03 / РЕЗУЛЬТАТ</p><h2>Аргументы.<br/>Не обещания.</h2></div>
        <div className="result-body"><p className="result-lead">У каждого результата должен быть контекст: устройство, критерий, причина и следующий шаг.</p><div className="result-line"><span>Вход</span><strong>Реестр рабочих мест</strong></div><div className="result-line"><span>Анализ</span><strong>Характеристики и ограничения</strong></div><div className="result-line"><span>Выход</span><strong>Волны, рекомендации и отчёт</strong></div><p className="result-note">Соответствие текущим критериям не гарантирует совместимость драйверов и прикладных сценариев. Прогнозы и сценарные оценки требуют проверки.</p></div>
      </section>
      <section id="team" className="welcome-team welcome-section">
        <div><p className="welcome-kicker">04 / КОМАНДА AVA</p><h2>За системой —<br/>люди.</h2><p>Команда проекта ALROSA IT.</p></div>
        <div className="team-signature"><span className="ava-wordmark" aria-label="AVA">AVA<span aria-hidden="true">◇</span></span><div className="team-members"><span>Артур Бучинский</span><span>Виктория Чуносова</span><span>Алексей Старовойтов</span></div></div>
      </section>
      <section className="welcome-final ava-dark"><div><p className="welcome-kicker">СЛЕДУЮЩИЙ ШАГ</p><h2>Начните с вашего парка.</h2><p>Откройте рабочую среду и загрузите реестр устройств.</p></div><OpticalSurface as="button" level="premium" radius={18} className="welcome-final-button" onClick={go}><span>Войти в систему</span><span aria-hidden="true">↗</span></OpticalSurface></section>
    </main>
    <footer className="welcome-footer"><div><Diamond/><strong>ALROSA IT</strong><span>Создано командой AVA · Учебный проект</span></div><nav aria-label="Ссылки в подвале"><a href="#">Политика конфиденциальности</a><a href="#">Условия использования</a></nav></footer>
  </div>;
}
