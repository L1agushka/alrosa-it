import { useEffect, useState, useMemo } from "react";

export default function SoftwareCatalog() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    setRefreshing(true);
    fetch(`/api/v1/catalog/compatibility?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" }
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const map = new Map();
        for (const item of data) {
          const name = item.software_name || item.name;
          if (name && !map.has(name)) {
            map.set(name, item);
          }
        }
        setItems(Array.from(map.values()));
      })
      .catch((e) => console.error("Catalog fetch error:", e))
      .finally(() => {
        setLoading(false);
        setTimeout(() => setRefreshing(false), 300);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteCustom = (ruleId) => {
    if (!ruleId) return;
    fetch(`/api/v1/policy/custom-rules/${ruleId}`, { method: "DELETE" })
      .then(() => loadData())
      .catch((e) => console.error("Error deleting rule:", e));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      const name = (item.software_name || item.name || "").toLowerCase();
      const alt = (item.analog_name || item.alternative_software || item.linux_alternative || "").toLowerCase();
      const matchText = name.includes(q) || alt.includes(q);

      const isBlocker = item.is_blocker || item.status === "incompatible";
      const isNative = item.status === "native";
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "blocker" && isBlocker) ||
        (filterStatus === "native" && isNative) ||
        (filterStatus === "alternative" && !isBlocker && !isNative);

      return matchText && matchStatus;
    });
  }, [items, search, filterStatus]);

  if (loading) {
    return <div className="empty" style={{ padding: "16px" }}>Загрузка каталога ПО...</div>;
  }

  const customCount = items.filter((i) => i.comment && i.comment.startsWith("CUSTOM_RULE:")).length;

  return (
    <div>
      {/* ПАНЕЛЬ УПРАВЛЕНИЯ: ПОИСК, ФИЛЬТР И КНОПКА ОБНОВЛЕНИЯ */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <input
          className="search"
          style={{ flex: 1, padding: "8px 14px", fontSize: "13px" }}
          placeholder={`Поиск по ${items.length} программам каталога...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            background: "var(--panel-2)",
            color: "var(--text)",
            border: "1px solid var(--line)",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "13px"
          }}
        >
          <option value="all">Все ({items.length})</option>
          <option value="native">Есть нативно</option>
          <option value="alternative">Аналог / Проверка</option>
          <option value="blocker">Блокеры</option>
        </select>

        <button
          className="ghost-btn"
          onClick={loadData}
          title="Синхронизировать справочник с кастомными политиками"
          style={{
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            cursor: "pointer",
            background: refreshing ? "rgba(56, 189, 248, 0.15)" : undefined,
            color: refreshing ? "var(--ice)" : undefined,
            border: "1px solid var(--line)",
            borderRadius: "6px",
            fontWeight: "600"
          }}
        >
          <span
            style={{
              display: "inline-block",
              transition: "transform 0.35s ease",
              transform: refreshing ? "rotate(360deg)" : "rotate(0deg)"
            }}
          >
            🔄
          </span>
          <span>{refreshing ? "Синхронизация..." : "Обновить"}</span>
        </button>
      </div>

      <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
        <span>🛡</span> В каталог включено <strong>{customCount}</strong> правил из реестра кастомных политик.
      </div>

      {/* ТАБЛИЦА СОВМЕСТИМОСТИ */}
      <div className="table-wrapper" style={{ maxHeight: "460px", overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Программа Windows</th>
              <th>Решение для Astra Linux</th>
              <th style={{ textAlign: "center" }}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const name = item.software_name || item.name;
              const isBlocker = item.is_blocker || item.status === "incompatible";
              const isNative = item.status === "native";

              const isCustom = item.comment && item.comment.startsWith("CUSTOM_RULE:");
              const customRuleId = isCustom ? item.comment.split("|")[0].replace("CUSTOM_RULE:", "") : null;

              let solutionText = item.analog_name;
              if (!solutionText) {
                solutionText = isNative ? "Нативно (Linux-версия)" : "Проверка поставщика";
              }

              return (
                <tr key={item.id || name}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong>{name}</strong>
                      {isCustom && (
                        <span
                          style={{
                            fontSize: "10px",
                            background: "rgba(56, 189, 248, 0.12)",
                            color: "var(--ice)",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            borderRadius: "4px",
                            padding: "1px 6px"
                          }}
                        >
                          Политика
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: isNative ? "var(--ok)" : isBlocker ? "var(--bad)" : "var(--warn)" }}>
                    {solutionText}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      {isBlocker ? (
                        <span className="status blocked" style={{ fontSize: "11px", padding: "2px 8px" }}>Блокер</span>
                      ) : isNative ? (
                        <span className="status ready" style={{ fontSize: "11px", padding: "2px 8px" }}>Есть</span>
                      ) : (
                        <span className="status partial" style={{ fontSize: "11px", padding: "2px 8px" }}>Аналог</span>
                      )}

                      {isCustom && (
                        <button
                          className="ghost-btn"
                          title="Удалить это правило"
                          style={{
                            padding: "1px 6px",
                            color: "var(--bad)",
                            fontSize: "12px",
                            border: "none",
                            cursor: "pointer"
                          }}
                          onClick={() => handleDeleteCustom(customRuleId)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={3} className="empty" style={{ textAlign: "center", padding: "20px" }}>
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
