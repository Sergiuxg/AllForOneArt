import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";


type EventForm = {
    date: string;
    time: string; // kept for form, not shown in calendar
    type: "Nunta" | "Botez" | "Corporate";
    status: "Semnat" | "In Asteptare";
    location: string;
    street: string;
    details: string;
    miri: string;
    contact: string;
    price: string;
    avans: string;

    detailsWedding: string;

    moderator: string;
    moderatorContact: string;
    moderatorDetails: string;

    fotoVideo: string;
    fotoVideoContact: string;
    fotoVideoDetails: string;

    muzica: string;
    muzicaContact: string;
    muzicaDetails: string;

    color: string; // hex
};

type ApiEvent = {
    id: string;
    title: string;
    start: string; // ISO date (YYYY-MM-DD) for allDay
    allDay: boolean;
    backgroundColor?: string;
    borderColor?: string;
    extendedProps?: Partial<EventForm>;
};

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";
const TOKEN_KEY = "token";

function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
}

async function apiRequest(path: string, options: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `API error: ${res.status}`);
    }
    return res;
}

async function fetchEventsApi(): Promise<EventInput[]> {
    const res = await apiRequest("/events", { method: "GET" });
    const data = (await res.json()) as ApiEvent[];
    // Make sure FullCalendar gets valid EventInput[]
    return (Array.isArray(data) ? data : []).map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        allDay: true,
        backgroundColor: e.backgroundColor,
        borderColor: e.borderColor,
        extendedProps: e.extendedProps || {},
    }));
}

async function createEventApi(payload: ApiEvent) {
    await apiRequest("/events", { method: "POST", body: JSON.stringify(payload) });
}

async function updateEventApi(id: string, payload: ApiEvent) {
    await apiRequest(`/events/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

async function deleteEventApi(id: string) {
    await apiRequest(`/events/${id}`, { method: "DELETE" });
}

export default function Dashboard() {
    const emptyForm: EventForm = useMemo(
        () => ({
            date: "",
            time: "",
            type: "Nunta",
            status: "Semnat",
            location: "",
            street: "",
            details: "",
            miri: "",
            contact: "",
            price: "",
            avans: "",
            detailsWedding: "",
            moderator: "",
            moderatorContact: "",
            moderatorDetails: "",
            fotoVideo: "",
            fotoVideoContact: "",
            fotoVideoDetails: "",
            muzica: "",
            muzicaContact: "",
            muzicaDetails: "",
            color: "#000000",
        }),
        []
    );

    const [activeView, setActiveView] = useState<"calendar" | "newEvent">("calendar");
    const [events, setEvents] = useState<EventInput[]>([]);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string>("");

    // edit modal
    const [isOpen, setIsOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    const [formData, setFormData] = useState<EventForm>(emptyForm);

    const closeModal = () => {
        setIsOpen(false);
        setEditingEventId(null);
        setFormData(emptyForm);
    };

    const openNewEvent = () => {
        setIsOpen(false);
        setEditingEventId(null);
        setFormData(emptyForm);
        setActiveView("newEvent");
    };

    // Load events from backend
    const reloadEvents = async () => {
        setApiError("");
        setLoading(true);
        try {
            const serverEvents = await fetchEventsApi();
            setEvents(serverEvents);
        } catch (e: any) {
            setApiError(e?.message || "Eroare la încărcarea evenimentelor");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        reloadEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDateClick = (info: DateClickArg) => {
        setFormData((prev) => ({
            ...prev,
            ...emptyForm,
            date: info.dateStr,
        }));
        setActiveView("newEvent");
    };

    const buildPayload = (id?: string): ApiEvent => {
        const eventId = id || editingEventId || Date.now().toString();

        const safeDate =
            formData.date || new Date().toISOString().slice(0, 10);

        const safeTitle =
            formData.location
                ? `${formData.type} - ${formData.location}`
                : `${formData.type} - Eveniment`;

        return {
            id: eventId,
            title: safeTitle,
            start: safeDate,
            allDay: true,
            backgroundColor: formData.color || "black",
            borderColor: formData.color || "black",
            extendedProps: { ...formData },
        };
    };


    const handleEventClick = (info: EventClickArg) => {
        const event = info?.event;
        if (!event) return;

        const start = event.start;
        const dateStr = start ? start.toISOString().slice(0, 10) : "";

        const props = (event.extendedProps || {}) as Partial<EventForm>;

        setFormData({
            ...emptyForm,
            ...props,
            date: props.date || dateStr,
            time: props.time || "",
            type: (props.type as any) || "Nunta",
            status: (props.status as any) || "Semnat",
            color: props.color || (event.backgroundColor as string) || "#000000",
        });

        setEditingEventId(event.id);
        setIsOpen(true);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
    };


    const handleSubmit = async () => {
        setApiError("");
        setLoading(true);

        try {
            if (editingEventId) {
                const payload = buildPayload(editingEventId);
                await updateEventApi(editingEventId, payload);
                await reloadEvents();
                closeModal();
            } else {
                const payload = buildPayload();
                await createEventApi(payload);
                await reloadEvents();
                setFormData(emptyForm);
                setActiveView("calendar");
            }
        } catch (e: any) {
            setApiError(e?.message || "Eroare la salvare");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingEventId) return;

        setApiError("");
        setLoading(true);

        try {
            await deleteEventApi(editingEventId);
            await reloadEvents();
            closeModal();
        } catch (e: any) {
            setApiError(e?.message || "Eroare la ștergere");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 flex flex-col md:flex-row">
            {/* SIDEBAR */}
            <aside className="w-full md:w-64 bg-slate-900/90 border-b md:border-b-0 md:border-r border-slate-700 p-4 md:p-5">
                {/* Logo centered on mobile, left on desktop */}
                <div className="flex justify-center md:justify-start items-center gap-3 mb-5 md:mb-8">
                    <img
                        src="https://afoa.gnm.md/static//admin/logo.png"
                        alt="Logo"
                        className="w-12 h-12"
                    />
                    <div className="font-semibold hidden md:block">All For One Art</div>
                </div>

                {/* Buttons centered on mobile */}
                <nav className="flex justify-center md:justify-start gap-3 md:flex-col text-sm">
                    <button
                        onClick={() => {
                            setActiveView("calendar");
                            setIsOpen(false);
                        }}
                        className={`px-6 py-2 rounded-lg text-center md:text-left transition ${
                            activeView === "calendar" ? "bg-red-600 text-white" : "hover:bg-slate-700/40"
                        }`}
                    >
                        Dashboard
                    </button>

                    <button
                        onClick={openNewEvent}
                        className={`px-6 py-2 rounded-lg text-center md:text-left transition ${
                            activeView === "newEvent" ? "bg-red-600 text-white" : "hover:bg-slate-700/40"
                        }`}
                    >
                        Eveniment Nou
                    </button>
                </nav>
            </aside>

            {/* MAIN */}
            <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
                {/* Header */}
                <header className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <p className="text-sm text-slate-400">
                            {activeView === "calendar" ? "Dashboard" : "Eveniment Nou"}
                        </p>
                        <h1 className="text-xl md:text-2xl font-semibold">All For One Art</h1>
                        {apiError && <p className="text-sm text-red-400 mt-2">{apiError}</p>}
                    </div>

                    {activeView === "newEvent" && (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="border border-pink-500 text-pink-500 px-4 md:px-6 py-2 rounded-lg hover:bg-pink-500 hover:text-white transition disabled:opacity-50"
                        >
                            {loading ? "SALVEAZĂ..." : "SALVEAZĂ"}
                        </button>
                    )}
                </header>

                {/* CALENDAR full height */}
                {activeView === "calendar" && (
                    <section className="flex-1 bg-slate-800 rounded-xl border border-slate-700 p-3 md:p-4 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-slate-400">
                                {loading ? "Se încarcă..." : `${events.length} evenimente`}
                            </div>
                            <button
                                onClick={reloadEvents}
                                disabled={loading}
                                className="text-sm px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                            >
                                Refresh
                            </button>
                        </div>

                        <div className="flex-1 min-h-0">
                            <FullCalendar
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                firstDay={1}                 // ✅ luni
                                locale="ro"                  // opțional, pentru luni/marți în română
                                headerToolbar={{
                                    left: "",
                                    center: "title",
                                    right: "today prev,next",
                                }}
                                events={events}
                                displayEventTime={false}
                                height="auto"
                            />

                        </div>
                    </section>
                )}

                {/* NEW EVENT PAGE */}
                {activeView === "newEvent" && (
                    <section className="flex-1 bg-slate-800 rounded-xl border border-slate-700 p-5 md:p-10 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 xl:gap-14">
                            <div>
                                <label className="text-slate-400 text-sm">Data</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Ora</label>
                                <input
                                    type="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Tip Eveniment</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="w-full bg-slate-700 rounded-md p-2 mt-1"
                                >
                                    <option value="Nunta">Nunta</option>
                                    <option value="Botez">Cumătrie</option>
                                    <option value="Corporate">Alteceva</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full bg-slate-700 rounded-md p-2 mt-1"
                                >
                                    <option value="Semnat">Semnat</option>
                                    <option value="In Asteptare">In Asteptare</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Culoarea</label>
                                <input
                                    type="color"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleChange}
                                    className="h-10 w-16 bg-transparent mt-2"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Locatia</label>
                                <input
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Strada</label>
                                <input
                                    name="street"
                                    value={formData.street}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Detalii</label>
                                <input
                                    name="details"
                                    value={formData.details}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Miri</label>
                                <input
                                    name="miri"
                                    value={formData.miri}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Contacte</label>
                                <input
                                    name="contact"
                                    value={formData.contact}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Pret</label>
                                <input
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Avans</label>
                                <input
                                    name="avans"
                                    value={formData.avans}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            <div className="md:col-span-2 xl:col-span-3">
                                <label className="text-slate-400 text-sm">Detalii despre nunta</label>
                                <textarea
                                    name="detailsWedding"
                                    value={formData.detailsWedding}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none min-h-[80px]"
                                />
                            </div>

                            {/* Moderator */}
                            <div>
                                <label className="text-slate-400 text-sm">Moderator</label>
                                <input
                                    name="moderator"
                                    value={formData.moderator}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Contacte</label>
                                <input
                                    name="moderatorContact"
                                    value={formData.moderatorContact}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Detalii</label>
                                <input
                                    name="moderatorDetails"
                                    value={formData.moderatorDetails}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            {/* Foto/Video */}
                            <div>
                                <label className="text-slate-400 text-sm">Foto/Video</label>
                                <input
                                    name="fotoVideo"
                                    value={formData.fotoVideo}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Contacte</label>
                                <input
                                    name="fotoVideoContact"
                                    value={formData.fotoVideoContact}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Detalii</label>
                                <input
                                    name="fotoVideoDetails"
                                    value={formData.fotoVideoDetails}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>

                            {/* Muzica */}
                            <div>
                                <label className="text-slate-400 text-sm">Muzica</label>
                                <input
                                    name="muzica"
                                    value={formData.muzica}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Contacte</label>
                                <input
                                    name="muzicaContact"
                                    value={formData.muzicaContact}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Detalii</label>
                                <input
                                    name="muzicaDetails"
                                    value={formData.muzicaDetails}
                                    onChange={handleChange}
                                    className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between mt-10">
                            <button
                                onClick={() => setActiveView("calendar")}
                                className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg"
                            >
                                Inapoi la Calendar
                            </button>

                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="border border-pink-500 text-pink-500 px-6 py-2 rounded-lg hover:bg-pink-500 hover:text-white transition disabled:opacity-50"
                            >
                                {loading ? "SALVEAZĂ..." : "SALVEAZĂ"}
                            </button>
                        </div>
                    </section>
                )}

                {/* EDIT MODAL */}
                {isOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
                        <div className="bg-slate-800 w-full max-w-4xl rounded-xl p-5 md:p-8 border border-slate-700 relative max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl md:text-3xl font-semibold text-center mb-6">
                                Modifica Eveniment
                            </h2>

                            <button
                                onClick={closeModal}
                                className="absolute top-4 right-4 text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <label className="text-slate-400 text-sm">Data</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Ora</label>
                                    <input
                                        type="time"
                                        name="time"
                                        value={formData.time}
                                        onChange={handleChange}
                                        className="w-full bg-transparent border-b border-slate-600 py-2 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Tip</label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        className="w-full bg-slate-700 rounded-md p-2 mt-1"
                                    >
                                        <option value="Nunta">Nunta</option>
                                        <option value="Botez">Botez</option>
                                        <option value="Corporate">Corporate</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full bg-slate-700 rounded-md p-2 mt-1"
                                    >
                                        <option value="Semnat">Semnat</option>
                                        <option value="In Asteptare">In Asteptare</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-slate-400 text-sm">Locatia</label>
                                    <input
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        className="w-full border border-pink-500 rounded-md p-2 bg-transparent outline-none"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-slate-400 text-sm">Restaurant/Sala</label>
                                    <input
                                        name="street"
                                        value={formData.street}
                                        onChange={handleChange}
                                        className="w-full border border-pink-500 rounded-md p-2 bg-transparent outline-none"
                                    />
                                </div>

                                <div className="lg:col-span-4">
                                    <label className="text-slate-400 text-sm">Detalii despre nunta</label>
                                    <textarea
                                        name="detailsWedding"
                                        value={formData.detailsWedding}
                                        onChange={handleChange}
                                        className="w-full bg-transparent border-b border-slate-600 py-2 outline-none min-h-[80px]"
                                    />
                                </div>

                                {/* Buttons row */}
                                <div className="lg:col-span-4 flex flex-col sm:flex-row justify-center items-center gap-4 mt-4">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="bg-blue-500 px-6 py-2 rounded-md w-full sm:w-auto disabled:opacity-50"
                                    >
                                        {loading ? "Salvez..." : "Salveaza"}
                                    </button>

                                    <button
                                        onClick={closeModal}
                                        className="bg-slate-600 px-6 py-2 rounded-md w-full sm:w-auto"
                                    >
                                        Anuleaza
                                    </button>

                                    <button
                                        onClick={handleDelete}
                                        disabled={loading}
                                        className="bg-red-600 px-6 py-2 rounded-md w-full sm:w-auto disabled:opacity-50"
                                    >
                                        Sterge
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
