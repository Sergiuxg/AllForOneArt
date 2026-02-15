import React, { createContext, useContext, useEffect, useState } from "react";

type AuthCtx = {
    isAuth: boolean;
    setAuthed: (v: boolean) => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuth, setIsAuth] = useState(false);

    useEffect(() => {
        setIsAuth(Boolean(localStorage.getItem("token")));
    }, []);

    return (
        <AuthContext.Provider value={{ isAuth, setAuthed: setIsAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
