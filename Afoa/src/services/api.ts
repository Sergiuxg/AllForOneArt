const API_URL = import.meta.env.VITE_API_URL;

export async function request(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...options,
    });

    // 👇 AICI adăugăm protecția
    if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
    }

    // dacă nu există body (ex: DELETE)
    if (res.status === 204) return null;

    return res.json();
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
    if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
    }

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
