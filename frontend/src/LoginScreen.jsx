import { useState } from "react";

export default function LoginScreen({ onLogin }) {
    const [email, setEmail] = useState("admin@alrosa.ru");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const body = new URLSearchParams();
            body.append("username", email);
            body.append("password", password);

            const res = await fetch("/api/v1/auth/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body,
            });
            if (!res.ok) throw new Error(res.status === 401 ? "Проверьте почту и пароль" : "Сервис временно недоступен. Попробуйте ещё раз");
            const data = await res.json();
            onLogin(data.access_token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return <main className="login-page"><form onSubmit={submit} className="login-form">
 <div className="eyebrow">ALROSA IT</div><h1>Вход в рабочее пространство</h1>
 <p>Проверка готовности рабочих мест к переходу на отечественное ПО.</p>
 <label htmlFor="login-email">Рабочая почта</label><input id="login-email" name="username" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
 <label htmlFor="login-password">Пароль</label><input id="login-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
 {error && <p role="alert" className="error">{error === "Failed to fetch" ? "Не удалось связаться с сервером. Проверьте подключение" : error}</p>}
 <button className="primary-btn" type="submit" disabled={loading}>{loading ? "Входим…" : "Войти"}</button><small>Используйте учётную запись, выданную администратором.</small>
 </form></main>;
}
