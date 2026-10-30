import { useEffect, useRef, useState } from "react";
import "./landing.css";

/* ─── useReveal hook ─────────────────────────────────────── */
function useReveal(threshold = 0.08) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─── Logo SVG (Phosphor-style) ──────────────────────────── */
function LogoIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3L21 9L12 21L3 9Z" />
      <path d="M3 9H21" />
      <path d="M9 9L12 21L15 9" />
      <path d="M9 9L12 3L15 9" />
    </svg>
  );
}

/* ─── Arrow right icon ───────────────────────────────────── */
function ArrowRight({ size = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/* ─── NAV ────────────────────────────────────────────────── */
function LandingNav({ onEnter }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [visibleItems, setVisibleItems] = useState([]);

  const links = [
    { label: "Как это работает", href: "#how" },
    { label: "Возможности", href: "#features" },
    { label: "Результаты", href: "#proof" },
  ];

  /* Stagger mobile nav links */
  useEffect(() => {
    if (!menuOpen) {
      setVisibleItems([]);
      return;
    }
    links.forEach((_, i) => {
      setTimeout(() => setVisibleItems((prev) => [...prev, i]), i * 80 + 80);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  const handleNavClick = (e, href) => {
    setMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <nav className="l-nav" aria-label="Навигация">
        <a className="l-nav-brand" href="#" aria-label="ALROSA IT — на главную">
          <LogoIcon size={24} color="#7FD8FF" />
          ALROSA IT
        </a>

        <ul className="l-nav-links" role="list">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={(e) => handleNavClick(e, l.href)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          className="l-nav-cta"
          onClick={onEnter}
          type="button"
        >
          Войти
          <ArrowRight size={16} />
        </button>

        <button
          className={`l-nav-hamburger${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`l-nav-mobile${menuOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Мобильное меню"
      >
        {links.map((l, i) => (
          <a
            key={l.href}
            href={l.href}
            className={visibleItems.includes(i) ? "mob-visible" : ""}
            onClick={(e) => handleNavClick(e, l.href)}
          >
            {l.label}
          </a>
        ))}
        <button
          className={`l-btn-primary${visibleItems.includes(links.length) ? "" : ""}`}
          onClick={() => { setMenuOpen(false); onEnter(); }}
          type="button"
          style={{
            marginTop: 16,
            opacity: visibleItems.length >= links.length ? 1 : 0,
            transform: visibleItems.length >= links.length ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 500ms cubic-bezier(0.32,0.72,0,1), transform 500ms cubic-bezier(0.32,0.72,0,1)",
          }}
        >
          Войти в систему <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

/* ─── HERO ───────────────────────────────────────────────── */
function HeroSection({ onEnter }) {
  return (
    <section id="hero" className="l-hero">
      <div className="crystal" aria-hidden="true" onPointerMove={(e) => { const box = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--rx", `${(e.clientY - box.top - box.height / 2) / -18}deg`); e.currentTarget.style.setProperty("--ry", `${(e.clientX - box.left - box.width / 2) / 18}deg`); }} onPointerLeave={(e) => { e.currentTarget.style.setProperty("--rx", "0deg"); e.currentTarget.style.setProperty("--ry", "0deg"); }}>
        <svg viewBox="0 0 320 300"><defs><linearGradient id="crystal-face" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c5edff" stopOpacity=".45"/><stop offset=".5" stopColor="#7fd8ff" stopOpacity=".04"/><stop offset="1" stopColor="#7fd8ff" stopOpacity=".3"/></linearGradient></defs><g fill="url(#crystal-face)" stroke="#bae9ff" strokeOpacity=".65" strokeWidth="1"><path d="M80 55 240 55 290 125 160 270 30 125Z"/><path d="m80 55 30 70 50-70 50 70 30-70M30 125h260M110 125l50 145 50-145M80 55 30 125l80 0M240 55l50 70h-80"/><path d="m160 55-50 70h100Z"/></g></svg>
      </div>
      <span className="l-hero-eyebrow">
        Аудит готовности к миграции · АЛРОСА
      </span>

      <h1 className="l-hero-h1">
        Миграция парка АРМ на отечественное ПО
        <br />
        без догадок и недель на анализ
      </h1>

      <p className="l-hero-sub">
        Загрузи реестр рабочих мест и получи готовый план перехода. ALROSA IT
        находит блокеры, оценивает риски и распределяет АРМ по волнам за три
        секунды.
      </p>

      <div className="l-hero-actions">
        <button className="l-btn-primary" onClick={onEnter} type="button">
          Войти в систему <ArrowRight size={18} />
        </button>
        <a href="#how" className="l-btn-secondary">
          Как это работает
        </a>
      </div>

      <p className="l-hero-proof">
        220 правил совместимости · 4 целевые ОС · аудит 100 АРМ менее чем за 3&nbsp;с
      </p>
    </section>
  );
}

/* ─── TAGLINE B11 ────────────────────────────────────────── */
function TaglineSection() {
  const containerRef = useRef(null);

  /* Split to two lines */
  const line1 = "Знай, какие рабочие места готовы";
  const line2 = "к переходу прямо сейчас.";

  const words1 = line1.split(" ");
  const words2 = line2.split(" ");
  const allWords = [...words1, ...words2];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const words = container.querySelectorAll(".tagline-word");
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          words.forEach((word, i) => {
            setTimeout(() => word.classList.add("active"), i * 90);
          });
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="l-tagline" aria-label="Ключевая мысль">
      <div className="l-tagline-inner" ref={containerRef}>
        <p className="l-tagline-text">
          {words1.map((w, i) => (
            <span key={`l1-${i}`} className="tagline-word">
              {w}
              {i < words1.length - 1 ? " " : ""}
            </span>
          ))}
          <br />
          {words2.map((w, i) => (
            <span key={`l2-${i}`} className="tagline-word">
              {i > 0 ? " " : ""}
              {w}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ───────────────────────────────────────── */
const STEPS = [
  {
    num: "1",
    title: "Загрузи реестр",
    body: "CSV или Excel с характеристиками рабочих мест и списком ПО. Формат простой — данные берутся из Active Directory или инвентарной системы.",
  },
  {
    num: "2",
    title: "Система оценит каждый АРМ",
    body: "Проверит железо по требованиям целевой ОС и сверит 220 правил совместимости программ. Блокеры выделяются отдельно с рекомендацией аналога.",
  },
  {
    num: "3",
    title: "Получи план на три волны",
    body: "Волна 1 готова к переводу, Волна 2 нужен апгрейд железа, Волна 3 требует замены ПО или перевода через VDI.",
  },
];

function HowItWorks() {
  const [ref, visible] = useReveal(0.08);

  return (
    <section id="how" className="l-how">
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <span className="l-section-label">Процесс</span>
        <h2 className="l-section-h2">Три шага от реестра к плану</h2>

        <div className="l-steps" ref={ref}>
          {STEPS.map((s, i) => (
            <article
              key={i}
              className={`l-step reveal${visible ? " revealed" : ""}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="l-step-num" aria-hidden="true">
                {s.num}
              </div>
              <h3 className="l-step-title">{s.title}</h3>
              <p className="l-step-body">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FEATURES ───────────────────────────────────────────── */

function IconBrain() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#7FD8FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.98-3 2.5 2.5 0 0 1-1.32-4.24 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-4.24 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#7FD8FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M8 11h6M11 8v6" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#7FD8FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5Z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}
function IconCpu() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#7FD8FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1" />
      <path d="M9 7V4M12 7V4M15 7V4M9 20v-3M12 20v-3M15 20v-3M4 9H7M4 12H7M4 15H7M20 9h-3M20 12h-3M20 15h-3" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#7FD8FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

const FEATURES = [
  {
    Icon: IconBrain,
    title: "ML-оценка рисков",
    body: "Random Forest предсказывает вероятность инцидента при миграции для каждого рабочего места отдельно.",
  },
  {
    Icon: IconSearch,
    title: "NLP-классификатор",
    body: "Вводи название ПО как угодно: «фотошоп», «autocadd», «ваершарк». Система распознаёт и находит отечественный аналог.",
  },
  {
    Icon: IconLayers,
    title: "Три волны перехода",
    body: "Чёткая приоритизация: кого переводить сейчас, кому нужен апгрейд комплектующих, кого через VDI.",
  },
  {
    Icon: IconCpu,
    title: "Конфигуратор АРМ",
    body: "Интерактивный подбор минимальной конфигурации под выбранную отечественную ОС с визуализацией сборки.",
  },
  {
    Icon: IconShield,
    title: "Корпоративные политики",
    body: "Задавай собственные правила блокировки ПО и контролируй соответствие регламенту ИБ.",
  },
];

function FeaturesSection() {
  const [ref, visible] = useReveal(0.06);

  return (
    <section id="features" className="l-features">
      <div className="l-features-header">
        <span className="l-section-label">Возможности</span>
        <h2 className="l-section-h2">Всё для уверенной миграции</h2>
      </div>

      <div className="l-features-grid" ref={ref}>
        {FEATURES.map((f, i) => (
          <article
            key={i}
            className={`l-feature reveal${visible ? " revealed" : ""}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className="l-feature-icon">
              <f.Icon />
            </div>
            <h3 className="l-feature-title">{f.title}</h3>
            <p className="l-feature-body">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ─── PROOF NUMBERS ──────────────────────────────────────── */
const NUMBERS = [
  { val: "42",   label: "АРМ из 100 готовы к переходу прямо сейчас" },
  { val: "31",   label: "заблокированы — AutoCAD, SolidWorks, SAP GUI" },
  { val: "< 3 с", label: "полный аудит 100 рабочих мест" },
];

function ProofNumbers() {
  const [ref, visible] = useReveal(0.08);

  return (
    <section id="proof" className="l-proof">
      <div className="l-proof-inner">
        <span className="l-section-label">Результаты</span>
        <h2 className="l-section-h2" style={{ marginBottom: 40 }}>
          Реальные числа, не маркетинговые
        </h2>

        <div className="l-numbers" ref={ref}>
          {NUMBERS.map((n, i) => (
            <div
              key={i}
              className={`l-number-card reveal${visible ? " revealed" : ""}`}
              style={{ transitionDelay: `${i * 130}ms` }}
            >
              <span className="l-number-val">{n.val}</span>
              <span className="l-number-label">{n.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FINAL CTA ──────────────────────────────────────────── */
function FinalCTA({ onEnter }) {
  const [ref, visible] = useReveal(0.1);

  return (
    <section className="l-cta" ref={ref}>
      <div className={`l-cta-inner reveal${visible ? " revealed" : ""}`}>
        <h2 className="l-cta-h2">Готов запустить аудит?</h2>
        <p className="l-cta-body">
          Загрузи первый CSV и увидь результат через три секунды. Данные
          сохраняются — можно вернуться к любой сессии.
        </p>
        <button className="l-btn-primary" onClick={onEnter} type="button">
          Войти в систему <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

/* ─── FOOTER ─────────────────────────────────────────────── */
function LandingFooter() {
  return (
    <footer className="l-footer">
      <div className="l-footer-inner">
        <div className="l-footer-brand">
          <LogoIcon size={20} color="#555555" />
          ALROSA IT · Сделано командой AVA
        </div>
        <nav className="l-footer-links" aria-label="Ссылки в подвале">
          <a href="#">Политика конфиденциальности</a>
          <a href="#">Условия использования</a>
        </nav>
      </div>
      <p className="l-footer-copy">
        © 2024 ALROSA IT — Artur, Viktoria, Alex. Учебный проект.
      </p>
    </footer>
  );
}

/* ─── ROOT ───────────────────────────────────────────────── */
export default function Welcome({ onEnter }) {
  const [leaving, setLeaving] = useState(false);

  const go = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onEnter, 700);
  };

  return (
    <div className={`landing${leaving ? " leaving" : ""}`}>
      <a href="#main-content" className="skip-link">
        Перейти к основному контенту
      </a>

      <LandingNav onEnter={go} />

      <main id="main-content">
        <HeroSection onEnter={go} />
        <TaglineSection />
        <HowItWorks />
        <FeaturesSection />
        <ProofNumbers />
        <FinalCTA onEnter={go} />
      </main>

      <LandingFooter />
    </div>
  );
}
