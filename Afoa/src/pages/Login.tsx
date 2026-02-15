import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiLogin } from "../services/api"; // trebuie sa existe

export default function Login() {
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { setAuthed } = useAuth(); // vezi AuthContext mai jos

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        setLoading(true);

        try {
            const { token } = await apiLogin(password); // ✅ await in functie async
            localStorage.setItem("token", token);
            setAuthed(true);
            navigate("/", { replace: true });
        } catch (e: any) {
            setError(e?.message || "Eroare necunoscută");
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
            <form
                onSubmit={handleSubmit}
                className="bg-slate-800 border border-slate-700 p-8 rounded-xl w-[360px] space-y-4"
            >
                <h1 className="text-2xl font-semibold text-center">Login</h1>

                {err && <p className="text-red-400 text-sm text-center">{err}</p>}

                <input
                    className="w-full p-3 rounded bg-slate-700 outline-none"
                    placeholder="Parola"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    disabled={loading}
                    className="w-full bg-red-600 p-3 rounded hover:bg-red-500 transition disabled:opacity-50"
                >
                    {loading ? "Se logheaza..." : "Intra"}
                </button>
            </form>
        </div>
    );
}
