import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";

export default function Login() {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();

    const submit = async () => {
        setErr(null);
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setErr(data?.message || "Login eșuat");
                return;
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("userName", data.name || name);
            nav("/", { replace: true });
        } catch {
            setErr("Failed to fetch (verifică API_URL / CORS / server pornit)");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900/70 border border-slate-700 rounded-2xl p-6">
                <h1 className="text-2xl font-semibold text-center mb-6">Login</h1>

                {err && <div className="mb-4 bg-red-500/20 text-red-300 p-3 rounded-lg">{err}</div>}

                <label className="text-slate-300 text-sm">Nume și prenume</label>
                <input
                    className="w-full mt-1 mb-4 bg-transparent border border-slate-700 rounded-lg p-3 outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Gorceag Sergiu"
                />

                <label className="text-slate-300 text-sm">Parola</label>
                <input
                    className="w-full mt-1 mb-6 bg-transparent border border-slate-700 rounded-lg p-3 outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Afoa!1234"
                    type="password"
                />

                <button
                    onClick={submit}
                    disabled={loading}
                    className="w-full bg-pink-600 hover:bg-pink-500 transition rounded-lg py-3 font-semibold disabled:opacity-60"
                >
                    {loading ? "Se loghează..." : "Intră"}
                </button>
            </div>
        </div>
    );
}