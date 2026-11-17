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
            if (!res.ok) throw new Error("Неверный email или пароль");
            const data = await res.json();
            onLogin(data.access_token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#090d13" }}>
            <form onSubmit={submit} style={{ background: "#111823", padding: 40, borderRadius: 16, width: 360 }}>
                <h2 style={{ color: "#e8eef5", marginTop: 0 }}>ALROSA IT</h2>
                <p style={{ color: "#8496ab", fontSize: 14 }}>Вход в систему</p>

                <label style={{ color: "#8496ab", fontSize: 13 }}>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%", padding: 10, marginBottom: 14, background: "#172130", border: "1px solid #223044", borderRadius: 8, color: "#e8eef5" }}
                />

                <label style={{ color: "#8496ab", fontSize: 13 }}>Пароль</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "100%", padding: 10, marginBottom: 14, background: "#172130", border: "1px solid #223044", borderRadius: 8, color: "#e8eef5" }}
                />

                {error && <div style={{ color: "#ff6b7a", marginBottom: 14, fontSize: 13 }}>{error}</div>}

                <button
                    type="submit"
                    disabled={loading}
                    style={{ width: "100%", padding: 12, background: "#7fd8ff", color: "#06202c", border: 0, borderRadius: 10, fontWeight: 700, cursor: "pointer" }}
                >
                    {loading ? "Вход..." : "Войти"}
                </button>
            </form>
        </div>
    );
}