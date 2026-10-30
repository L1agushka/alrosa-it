import {useState, useEffect, useRef} from 'react';
import {Glass} from './Glass';
import {supportsRefraction} from './capabilities';

function Lab() {
  const [theme, setTheme] = useState('dark');
  const [strength, setStrength] = useState(1.2);
  const [fallback, setFallback] = useState(false);
  const [rgb, setRgb] = useState(false);
  const [tab, setTab] = useState('Обзор');
  const [menu, setMenu] = useState(false);
  const [choice, setChoice] = useState('Все поверхности');
  const [modal, setModal] = useState(false);
  const dialog = useRef(null);
  const menuRef = useRef(null);
  const trigger = useRef(null);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    if (modal) dialog.current.showModal();
    else if (dialog.current.open) dialog.current.close();
  }, [modal]);
  useEffect(() => {
    if (!menu) return;
    const close = event => {
      if (!menuRef.current?.contains(event.target)) setMenu(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);

  const material = {strength, dispersion: rgb ? 0.035 : 0, fallback};
 return <main>
<header className="mast">
<a href="/" className="brand">◇ <strong>ALROSA IT</strong>
<span>MATERIAL STUDIES / 01</span>
</a>
<span className="edition">ИЗОЛИРОВАННЫЙ ПРОТОТИП · OCT 2026</span>
</header>
 <section className="intro">
<div>
<p className="eyebrow">ОПТИКА ИНТЕРФЕЙСА</p>
<h1>Свет обретает<br/>
<em>форму.</em>
</h1>
</div>
<div className="intro-note">
<span className="tiny-line"/>
<p>Преломление по кромке.<br/>Спокойная поверхность внутри.<br/>Материал, который чувствуется.</p>
<small>Демонстрационный стенд. Данных парка и подключений к API здесь нет.</small>
</div>
</section>
 <section className="controls" aria-label="Настройки материала">
<div className="theme-control">{[['dark','Тёмный'],['light','Светлый'],['contrast','Контрастный']].map(([key,label])=>
<button key={key} aria-pressed={theme===key} onClick={()=>setTheme(key)}>{label}</button>)}</div>
<label className="range">Преломление <input type="range" min="0" max="2" step=".1" value={strength} onChange={e=>setStrength(+e.target.value)}/>
<output>{strength.toFixed(1)}</output>
</label>
<label>
<input type="checkbox" checked={rgb} onChange={e=>setRgb(e.target.checked)}/> RGB</label>
<label>
<input type="checkbox" checked={fallback} onChange={e=>setFallback(e.target.checked)}/> Fallback</label>
</section>
 <section className="scene" aria-label="Пять стеклянных поверхностей">
<div className="landscape" aria-hidden="true">
<div className="orb"/>
<div className="ribbon r1"/>
<div className="ribbon r2"/>
<div className="ribbon r3"/>
<div className="grid"/>
<span className="landscape-word">REFRACT</span>
</div>
 <div className="scene-content">
<div className="sample-label">01 / FLOATING NAVIGATION</div>
<Glass {...material} radius={30} className="floating-nav">
<nav aria-label="Демонстрационная навигация">{['Обзор','Устройства','Аналитика'].map(t=>
<button key={t} aria-pressed={tab===t} className={tab===t?'selected':''} onClick={()=>setTab(t)}>{t}</button>)}<span className="nav-diamond">◇</span>
</nav>
</Glass>
 <div className="specimens">
<div className="panel-sample">
<div className="sample-label">02 / GLASS PANEL</div>
<Glass {...material} className="panel">
<div className="panel-header">
<span>ОПТИЧЕСКИЙ ПРОФИЛЬ</span>
<span>◇</span>
</div>
<h2>{tab==='Обзор'?'Точность.\nВ каждой грани.':tab==='Устройства'?'Ясность.\nВ каждой детали.':'Глубина.\nБез лишнего шума.'}</h2>
<p>Свет проходит через кромку, смещая фон. Текст остаётся на отдельном, чётком слое.</p>
<div className="material-spec">
<span>Профиль<strong>Squircle</strong>
</span>
<span>Среда<strong>n = 1.50</strong>
</span>
</div>
</Glass>
</div>
 <div className="action-samples">
<div className="sample-label">03 / GLASS BUTTONS</div>
<div className="button-row">
<Glass {...material} as="button" radius={22} className="glass-button" onClick={()=>setModal(true)}>Открыть поверхность <span>↗</span>
</Glass>
<Glass {...material} as="button" radius={22} className="icon-button" aria-label="Открыть модальное окно" onClick={()=>setModal(true)}>＋</Glass>
</div>
<div className="dropdown-area" ref={menuRef} onKeyDown={e=>{if(e.key==='Escape'){setMenu(false);trigger.current?.focus()}}}>
<div className="sample-label">04 / DROPDOWN</div>
<button ref={trigger} className="select-trigger" aria-expanded={menu} aria-controls="surface-options" onClick={()=>setMenu(v=>!v)}>{choice}<span aria-hidden="true">⌄</span>
</button>{menu&&<Glass {...material} className="dropdown" radius={18}>
<div id="surface-options" role="group" aria-label="Выбор поверхности">{['Все поверхности','Навигация','Панели и диалоги'].map(c=>
<button key={c} onClick={()=>{setChoice(c);setMenu(false);trigger.current?.focus()}}>{c}<span aria-hidden="true">{c===choice?'✓':'↗'}</span>
</button>)}</div>
</Glass>}</div>
<div className="sample-label modal-label">05 / MODAL SURFACE</div>
<p className="scene-note">Откройте диалог кнопкой выше.<br/>Проверьте кромку на смене фона.</p>
</div>
</div>
<footer className="scene-footer">
<span>ALROSA / OPTICAL LAB</span>
<span>{fallback||!supportsRefraction?'FROSTED FALLBACK':'SVG REFRACTION · CHROMIUM'}</span>
</footer>
</div>
</section>
 <section className="proof">
<div>
<p className="eyebrow">ПРОВЕРКА МАТЕРИАЛА</p>
<h2>Изгиб, который<br/>можно проверить.</h2>
<p>Одинаковая сетка и одинаковый материал.<br/>Регулятор меняет смещение справа.<br/>Сравните линии вдоль границ.</p>
</div>
<div className="comparison">
<div className="test-pattern">
<Glass fallback={fallback} strength={0} dispersion={0} className="test-lens">
<span>Без смещения</span>
</Glass>
</div>
<div className="test-pattern">
<Glass {...material} className="test-lens">
<span>{fallback || !supportsRefraction ? 'Матовое стекло' : 'С преломлением'}</span>
</Glass>
</div>
</div>
</section>
 <section className="system">
<div>
<p className="eyebrow">СИСТЕМА / ARCTIC OPTICS</p>
<h2>Один материал.<br/>Пять масштабов.</h2>
</div>
<dl>
<div>
<dt>Цвет</dt>
<dd>Чернильный · ледяной · минеральный</dd>
</div>
<div>
<dt>Ритм</dt>
<dd>4 / 8 / 16 / 24 / 40 / 64</dd>
</div>
<div>
<dt>Иерархия</dt>
<dd>Крупная типографика, спокойные подписи</dd>
</div>
<div>
<dt>Движение</dt>
<dd>160–200 мс · без постоянной анимации</dd>
</div>
</dl>
</section>
 <footer className="page-footer">Прототип материала, не новый экран приложения. <a href="./RESEARCH.md">Источники и ограничения ↗</a>
</footer>
 <dialog aria-labelledby="modal-heading" ref={dialog} onCancel={()=>setModal(false)} onClose={()=>setModal(false)} onClick={e=>{if(e.target===dialog.current)setModal(false)}}>
<Glass {...material} radius={28} className="modal">
<div className="panel-header">
<span>05 / MODAL SURFACE</span>
<button autoFocus className="close" aria-label="Закрыть диалог" onClick={()=>setModal(false)}>×</button>
</div>
<span className="modal-symbol">◇</span>
<h2 id="modal-heading">Прозрачность<br/>с характером.</h2>
<p>Та же оптика, другая глубина. Сильная кромка и плотный центр сохраняют читаемость при смене окружения.</p>
<div className="dialog-note">Это демонстрация поверхности. Никакие действия с устройствами не выполняются.</div>
<button className="solid-button" onClick={()=>setModal(false)}>Вернуться к материалам ↗</button>
</Glass>
</dialog>
 </main>
}
export default Lab;
