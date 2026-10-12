import { useEffect, useState } from "react";
import { Panel } from "./ui";

export const ENTERPRISE_CATEGORIES = {
  "ai_llm": {
    label: "Искусственный интеллект и генеративные модели (LLM)",
    defaultStatus: "manual_check",
    defaultAlt: "GigaChat / YandexGPT / локальные LLM в контуре компании",
    defaultPolicy: "Облачный сервис ИИ. Требуется согласование контура данных с отделом ИБ."
  },
  "development_sdk": {
    label: "Среды разработки, компиляторы и SDK",
    defaultStatus: "native_ready",
    defaultAlt: "Axiom JDK (сертифицирована ФСТЭК) / OpenJDK / GCC / Clang",
    defaultPolicy: "Нативно поддерживается в репозиториях Astra Linux SE."
  },
  "cad_engineering": {
    label: "САПР и инженерное проектирование (CAD/BIM)",
    defaultStatus: "blocker",
    defaultAlt: "nanoCAD Платформа / КОМПАС-3D v22 / Renga BIM",
    defaultPolicy: "Критический блокер миграции. Требуется лицензия nanoCAD или КОМПАС-3D."
  },
  "screen_capture": {
    label: "Утилиты захвата экрана и скриншотеры",
    defaultStatus: "alternative_available",
    defaultAlt: "Fly-Screenshot (штатно в Astra Linux) / Flameshot",
    defaultPolicy: "Замена на встроенную утилиту рабочего стола Fly или пакет Flameshot."
  },
  "communication_voip": {
    label: "Корпоративные коммуникации и мессенджеры",
    defaultStatus: "manual_check",
    defaultAlt: "VK Teams / TrueConf / Яндекс Телемост / IVA MCU",
    defaultPolicy: "Запрещено использование неконтролируемых мессенджеров. Миграция в защищенный контур."
  },
  "network_sysadmin": {
    label: "Сетевой анализ, диагностика и мониторинг",
    defaultStatus: "native_ready",
    defaultAlt: "Wireshark for Linux / Fly-Term / tcpdump",
    defaultPolicy: "Нативно поддерживается в Astra Linux SE."
  },
  "remote_access": {
    label: "Удаленный доступ и администрирование",
    defaultStatus: "manual_check",
    defaultAlt: "RuDesktop / Ассистент / Remmina",
    defaultPolicy: "Запрещен зарубежный удаленный доступ. Перевод на RuDesktop."
  },
  "media_streaming": {
    label: "Мультимедиа и потоковое аудио",
    defaultStatus: "non_target",
    defaultAlt: "Яндекс Музыка / VK Музыка (через веб-браузер)",
    defaultPolicy: "Нецелевое развлекательное ПО. Доступен веб-интерфейс в браузере."
  },
  "office_docs": {
    label: "Офисные пакеты и работа с документами",
    defaultStatus: "alternative_available",
    defaultAlt: "МойОфис Стандартный / Р-7 Офис",
    defaultPolicy: "Штатная замена на отечественный офисный пакет МойОфис."
  },
  "custom_industry": {
    label: "Специализированное отраслевое ПО",
    defaultStatus: "manual_check",
    defaultAlt: "Индивидуальный аудит совместимости с вендором",
    defaultPolicy: "Требуется проверка функционирования под Astra Linux."
  }
};

const statusOptions = [
  { value: "blocker", label: "⛔ Критический блокер (Волна 3 — Красный)", cls: "blocked" },
  { value: "manual_check", label: "⚠️ Повышенное внимание / Проверка (Волна 2 — Оранжевый)", cls: "partial" },
  { value: "native_ready", label: "✅ Совместим / Нативно готов (Волна 1 — Зеленый)", cls: "ready" }
];

export default function RulesAndNLPTab() {
  const [testInput, setTestInput] = useState("gemeni");
  const [nlpResult, setNlpResult] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);

  // Состояние защиты (Guardrails) и ручного переопределения
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);

  // Ручное редактирование соотнесения
  const [chosenCategory, setChosenCategory] = useState("custom_industry");
  const [customAlt, setCustomAlt] = useState("");
  const [customStatus, setCustomStatus] = useState("blocker");
  const [isSavedBanner, setIsSavedBanner] = useState(false);

  // Список сохраненных правил
  const [rules, setRules] = useState([]);

  const loadRules = () => {
    fetch("/api/v1/policy/custom-rules")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRules)
      .catch((e) => console.error("Rules load error:", e));
  };

  useEffect(() => {
    loadRules();
    runNlpMatch("gemeni");
  }, []);

  const runNlpMatch = (query, candidateDesc = null) => {
    if (!query) return;
    setNlpLoading(true);
    setIsSavedBanner(false);
    setForceOverride(false);
    setShowWarningModal(false);

    fetch("/api/v1/policy/nlp-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, candidate_desc: candidateDesc })
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res) {
          setNlpResult(res);
          const matchedKey = Object.keys(ENTERPRISE_CATEGORIES).find(
            (k) => ENTERPRISE_CATEGORIES[k].label === res.category
          ) || "custom_industry";

          setChosenCategory(matchedKey);
          setCustomAlt(res.domestic_alt || ENTERPRISE_CATEGORIES[matchedKey].defaultAlt);
          setCustomStatus(res.status === "blocker" ? "blocker" : res.status === "native_ready" ? "native_ready" : "manual_check");
        }
      })
      .catch((e) => console.error("NLP error:", e))
      .finally(() => setNlpLoading(false));
  };

  const handleCategoryChange = (catKey) => {
    setChosenCategory(catKey);
    const catData = ENTERPRISE_CATEGORIES[catKey];
    if (catData) {
      setCustomAlt(catData.defaultAlt);
      setCustomStatus(catData.defaultStatus);
    }
  };

  const handleSaveToPolicies = () => {
    if (!nlpResult?.normalized_name) return;
    const catLabel = ENTERPRISE_CATEGORIES[chosenCategory]?.label || "Специализированное ПО";
    const catPolicy = ENTERPRISE_CATEGORIES[chosenCategory]?.defaultPolicy || "Ручное правило администратора";

    fetch("/api/v1/policy/custom-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        software_name: nlpResult.normalized_name,
        pattern: testInput.toLowerCase().trim(),
        category: catLabel,
        status: customStatus,
        alternative: customAlt || "Определено администратором",
        note: forceOverride && !nlpResult.is_software
          ? "⚠️ Manual Override: Добавлено принудительно в обход классификатора ПО"
          : catPolicy
      })
    })
      .then((r) => r.json())
      .then(() => {
        setIsSavedBanner(true);
        loadRules();
        setTimeout(() => setIsSavedBanner(false), 4500);
      });
  };

  const handleDeleteRule = (id) => {
    fetch(`/api/v1/policy/custom-rules/${id}`, { method: "DELETE" })
      .then(() => loadRules());
  };

  const candidates = nlpResult?.candidates || [];
  const activeStatusCfg = statusOptions.find((s) => s.value === customStatus) || statusOptions[1];

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* КЛАССИФИКАТОР ПО С РУЧНЫМ СООТНЕСЕНИЕМ И ВЫБОРОМ БЛОКЕРА */}
      <Panel
        title="🌐 Интеллектуальный классификатор ПО (Disambiguation & Manual Mapping)"
        hint="Семантическое сопоставление сущностей, выбор кандидатов и управление корпоративными блокираторами"
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1.35fr", gap: "24px" }}>
          <div>
            <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "8px" }}>
              Поиск программы или файла инвентаризации:
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                className="search"
                style={{ flex: 1, background: "var(--panel-2)" }}
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runNlpMatch(testInput)}
                placeholder="gemeni, calculator, ChatGPT, autocad, spotify, monkey..."
              />
              <button
                className="on"
                style={{ padding: "8px 20px", background: "var(--ice)", color: "var(--bg)", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer" }}
                onClick={() => runNlpMatch(testInput)}
              >
                {nlpLoading ? "..." : "Анализ"}
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
              {["gemeni", "calculator", "ChatGPT", "JDK", "lightshot", "spotify", "monkey"].map((sample) => (
                <button
                  key={sample}
                  className="ghost-btn"
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                  onClick={() => { setTestInput(sample); runNlpMatch(sample); }}
                >
                  {sample}
                </button>
              ))}
            </div>

            {/* БЛОК КАНДИДАТОВ («ВОЗМОЖНО, ВЫ ИМЕЛИ В ВИДУ») */}
            {candidates.length > 0 && (
              <div style={{ marginTop: "20px", padding: "14px", background: "var(--panel-2)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "12px", color: "var(--ice)", fontWeight: "700", display: "block", marginBottom: "10px" }}>
                  💡 Возможно, вы имели в виду (Кликните для выбора варианта):
                </span>
                <div style={{ display: "grid", gap: "8px" }}>
                  {candidates.map((c, idx) => (
                    <div
                      key={idx}
                      onClick={() => { setTestInput(c.label); runNlpMatch(c.label, c.description); }}
                      style={{
                        padding: "8px 12px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--line)",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ overflow: "hidden", paddingRight: "8px" }}>
                        <strong style={{ fontSize: "13px", color: "var(--text)", display: "block" }}>{c.label}</strong>
                        <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.description}
                        </span>
                      </div>
                      <span className={`status ${c.is_software ? "ready" : "blocked"}`} style={{ fontSize: "10px", padding: "2px 6px", flexShrink: 0 }}>
                        {c.is_software ? "IT / ПО" : "Общая лексика"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* КАРТОЧКА СООТНЕСЕНИЯ ИЛИ ОТКАЗА В РЕГИСТРАЦИИ */}
          {nlpResult ? (
            <div style={{ background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--ice)", fontWeight: "600" }}>{nlpResult.method}</span>
                {nlpResult.is_software && (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px" }}>
                      cos(θ) = {nlpResult.cosine_similarity}
                    </span>
                    <span className="status ready" style={{ fontSize: "12px" }}>
                      {nlpResult.confidence_pct}%
                    </span>
                  </div>
                )}
              </div>
              
              <div style={{ fontSize: "20px", fontWeight: "700", marginBottom: "6px", color: "var(--text)" }}>
                {nlpResult.normalized_name}
              </div>

              <p style={{ margin: "0 0 14px", fontSize: "12.5px", color: "var(--muted)", lineHeight: "1.4" }}>
                {nlpResult.summary}
              </p>

              {/* ЗАЩИТА: ОТКАЗ В РЕГИСТРАЦИИ НЕ-СОФТА */}
              {!nlpResult.is_software && !forceOverride ? (
                <div style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "grid",
                  gap: "12px"
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span style={{ fontSize: "22px", lineHeight: "1" }}>🚫</span>
                    <div>
                      <strong style={{ fontSize: "14px", color: "#f87171", display: "block", marginBottom: "4px" }}>
                        Отказ в регистрации блокиратора ПО
                      </strong>
                      <span style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.4", display: "block" }}>
                        Объект классифицирован как непрограммная сущность реального мира. Автоматическая фиксация в реестре программных активов заблокирована системой аудита.
                      </span>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px dashed rgba(239, 68, 68, 0.2)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                      Требуется регистрация правила вопреки классификатору?
                    </span>
                    <button
                      className="ghost-btn"
                      onClick={() => setShowWarningModal(true)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "11.5px",
                        color: "var(--ice)",
                        borderColor: "rgba(56, 189, 248, 0.4)",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer"
                      }}
                    >
                      <span>❓</span> Принудительное добавление
                    </button>
                  </div>
                </div>
              ) : (
                /* РЕДАКТОР КОРПОРАТИВНОГО ПРАВИЛА (РАЗБЛОКИРОВАН ДЛЯ ПО ИЛИ ПО ПРИНУЖДЕНИЮ) */
                <div style={{ background: "rgba(0,0,0,0.2)", padding: "14px", borderRadius: "6px", border: "1px solid var(--line)", display: "grid", gap: "12px" }}>
                  {forceOverride && !nlpResult.is_software && (
                    <div style={{
                      padding: "8px 12px",
                      background: "rgba(245, 158, 11, 0.12)",
                      border: "1px solid rgba(245, 158, 11, 0.35)",
                      borderRadius: "6px",
                      color: "#fbbf24",
                      fontSize: "11.5px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span>⚠️</span>
                      <span><strong>Режим ручной изоляции:</strong> Объект будет заблокирован как нестандартная сущность в обход глобального реестра.</span>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: "12px", color: "var(--ice)", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                      🏷 Соотнести класс ПО:
                    </label>
                    <select
                      value={chosenCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      style={{
                        width: "100%",
                        background: "var(--bg)",
                        color: "var(--text)",
                        border: "1px solid var(--line)",
                        borderRadius: "6px",
                        padding: "8px 10px",
                        fontSize: "13px"
                      }}
                    >
                      {Object.entries(ENTERPRISE_CATEGORIES).map(([k, val]) => (
                        <option key={k} value={k}>{val.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "var(--ice)", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                      ⚡ Статус в миграции (Влияет на скоринг парка):
                    </label>
                    <select
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      style={{
                        width: "100%",
                        background: "var(--bg)",
                        color: "var(--text)",
                        border: "1px solid var(--line)",
                        borderRadius: "6px",
                        padding: "8px 10px",
                        fontSize: "13px"
                      }}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                      Отечественный аналог из реестра Минцифры:
                    </label>
                    <input
                      className="search"
                      style={{ width: "100%", background: "var(--bg)", fontSize: "13px", padding: "7px 10px" }}
                      value={customAlt}
                      onChange={(e) => setCustomAlt(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>Уровень:</span>
                      <span className={`status ${activeStatusCfg.cls}`} style={{ fontSize: "11px", padding: "3px 8px" }}>
                        {customStatus === "blocker" ? "Блокер" : customStatus === "manual_check" ? "Проверка" : "Готов"}
                      </span>
                    </div>

                    <button
                      className="on"
                      style={{
                        padding: "7px 16px",
                        background: "var(--ice)",
                        color: "var(--bg)",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                      onClick={handleSaveToPolicies}
                    >
                      💾 Зафиксировать в политиках
                    </button>
                  </div>
                </div>
              )}

              {isSavedBanner && (
                <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(34, 197, 94, 0.15)", border: "1px solid var(--ok)", borderRadius: "6px", color: "var(--ok)", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>✔</span> <strong>Успешно сохранено!</strong> Статус применён к алгоритму скоринга и затронет все ПК с этим ПО.
                </div>
              )}
            </div>
          ) : (
            <div className="empty" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              Ожидание ввода...
            </div>
          )}
        </div>
      </Panel>

      {/* МОДАЛЬНОЕ ОКНО ПРЕДУПРЕЖДЕНИЯ БЕЗОПАСНОСТИ */}
      {showWarningModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            background: "var(--panel-2, #181d28)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "12px",
            padding: "24px 28px",
            maxWidth: "520px",
            width: "100%",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
            display: "grid",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "28px" }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: "17px", color: "var(--text)", fontWeight: "700" }}>
                Предупреждение корпоративной безопасности
              </h3>
            </div>

            <div style={{ fontSize: "13px", color: "var(--muted)", lineHeight: "1.5", display: "grid", gap: "10px" }}>
              <p style={{ margin: 0 }}>
                Вы собираетесь принудительно зафиксировать сущность <strong>«{nlpResult?.normalized_name}»</strong>, которую классификатор идентифицировал как <strong>не относящуюся к цифровому ПО</strong>.
              </p>
              <div style={{
                padding: "10px 12px",
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: "6px",
                borderLeft: "3px solid #ef4444",
                color: "var(--text)"
              }}>
                В таком случае целевые ПК будут <strong>отключены от глобальной системы автоматической регистрации софта АЛРОСА</strong>, а правило получит флаг ручной изоляции (Manual Override).
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                className="ghost-btn"
                style={{ padding: "8px 16px", fontSize: "13px" }}
                onClick={() => setShowWarningModal(false)}
              >
                Отмена
              </button>
              <button
                style={{
                  padding: "8px 18px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setShowWarningModal(false);
                  setForceOverride(true);
                }}
              >
                ⚠️ Да, я хочу добавить блокиратор
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ТАБЛИЦА ЗАКРЕПЛЕННЫХ ПРАВИЛ */}
      <Panel
        title="🛡 Реестр пользовательских политик и зафиксированных соответствий"
        hint="Правила, заданные или переопределенные системными администраторами АЛРОСА"
      >
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Идентификатор</th>
                <th>Наименование ПО</th>
                <th>Паттерн поиска</th>
                <th>Назначенный класс ПО</th>
                <th style={{ textAlign: "center" }}>Статус</th>
                <th>Рекомендованный аналог</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: "700", color: "var(--ice)" }}>{r.id}</td>
                  <td><strong>{r.software_name}</strong></td>
                  <td style={{ color: "var(--muted)", fontFamily: "monospace" }}>{r.pattern}</td>
                  <td>{r.category}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`status ${r.status === "blocker" ? "blocked" : r.status === "native_ready" ? "ready" : "partial"}`}>
                      {r.status === "blocker" ? "Блокер" : r.status === "native_ready" ? "Готов" : "Проверка"}
                    </span>
                  </td>
                  <td style={{ color: "var(--ok)", fontSize: "13px" }}>{r.alternative}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="ghost-btn"
                      style={{ padding: "3px 8px", color: "var(--bad)" }}
                      onClick={() => handleDeleteRule(r.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {!rules.length && (
                <tr>
                  <td colSpan={7} className="empty" style={{ textAlign: "center", padding: "16px" }}>Зафиксированных правил пока нет</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
