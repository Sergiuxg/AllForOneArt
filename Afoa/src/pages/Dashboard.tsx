import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import roLocale from "@fullcalendar/core/locales/ro";

type EventType = "Nunta" | "Cumătrie" | "Altceva";
type EventStatus = "Semnat" | "In Asteptare";

type EventForm = {
    date: string;
    time: string;
    type: EventType;
    status: EventStatus;
    location: string;
    street: string;
    details: string;
    miri: string;
    contact: string;
    price: string;
    avans: string;

    nrPerechi: number;           // ✅ nou
    dancers: string[];           // ✅ nou (2*nrPerechi)

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

    color: string;
};

type ApiEvent = {
    id: string;
    title: string;
    start: string; // YYYY-MM-DD
    allDay: boolean;
    backgroundColor?: string;
    borderColor?: string;
    extendedProps?: Partial<EventForm>;
};

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3001";
const TOKEN_KEY = "token";
const USER_KEY = "userName";

// ✅ înlocuiești cu lista ta completă
const DANCERS_LIST = [
    "Gorceag Sergiu",
    "Popescu Ana",
    "Ionescu Mihai",
    "Rusu Maria",
    "Balan Andrei",
    "Ceban Elena",
];

function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
}
function getUserName() {
    return localStorage.getItem(USER_KEY) || "";
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

    // ✅ dacă token invalid -> logout
    if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/login";
        throw new Error("Unauthorized");
    }

    if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = data?.message || `API error: ${res.status}`;
        throw new Error(msg);
    }

    return res;
}

async function fetchEventsApi(): Promise<EventInput[]> {
    const res = await apiRequest("/events", { method: "GET" });
    const data = (await res.json()) as ApiEvent[];

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

function ensureDancersLength(dancers: string[], nrPerechi: number) {
    const need = Math.max(0, nrPerechi * 2);
    const copy = Array.isArray(dancers) ? [...dancers] : [];
    while (copy.length < need) copy.push("");
    return copy.slice(0, need);
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

            nrPerechi: 2,
            dancers: ["", "", "", ""],

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

    const [activeView, setActiveView] = useState<"calendar" | "newEvent" | "myEvents">("calendar");
    const [events, setEvents] = useState<EventInput[]>([]);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string>("");

    const [isOpen, setIsOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [formData, setFormData] = useState<EventForm>(emptyForm);

    const [formError, setFormError] = useState<string | null>(null);        // ✅ eroare în modal/form
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);      // ✅ confirm delete

    const userName = getUserName();

    const closeModal = () => {
        setIsOpen(false);
        setEditingEventId(null);
        setFormError(null);
        setDeleteConfirmOpen(false);
        setFormData(emptyForm);
    };

    const openNewEvent = () => {
        setFormError(null);
        setIsOpen(false);
        setEditingEventId(null);
        setFormData(emptyForm);
        setActiveView("newEvent");
    };

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

    // ----------------------------
    // ✅ Prevent duplicate dancer in same event (frontend)
    const handleDancerChange = (index: number, value: string) => {
        setFormError(null);

        const current = formData.dancers || [];
        // dacă value e deja în alt select
        if (value && current.includes(value) && current[index] !== value) {
            setFormError(`Dansatorul "${value}" este deja selectat în acest eveniment.`);
            return;
        }

        const copy = [...current];
        copy[index] = value;
        setFormData((p) => ({ ...p, dancers: copy }));
    };

    const handleNrPerechiChange = (value: number) => {
        setFormError(null);
        setFormData((p) => ({
            ...p,
            nrPerechi: value,
            dancers: ensureDancersLength(p.dancers, value),
        }));
    };

    // ----------------------------
    const handleDateClick = (info: DateClickArg) => {
        setFormError(null);
        setFormData((prev) => ({
            ...emptyForm,
            ...prev,
            date: info.dateStr,
        }));
        setActiveView("newEvent");
    };

    const buildPayload = (id?: string): ApiEvent => {
        const eventId = id || editingEventId || Date.now().toString();
        const safeDate = formData.date || new Date().toISOString().slice(0, 10);

        const safeTitle = formData.location
            ? `${formData.type} - ${formData.location}`
            : `${formData.type} - Eveniment`;

        return {
            id: eventId,
            title: safeTitle,
            start: safeDate,
            allDay: true,
            backgroundColor: formData.color || "black",
            borderColor: formData.color || "black",
            extendedProps: {
                ...formData,
                // ✅ curățăm dancers (fără stringuri goale)
                dancers: (formData.dancers || []).map(String),
            },
        };
    };

    const handleEventClick = (info: EventClickArg) => {
        const event = info?.event;
        if (!event) return;

        const start = event.start;
        const dateStr = start ? start.toISOString().slice(0, 10) : "";

        const props = (event.extendedProps || {}) as Partial<EventForm>;

        const nr = Number(props.nrPerechi || 2);
        const dancers = ensureDancersLength((props.dancers || []) as string[], nr);

        setFormError(null);
        setFormData({
            ...emptyForm,
            ...props,
            date: props.date || dateStr,
            time: props.time || "",
            type: (props.type as EventType) || "Nunta",
            status: (props.status as EventStatus) || "Semnat",
            nrPerechi: nr,
            dancers,
            color: props.color || (event.backgroundColor as string) || "#000000",
        });

        setEditingEventId(event.id);
        setIsOpen(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormError(null);
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
    };

    // ✅ salvează (create/update) – dacă backend dă 400, arătăm eroarea și NU închidem
    const handleSubmit = async () => {
        setApiError("");
        setFormError(null);
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
            // ✅ AICI vezi conflict “dansator în alt eveniment”
            setFormError(e?.message || "Eroare la salvare");
        } finally {
            setLoading(false);
        }
    };

    // ✅ confirm delete open
    const askDelete = () => setDeleteConfirmOpen(true);

    const handleDeleteConfirmed = async () => {
        if (!editingEventId) return;

        setApiError("");
        setFormError(null);
        setLoading(true);

        try {
            await deleteEventApi(editingEventId);
            await reloadEvents();
            closeModal();
        } catch (e: any) {
            setFormError(e?.message || "Eroare la ștergere");
        } finally {
            setLoading(false);
        }
    };

    // ----------------------------
    // ✅ Evenimentele mele: arată doar evenimente unde userName este în dancers
    const myEvents = useMemo(() => {
        const uname = userName.trim();
        if (!uname) return [];
        return events.filter((ev) => {
            const props: any = (ev as any).extendedProps || {};
            const dancers: string[] = Array.isArray(props.dancers) ? props.dancers : [];
            return dancers.includes(uname);
        });
    }, [events, userName]);

    // ----------------------------
    const renderDancersSelects = () => {
        const nr = Math.max(1, Math.min(4, Number(formData.nrPerechi || 1)));
        const dancers = ensureDancersLength(formData.dancers || [], nr);

        return (
            <div className="lg:col-span-4">
                <label className="text-slate-400 text-sm">Dansatori (Nr. perechi: {nr})</label>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: nr * 2 }).map((_, idx) => (
                        <div key={idx} className="bg-slate-900/40 border border-slate-700 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-2">Dansator #{idx + 1}</div>

                            <select
                                value={dancers[idx] || ""}
                                onChange={(e) => handleDancerChange(idx, e.target.value)}
                                className="w-full bg-slate-700 rounded-md p-2 outline-none"
                            >
                                <option value="">Selectează</option>

                                {DANCERS_LIST.map((d) => (
                                    <option
                                        key={d}
                                        value={d}
                                        disabled={dancers.includes(d) && dancers[idx] !== d}
                                    >
                                        {d}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 flex flex-col md:flex-row">
            {/* SIDEBAR */}
            <aside className="w-full md:w-64 bg-slate-900/90 border-b md:border-b-0 md:border-r border-slate-700 p-4 md:p-5">
                <div className="flex justify-center md:justify-start items-center gap-3 mb-5 md:mb-8">
                    <img src="https://afoa.gnm.md/static//admin/logo.png" alt="Logo" className="w-12 h-12" />
                    <div className="font-semibold hidden md:block">All For One Art</div>
                </div>

                <div className="text-center md:text-left mb-4 text-slate-300">
                    Salut, <span className="font-semibold text-white">{userName || "User"}</span>
                </div>

                <nav className="flex justify-center md:justify-start gap-3 md:flex-col text-sm">
                    <button
                        onClick={() => { setActiveView("calendar"); setIsOpen(false); }}
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

                    <button
                        onClick={() => { setActiveView("myEvents"); setIsOpen(false); }}
                        className={`px-6 py-2 rounded-lg text-center md:text-left transition ${
                            activeView === "myEvents" ? "bg-red-600 text-white" : "hover:bg-slate-700/40"
                        }`}
                    >
                        Evenimentele mele
                    </button>
                </nav>
            </aside>

            {/* MAIN */}
            <main className="flex-1 flex flex-col overflow-hidden p-4 md:p-6">
                <header className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <p className="text-sm text-slate-400">
                            {activeView === "calendar" ? "Dashboard" : activeView === "newEvent" ? "Eveniment Nou" : "Evenimentele mele"}
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

                {/* DASHBOARD CALENDAR */}
                {activeView === "calendar" && (
                    <section className="flex-1 bg-slate-800 rounded-xl border border-slate-700 p-3 md:p-4 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-slate-400">{loading ? "Se încarcă..." : `${events.length} evenimente`}</div>
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
                                firstDay={1}
                                locale={roLocale}
                                plugins={[dayGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{ left: "", center: "title", right: "today prev,next" }}
                                events={events}
                                dateClick={handleDateClick}
                                eventClick={handleEventClick}
                                selectable
                                displayEventTime={false}
                                showNonCurrentDates={false}
                                fixedWeekCount={false}
                                height="100%"
                            />
                        </div>
                    </section>
                )}

                {/* MY EVENTS CALENDAR */}
                {activeView === "myEvents" && (
                    <section className="flex-1 bg-slate-800 rounded-xl border border-slate-700 p-3 md:p-4 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-slate-400">
                                {loading ? "Se încarcă..." : `${myEvents.length} evenimente pentru ${userName}`}
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
                                firstDay={1}
                                locale={roLocale}
                                plugins={[dayGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{ left: "", center: "title", right: "today prev,next" }}
                                events={myEvents}
                                eventClick={handleEventClick}
                                displayEventTime={false}
                                showNonCurrentDates={false}
                                fixedWeekCount={false}
                                height="100%"
                            />
                        </div>
                    </section>
                )}

                {/* NEW EVENT PAGE */}
                {activeView === "newEvent" && (
                    <section className="flex-1 bg-slate-800 rounded-xl border border-slate-700 p-5 md:p-10 overflow-y-auto">
                        {formError && (
                            <div className="mb-5 bg-red-500/20 text-red-300 p-3 rounded-lg border border-red-500/30">
                                {formError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 xl:gap-14">
                            <div>
                                <label className="text-slate-400 text-sm">Data</label>
                                <input type="date" name="date" value={formData.date} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Ora (opțional)</label>
                                <input type="time" name="time" value={formData.time} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Tip Eveniment</label>
                                <select name="type" value={formData.type} onChange={handleChange}
                                        className="w-full bg-slate-700 rounded-md p-2 mt-1">
                                    <option value="Nunta">Nunta</option>
                                    <option value="Cumătrie">Cumătrie</option>
                                    <option value="Altceva">Altceva</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Status</label>
                                <select name="status" value={formData.status} onChange={handleChange}
                                        className="w-full bg-slate-700 rounded-md p-2 mt-1">
                                    <option value="Semnat">Semnat</option>
                                    <option value="In Asteptare">In Asteptare</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Culoarea</label>
                                <input type="color" name="color" value={formData.color} onChange={handleChange}
                                       className="h-10 w-16 bg-transparent mt-2" />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Nr. perechi</label>
                                <select
                                    value={formData.nrPerechi}
                                    onChange={(e) => handleNrPerechiChange(Number(e.target.value))}
                                    className="w-full bg-slate-700 rounded-md p-2 mt-1"
                                >
                                    <option value={1}>1 pereche</option>
                                    <option value={2}>2 perechi</option>
                                    <option value={3}>3 perechi</option>
                                    <option value={4}>4 perechi</option>
                                </select>
                            </div>

                            {renderDancersSelects()}

                            <div>
                                <label className="text-slate-400 text-sm">Locația</label>
                                <input name="location" value={formData.location} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Restaurant/Sala</label>
                                <input name="street" value={formData.street} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Detalii</label>
                                <input name="details" value={formData.details} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Miri</label>
                                <input name="miri" value={formData.miri} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Contact</label>
                                <input name="contact" value={formData.contact} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Preț</label>
                                <input name="price" value={formData.price} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            <div>
                                <label className="text-slate-400 text-sm">Avans</label>
                                <input name="avans" value={formData.avans} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            <div className="md:col-span-2 xl:col-span-3">
                                <label className="text-slate-400 text-sm">Detalii despre eveniment</label>
                                <textarea name="detailsWedding" value={formData.detailsWedding} onChange={handleChange}
                                          className="w-full bg-transparent border-b border-slate-600 py-2 outline-none min-h-[90px]" />
                            </div>

                            {/* Moderator */}
                            <div>
                                <label className="text-slate-400 text-sm">Moderator</label>
                                <input name="moderator" value={formData.moderator} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Moderator Contact</label>
                                <input name="moderatorContact" value={formData.moderatorContact} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Moderator Detalii</label>
                                <input name="moderatorDetails" value={formData.moderatorDetails} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            {/* Foto/Video */}
                            <div>
                                <label className="text-slate-400 text-sm">Foto/Video</label>
                                <input name="fotoVideo" value={formData.fotoVideo} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Foto/Video Contact</label>
                                <input name="fotoVideoContact" value={formData.fotoVideoContact} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Foto/Video Detalii</label>
                                <input name="fotoVideoDetails" value={formData.fotoVideoDetails} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>

                            {/* Muzica */}
                            <div>
                                <label className="text-slate-400 text-sm">Muzică</label>
                                <input name="muzica" value={formData.muzica} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Muzică Contact</label>
                                <input name="muzicaContact" value={formData.muzicaContact} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Muzică Detalii</label>
                                <input name="muzicaDetails" value={formData.muzicaDetails} onChange={handleChange}
                                       className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between mt-10">
                            <button
                                onClick={() => setActiveView("calendar")}
                                className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg"
                            >
                                Înapoi la Calendar
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

                {/* EDIT MODAL (TOATE INPUTURILE) */}
                {isOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
                        <div className="bg-slate-800 w-full max-w-5xl rounded-xl p-5 md:p-8 border border-slate-700 relative max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl md:text-3xl font-semibold text-center mb-6">Modifică Eveniment</h2>

                            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                                ✕
                            </button>

                            {formError && (
                                <div className="mb-5 bg-red-500/20 text-red-300 p-3 rounded-lg border border-red-500/30">
                                    {formError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div>
                                    <label className="text-slate-400 text-sm">Data</label>
                                    <input type="date" name="date" value={formData.date} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Ora</label>
                                    <input type="time" name="time" value={formData.time} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Tip</label>
                                    <select name="type" value={formData.type} onChange={handleChange}
                                            className="w-full bg-slate-700 rounded-md p-2 mt-1">
                                        <option value="Nunta">Nunta</option>
                                        <option value="Cumătrie">Cumătrie</option>
                                        <option value="Altceva">Altceva</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Status</label>
                                    <select name="status" value={formData.status} onChange={handleChange}
                                            className="w-full bg-slate-700 rounded-md p-2 mt-1">
                                        <option value="Semnat">Semnat</option>
                                        <option value="In Asteptare">In Asteptare</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Culoarea</label>
                                    <input type="color" name="color" value={formData.color} onChange={handleChange}
                                           className="h-10 w-16 bg-transparent mt-2" />
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Nr. perechi</label>
                                    <select
                                        value={formData.nrPerechi}
                                        onChange={(e) => handleNrPerechiChange(Number(e.target.value))}
                                        className="w-full bg-slate-700 rounded-md p-2 mt-1"
                                    >
                                        <option value={1}>1 pereche</option>
                                        <option value={2}>2 perechi</option>
                                        <option value={3}>3 perechi</option>
                                        <option value={4}>4 perechi</option>
                                    </select>
                                </div>

                                {renderDancersSelects()}

                                <div className="md:col-span-2">
                                    <label className="text-slate-400 text-sm">Locația</label>
                                    <input name="location" value={formData.location} onChange={handleChange}
                                           className="w-full border border-pink-500 rounded-md p-2 bg-transparent outline-none" />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-slate-400 text-sm">Restaurant/Sala</label>
                                    <input name="street" value={formData.street} onChange={handleChange}
                                           className="w-full border border-pink-500 rounded-md p-2 bg-transparent outline-none" />
                                </div>

                                <div className="lg:col-span-4">
                                    <label className="text-slate-400 text-sm">Detalii</label>
                                    <input name="details" value={formData.details} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Miri</label>
                                    <input name="miri" value={formData.miri} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Contact</label>
                                    <input name="contact" value={formData.contact} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Preț</label>
                                    <input name="price" value={formData.price} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>

                                <div>
                                    <label className="text-slate-400 text-sm">Avans</label>
                                    <input name="avans" value={formData.avans} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>

                                <div className="lg:col-span-4">
                                    <label className="text-slate-400 text-sm">Detalii despre eveniment</label>
                                    <textarea name="detailsWedding" value={formData.detailsWedding} onChange={handleChange}
                                              className="w-full bg-transparent border-b border-slate-600 py-2 outline-none min-h-[90px]" />
                                </div>

                                {/* Moderator */}
                                <div>
                                    <label className="text-slate-400 text-sm">Moderator</label>
                                    <input name="moderator" value={formData.moderator} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-sm">Moderator Contact</label>
                                    <input name="moderatorContact" value={formData.moderatorContact} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-sm">Moderator Detalii</label>
                                    <input name="moderatorDetails" value={formData.moderatorDetails} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>

                                {/* Foto/Video */}
                                <div>
                                    <label className="text-slate-400 text-sm">Foto/Video</label>
                                    <input name="fotoVideo" value={formData.fotoVideo} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-sm">Foto/Video Contact</label>
                                    <input name="fotoVideoContact" value={formData.fotoVideoContact} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-sm">Foto/Video Detalii</label>
                                    <input name="fotoVideoDetails" value={formData.fotoVideoDetails} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>

                                {/* Muzica */}
                                <div>
                                    <label className="text-slate-400 text-sm">Muzică</label>
                                    <input name="muzica" value={formData.muzica} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-sm">Muzică Contact</label>
                                    <input name="muzicaContact" value={formData.muzicaContact} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>
                                <div>
                                    <label className="text-slate-400 text-sm">Muzică Detalii</label>
                                    <input name="muzicaDetails" value={formData.muzicaDetails} onChange={handleChange}
                                           className="w-full bg-transparent border-b border-slate-600 py-2 outline-none" />
                                </div>

                                {/* Buttons */}
                                <div className="lg:col-span-4 flex flex-col sm:flex-row justify-center items-center gap-4 mt-4">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="bg-blue-500 px-6 py-2 rounded-md w-full sm:w-auto disabled:opacity-50"
                                    >
                                        {loading ? "Salvez..." : "Salvează"}
                                    </button>

                                    <button
                                        onClick={closeModal}
                                        className="bg-slate-600 px-6 py-2 rounded-md w-full sm:w-auto"
                                    >
                                        Anulează
                                    </button>

                                    <button
                                        onClick={askDelete}
                                        disabled={loading}
                                        className="bg-red-600 px-6 py-2 rounded-md w-full sm:w-auto disabled:opacity-50"
                                    >
                                        Șterge
                                    </button>
                                </div>
                            </div>

                            {/* CONFIRM DELETE MODAL */}
                            {deleteConfirmOpen && (
                                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                                    <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6">
                                        <h3 className="text-lg font-semibold mb-3">Confirmare ștergere</h3>
                                        <p className="text-slate-300 mb-6">
                                            Sigur vrei să ștergi acest eveniment? Acțiunea nu poate fi anulată.
                                        </p>

                                        <div className="flex gap-3 justify-end">
                                            <button
                                                onClick={() => setDeleteConfirmOpen(false)}
                                                className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg"
                                            >
                                                Nu
                                            </button>
                                            <button
                                                onClick={handleDeleteConfirmed}
                                                disabled={loading}
                                                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg disabled:opacity-50"
                                            >
                                                {loading ? "Șterg..." : "Da, șterge"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}