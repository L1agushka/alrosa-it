import { useEffect, useState, useRef } from "react";
import { Panel } from "./ui";
import { apiFetch } from "./api.js";

export const ENTERPRISE_CATEGORIES = {
  // ... (оставляем без изменений)
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

const PRESETS = [
  {
    label: "+ Блокер (P2P)",
    payload: {
      pattern: "torrent",
      software_name: "BitTorrent / uTorrent",
      category: "Сетевой анализ, диагностика и системные утилиты",
      status: "blocker",
      alternative: "Запрещено регламентом ИБ",
      note: "P2P-трафик запрещён политикой безопасности",
      weight: 100,
      severity: "blocker",
    },
  },
  {
    label: "+ Удалённый доступ",
    payload: {
      pattern: "teamviewer",
      software_name: "TeamViewer",
      category: "Удаленный доступ и администрирование",
      status: "blocker",
      alternative: "RuDesktop / Remmina",
      note: "Неконтролируемый удалённый доступ запрещён",
      weight: 100,
      severity: "blocker",
    },
  },
  {
    label: "+ Нет аналога (Adobe)",
    payload: {
      pattern: "photoshop",
      software_name: "Adobe Photoshop",
      category: "Графика и дизайн",
      status: "blocker",
      alternative: "GIMP / Krita",
      note: "Прямого промышленного аналога нет",
      weight: 80,
      severity: "warning",
    },
  },
  {
    label: "+ Есть аналог (Office)",
    payload: {
      pattern: "microsoft office",
      software_name: "Microsoft Office",
      category: "Офисные пакеты и работа с документами",
      status: "alternative_available",
      alternative: "Р7-Офис / МойОфис",
      note: "Штатная миграция документооборота",
      weight: 20,
      severity: "info",
    },
  },
];

// 🆕 Добавляем canEdit в пропсы
export default function RulesAndNLPTab({ onRulesChanged, canEdit = false, group }) {
  const [testInput, setTestInput] = useState("");
  const [nlpResult, setNlpResult] = useState(null);
  const [nlpLoading, setNlpLoading] = useState(false);

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);

  const [chosenCategory, setChosenCategory] = useState("custom_industry");
  const [customAlt, setCustomAlt] = useState("");
  const [customStatus, setCustomStatus] = useState("blocker");
  const [isSavedBanner, setIsSavedBanner] = useState(false);

  const [rules, setRules] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const requestVersion = useRef(0);

  const loadRules = () => {
    apiFetch("/api/v1/policy/custom-rules?group=" + encodeURIComponent(group))
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          setRules(data || []);
          if (onRulesChanged) onRulesChanged(data || []);
        })
        .catch((e) => console.error("Rules load error:", e));
  };

  useEffect(() => {
    loadRules();
    return () => { requestVersion.current += 1; };
  }, []);

  const runNlpMatch = (query, candidateDesc = null) => {
    if (!query) return;
    const version = ++requestVersion.current;
    setNlpResult(null);
    setNlpLoading(true);
    setIsSavedBanner(false);
    setForceOverride(false);
    setShowWarningModal(false);

    apiFetch("/api/v1/policy/nlp-match?group=" + encodeURIComponent(group), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, candidate_desc: candidateDesc })
    })
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          if (res && version === requestVersion.current) {
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
        .finally(() => { if (version === requestVersion.current) setNlpLoading(false); });
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
    if (!nlpResult?.normalized_name || !canEdit) return;
    const catLabel = ENTERPRISE_CATEGORIES[chosenCategory]?.label || "Специализированное ПО";
    const catPolicy = ENTERPRISE_CATEGORIES[chosenCategory]?.defaultPolicy || "Ручное правило администратора";

    setBusy(true);
    setError("");
    apiFetch("/api/v1/policy/custom-rules?group=" + encodeURIComponent(group), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        software_name: nlpResult.normalized_name,
        pattern: testInput.toLowerCase().trim(),
        category: catLabel,
        status: customStatus,
        alternative: customAlt || "Определено администратором",
        note: forceOverride && nlpResult.is_software === false
            ? "⚠️ Manual Override: Добавлено принудительно в обход классификатора ПО"
            : catPolicy,
        weight: 50,
        severity: "warning"
      })
    })
        .then((r) => {
          if (!r.ok) return r.json().then(e => { throw new Error(e.detail || "Ошибка сохранения"); });
          return r.json();
        })
        .then(() => {
          setIsSavedBanner(true);
          loadRules();
          setTimeout(() => setIsSavedBanner(false), 4500);
        })
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
  };

  const handleDeleteRule = (id) => {
    if (!canEdit) return;
    if (!confirm("Удалить правило?")) return;
    setBusy(true);
    apiFetch(`/api/v1/policy/custom-rules/${id}?group=${encodeURIComponent(group)}`, { method: "DELETE" })
        .then(() => loadRules())
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
  };

  const uploadJson = async (file) => {
    if (!file || !canEdit) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/v1/policy/custom-rules/upload?group=" + encodeURIComponent(group), {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.detail || "Ошибка загрузки");
      }
      const result = await res.json();
      alert(
          `Добавлено: ${result.added}\n` +
          `Пропущено (дубли): ${result.skipped}` +
          (result.errors?.length ? `\nОшибки:\n${result.errors.join("\n")}` : "")
      );
      loadRules();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const exportJson = async () => {
    const res = await apiFetch("/api/v1/policy/custom-rules/export?group=" + encodeURIComponent(group));
    if (!res.ok) return;
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custom_rules.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const candidates = nlpResult?.candidates || [];
  const activeStatusCfg = statusOptions.find((s) => s.value === customStatus) || statusOptions[1];

  return (
      <div style={{ display: "grid", gap: "24px" }}>
        {/* 1. КЛАССИФИКАТОР */}
        <Panel
            title="Проверка названия ПО"
            hint="Найдите программу и задайте правило для выбранной группы"
        >
          <div className="rules-columns">
            <div>
              <label style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "8px" }}>
                Название программы:
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                    className="search"
                    style={{ flex: 1, background: "var(--panel-2)" }}
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runNlpMatch(testInput)}
                    aria-label="Название программы" placeholder="Например, AutoCAD или 1С"
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

              {candidates.length > 0 && (
                  <div style={{ marginTop: "20px", padding: "14px", background: "var(--panel-2)", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "12px", color: "var(--ice)", fontWeight: "700", display: "block", marginBottom: "10px" }}>
                  Похожие названия — выберите подходящее:
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
                              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", whiteSpace: "normal", overflowWrap: "anywhere" }}>
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

            {nlpResult ? (
                <div style={{ background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "8px", padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "var(--ice)", fontWeight: "600" }}>{nlpResult.method}</span>
                    {nlpResult.is_software && nlpResult.method?.includes("RapidFuzz") && (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px" }}>
                      Сходство названий: {nlpResult.cosine_similarity}
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

                  {nlpResult.is_software === false && !forceOverride ? (
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
                        Название не похоже на программу. Проверьте написание или добавьте ручное правило группы.
                      </span>
                          </div>
                        </div>

                        {/* 🆕 Прячем кнопку принудительного добавления, если нет прав */}
                        {canEdit && (
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
                        )}
                      </div>
                  ) : (
                      <div style={{ background: "rgba(0,0,0,0.2)", padding: "14px", borderRadius: "6px", border: "1px solid var(--line)", display: "grid", gap: "12px" }}>
                        {forceOverride && nlpResult.is_software === false && (
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
                              <span><strong>Ручное правило группы:</strong> Правило будет применяться только к выбранной группе.</span>
                            </div>
                        )}

                        <div>
                          <label style={{ fontSize: "12px", color: "var(--ice)", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                            Категория программы:
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
                            Статус при проверке рабочих мест:
                          </label>
                          <select aria-label="Статус при проверке"
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
                            Замена или способ перехода:
                          </label>
                          <input aria-label="Замена или способ перехода"
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

                          {/* 🆕 Прячем кнопку сохранения, если нет прав */}
                          {canEdit && (
                              <button
                                  className="on"
                                  disabled={busy}
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
                                {busy ? "..." : "Добавить правило группы"}
                              </button>
                          )}
                        </div>
                      </div>
                  )}

                  {isSavedBanner && (
                      <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(34, 197, 94, 0.15)", border: "1px solid var(--ok)", borderRadius: "6px", color: "var(--ok)", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>✔</span> <strong>Правило сохранено.</strong> Предпросмотр группы обновится. Результаты прошлых аудитов останутся прежними.
                      </div>
                  )}
                </div>
            ) : (
                <div className="empty" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Введите название программы, чтобы проверить её статус.
                </div>
            )}
          </div>
        </Panel>

        {/* МОДАЛЬНОЕ ОКНО ПРЕДУПРЕЖДЕНИЯ (только для тех, кто может редактировать) */}
        {showWarningModal && canEdit && (
            <div style={{
              position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(4px)", zIndex: 9999,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
            }}>
              <div style={{
                background: "var(--panel-2, #181d28)", border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "12px", padding: "24px 28px", maxWidth: "520px", width: "100%",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)", display: "grid", gap: "16px"
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
                  <div style={{ padding: "10px 12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "6px", border: "1px solid #ef4444", color: "var(--text)" }}>
                    В таком случае целевые ПК будут <strong>проверены по вручную добавленному правилу выбранной группы</strong>, Сохранённые результаты прошлых аудитов останутся прежними.
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button className="ghost-btn" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={() => setShowWarningModal(false)}>
                    Отмена
                  </button>
                  <button style={{ padding: "8px 18px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}
                          onClick={() => { setShowWarningModal(false); setForceOverride(true); }}>
                    ⚠️ Да, я хочу добавить блокиратор
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* 2. ПАНЕЛЬ УПРАВЛЕНИЯ ПРАВИЛАМИ */}
        <Panel
            title="Правила ПО выбранной группы"
            hint="Управление правилами: пресеты, ручное создание, импорт/экспорт JSON"
        >
          {error && <div className="error">{error}</div>}

          {/* 🆕 Скрываем панель инструментов, если нет прав */}
          {canEdit && (
              <div className="rules-presets" style={{ marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {PRESETS.map((p) => (
                    <button key={p.label} className="ghost-btn" disabled={busy}
                            onClick={() => {
                              setBusy(true);
                              apiFetch("/api/v1/policy/custom-rules?group=" + encodeURIComponent(group), {
                                method: "POST", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(p.payload)
                              })
                                  .then(r => r.ok ? r.json() : Promise.reject("Ошибка"))
                                  .then(() => loadRules())
                                  .catch(e => setError(e))
                                  .finally(() => setBusy(false));
                            }}>
                      {p.label}
                    </button>
                ))}

                <button className="ghost-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
                  ⬆ Загрузить JSON
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      uploadJson(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                />

                <button className="ghost-btn" onClick={exportJson}>
                  ⬇ Скачать JSON
                </button>
              </div>
          )}

          <div className="table-wrapper">
            <table>
              <thead>
              <tr>
                <th>Наименование ПО</th>
                <th>Паттерн поиска</th>
                <th>Назначенный класс ПО</th>
                <th style={{ textAlign: "center" }}>Статус</th>
                <th>Рекомендованный аналог</th>
                {canEdit && <th></th>}
              </tr>
              </thead>
              <tbody>
              {rules.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.software_name}</strong></td>
                    <td style={{ color: "var(--muted)", fontFamily: "monospace" }}>{r.pattern}</td>
                    <td>{r.category}</td>
                    <td style={{ textAlign: "center" }}>
                    <span className={`status ${r.status === "blocker" ? "blocked" : r.status === "native_ready" ? "ready" : "partial"}`}>
                      {r.status === "blocker" ? "Блокер" : r.status === "native_ready" ? "Готов" : "Проверка"}
                    </span>
                    </td>
                    <td style={{ color: "var(--ok)", fontSize: "13px" }}>{r.alternative}</td>
                    {/* 🆕 Прячем кнопку удаления, если нет прав */}
                    {canEdit && (
                        <td style={{ textAlign: "right" }}>
                          <button aria-label={`Удалить правило ${r.software_name}`} className="ghost-btn" style={{ padding: "3px 8px", color: "var(--bad)" }} onClick={() => handleDeleteRule(r.id)}>
                            ✕
                          </button>
                        </td>
                    )}
                  </tr>
              ))}
              {!rules.length && (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="empty" style={{ textAlign: "center", padding: "16px" }}>Зафиксированных правил пока нет</td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
  );
}