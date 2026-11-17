import { useEffect, useState } from "react";
import { Panel } from "./ui";
import { apiFetch } from "./api.js";

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Форма создания
    const [form, setForm] = useState({
        email: "", full_name: "", password: "", role: "viewer"
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadUsers = () => {
        setLoading(true);
        apiFetch("/api/v1/admin/users")
            .then((r) => (r.ok ? r.json() : []))
            .then(setUsers)
            .catch((e) => setError("Не удалось загрузить пользователей"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        try {
            const res = await apiFetch("/api/v1/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Ошибка создания");
            }

            setSuccess(`Пользователь ${form.email} успешно создан!`);
            setForm({ email: "", full_name: "", password: "", role: "viewer" });
            loadUsers(); // Обновить список
            setTimeout(() => setSuccess(""), 3000);
        } catch (e) {
            setError(e.message);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await apiFetch(`/api/v1/admin/users/${userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            loadUsers();
        } catch (e) {
            alert("Ошибка изменения роли");
        }
    };

    return (
        <div style={{ display: "grid", gap: "24px" }}>
            {/* Форма создания */}
            <Panel title="➕ Создание нового пользователя" hint="Доступно только администраторам">
                {error && <div className="error">{error}</div>}
                {success && <div style={{ color: "var(--ok)", marginBottom: "12px", padding: "10px", background: "rgba(95,224,166,.1)", borderRadius: "8px" }}>{success}</div>}

                <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <label className="slider">
                        <span>Email</span>
                        <input
                            className="search"
                            type="email"
                            required
                            style={{ width: "100%", marginTop: 6 }}
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </label>

                    <label className="slider">
                        <span>ФИО</span>
                        <input
                            className="search"
                            required
                            style={{ width: "100%", marginTop: 6 }}
                            value={form.full_name}
                            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        />
                    </label>

                    <label className="slider">
                        <span>Пароль</span>
                        <input
                            className="search"
                            type="password"
                            required
                            style={{ width: "100%", marginTop: 6 }}
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </label>

                    <label className="slider">
                        <span>Роль</span>
                        <select
                            className="search"
                            style={{ width: "100%", marginTop: 6 }}
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                        >
                            <option value="viewer">Наблюдатель (только просмотр)</option>
                            <option value="analyst">Аналитик (загрузка аудита)</option>
                            <option value="admin">Администратор (все права)</option>
                        </select>
                    </label>

                    <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                        <button className="primary-button" type="submit">Создать пользователя</button>
                    </div>
                </form>
            </Panel>

            {/* Список пользователей */}
            <Panel title="👥 Пользователи системы" hint="Все зарегистрированные в системе аккаунты">
                {loading ? (
                    <p className="empty">Загрузка...</p>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Email</th>
                                <th>ФИО</th>
                                <th>Роль</th>
                                <th>Статус</th>
                                <th>Создан</th>
                            </tr>
                            </thead>
                            <tbody>
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td>{u.id}</td>
                                    <td><strong>{u.email}</strong></td>
                                    <td>{u.full_name}</td>
                                    <td>
                                        <select
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                            style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", padding: "4px 8px", borderRadius: "4px" }}
                                        >
                                            <option value="viewer">viewer</option>
                                            <option value="analyst">analyst</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </td>
                                    <td>
                      <span className={`status ${u.is_active ? "ready" : "blocked"}`}>
                        {u.is_active ? "Активен" : "Заблокирован"}
                      </span>
                                    </td>
                                    <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                                        {new Date(u.created_at).toLocaleDateString("ru-RU")}
                                    </td>
                                </tr>
                            ))}
                            {!users.length && (
                                <tr>
                                    <td colSpan={6} className="empty">Пользователей пока нет</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </div>
    );
}