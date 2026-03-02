import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL =
    (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";

export default function Login() {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            setError("");

            const res = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data?.message || "Login failed");
            }

            const data = await res.json();

            localStorage.setItem("token", data.token);
            localStorage.setItem("userName", name);

            navigate("/");
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="bg-slate-800 p-8 rounded-xl w-96 space-y-4">
                <h2 className="text-xl font-semibold text-center">Login</h2>

                {error && (
                    <div className="bg-red-500/20 p-2 rounded text-red-300">
                        {error}
                    </div>
                )}

                <input
                    placeholder="Nume și Prenume"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-700 p-2 rounded"
                />

                <input
                    type="password"
                    placeholder="Parola"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-700 p-2 rounded"
                />

                <button
                    onClick={handleLogin}
                    className="w-full bg-red-600 py-2 rounded hover:bg-red-500"
                >
                    Intră
                </button>
            </div>
        </div>
    );
}