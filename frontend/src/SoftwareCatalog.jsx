import { useEffect, useState, useMemo } from "react";

const statusConfig = {
  native_ready: { label: "Есть", cls: "ready" },
  alternative_available: { label: "Аналог", cls: "partial" },
  web_alternative: { label: "Web-версия", cls: "partial" },
  blocker: { label: "Блокер", cls: "blocked" },
  manual_check: { label: "Вручную", cls: "partial" }
};

export default function SoftwareCatalog() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/catalog/compatibility")
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
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      const name = (item.software_name || item.name || "").toLowerCase();
      const alt = (item.alternative_software || item.alternative_name || item.linux_alternative || "").toLowerCase();
      const matchText = name.includes(q) || alt.includes(q);
      const matchStatus = filterStatus === "all" || item.status === filterStatus || (filterStatus === "blocker" && item.is_blocker);
      return matchText && matchStatus;
    });
  }, [items, search, filterStatus]);

  if (loading) {
    return <div className="empty" style={{ padding: "16px" }}>Загрузка каталога ПО...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px", alignItems: "center" }}>
        <input
          className="search"
          style={{ flex: 1, padding: "7px 12px", fontSize: "13px" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Поиск по ${items.length} программам каталога...`}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ background: "var(--panel-2)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "6px", padding: "7px 10px", fontSize: "13px" }}
        >
          <option value="all">Все ({items.length})</option>
          <option value="native_ready">Нативные</option>
          <option value="alternative_available">Есть аналог</option>
          <option value="blocker">Блокеры</option>
        </select>
      </div>

      <div style={{ maxHeight: "280px", overflowY: "auto", border: "1px solid var(--line)", borderRadius: "6px" }}>
        <table>
          <thead>
            <tr style={{ position: "sticky", top: 0, background: "var(--panel)", zIndex: 1 }}>
              <th style={{ fontSize: "12px" }}>Программа Windows</th>
              <th style={{ fontSize: "12px" }}>Решение для Astra Linux</th>
              <th style={{ fontSize: "12px", textAlign: "center" }}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const name = item.software_name || item.name;
              const alt = item.alternative_software || item.alternative_name || item.linux_alternative || (item.status === "native_ready" ? "Нативно (Linux-версия)" : item.status === "blocker" ? "Прямого аналога нет" : "Проверка поставщика");
              const cfg = statusConfig[item.status] || (item.is_blocker ? statusConfig.blocker : statusConfig.alternative_available);

              return (
                <tr key={item.id || name}>
                  <td><strong>{name}</strong></td>
                  <td style={{ color: "var(--muted)", fontSize: "13px" }}>{alt}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`status ${cfg.cls}`}>{cfg.label}</span>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={3} className="empty" style={{ textAlign: "center", padding: "16px" }}>ПО не найдено</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
