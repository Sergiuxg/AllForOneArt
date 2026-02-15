const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getToken() {
    return localStorage.getItem("token") || "";
}

async function request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "API Error");
    }

    return res;
}

export async function apiLogin(password: string) {
    const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    });

    if (!res.ok) {
        throw new Error("Parola gresita");
    }

    return res.json() as Promise<{ token: string }>;
}

export async function fetchEvents() {
    const res = await request("/events");
    return res.json();
}

export async function createEvent(event: any) {
    await request("/events", {
        method: "POST",
        body: JSON.stringify(event),
    });
}

export async function updateEvent(id: string, event: any) {
    await request(`/events/${id}`, {
        method: "PUT",
        body: JSON.stringify(event),
    });
}

export async function deleteEvent(id: string) {
    await request(`/events/${id}`, {
        method: "DELETE",
    });
}
