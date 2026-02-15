const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
}

export async function apiLogin(password: string) {
    return request("/login", {
        method: "POST",
        body: JSON.stringify({ password: password.trim() }),
    }) as Promise<{ token: string }>;
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
