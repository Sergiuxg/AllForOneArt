import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import db from "./src/db/db";
import { authMiddleware } from "./src/middleware/auth.middleware";

const app = express();
app.use(express.json());

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (origin.endsWith(".vercel.app") || origin === "http://localhost:5173")
                return cb(null, true);
            return cb(new Error("CORS blocked: " + origin));
        },
    })
);

/* =======================
   TYPES
======================= */

type EventRow = {
    id: string;
    title: string;
    start: string;
    allDay: number;
    color: string | null;
    data: string | null;
    createdAt: string;
    updatedAt: string;
};

type EventData = {
    dancers?: string[];
};

/* =======================
   LOGIN
======================= */

app.post("/login", (req, res) => {
    const password = String(req.body?.password ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    const base = String(process.env.BASE_PASSWORD ?? "").trim();

    if (!name)
        return res.status(400).json({ message: "Introduceți numele și prenumele" });

    if (password !== base)
        return res.status(401).json({ message: "Parola greșită" });

    const token = jwt.sign(
        { role: "admin", name },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
    );

    res.json({ token, name });
});

/* =======================
   HELPER: Conflict Check
======================= */

function getDancersFromRow(row: EventRow): string[] {
    try {
        const parsed: EventData = row.data ? JSON.parse(row.data) : {};
        return Array.isArray(parsed.dancers)
            ? parsed.dancers.map(String)
            : [];
    } catch {
        return [];
    }
}

function hasDayConflict(
    date: string,
    dancers: string[],
    excludeId?: string
): string | null {
    if (!date || dancers.length === 0) return null;

    const rows = db
        .prepare("SELECT id, data FROM events WHERE start = ?")
        .all(date) as EventRow[];

    for (const r of rows) {
        if (excludeId && r.id === excludeId) continue;

        const existing = getDancersFromRow(r);

        for (const dancer of dancers) {
            if (existing.includes(dancer)) return dancer;
        }
    }

    return null;
}

/* =======================
   GET EVENTS
======================= */

app.get("/events", authMiddleware, (req, res) => {
    const rows = db
        .prepare("SELECT * FROM events ORDER BY start ASC")
        .all() as EventRow[];

    const result = rows.map((r) => ({
        id: r.id,
        title: r.title,
        start: r.start,
        allDay: Boolean(r.allDay),
        backgroundColor: r.color || "black",
        borderColor: r.color || "black",
        extendedProps: r.data ? JSON.parse(r.data) : {},
    }));

    res.json(result);
});

/* =======================
   CREATE EVENT
======================= */

app.post("/events", authMiddleware, (req, res) => {
    const e = req.body ?? {};
    const now = new Date().toISOString();

    const safeId = String(e.id || Date.now());
    const safeTitle = String(e.title || "Eveniment");
    const safeStart = String(e.start);
    const safeAllDay = e.allDay ? 1 : 0;
    const safeColor = String(e.backgroundColor || "black");
    const safeData = JSON.stringify(e.extendedProps || {});

    const dancers: string[] =
        Array.isArray(e.extendedProps?.dancers)
            ? e.extendedProps.dancers.map(String)
            : [];

    const conflict = hasDayConflict(safeStart, dancers);

    if (conflict) {
        return res.status(400).json({
            message: `Eroare: Dansatorul "${conflict}" este deja programat în această zi.`,
        });
    }

    db.prepare(`
    INSERT INTO events (id, title, start, allDay, color, data, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(safeId, safeTitle, safeStart, safeAllDay, safeColor, safeData, now, now);

    res.status(201).json({ ok: true });
});

/* =======================
   UPDATE EVENT
======================= */

app.put("/events/:id", authMiddleware, (req, res) => {
    const id = String(req.params.id);
    const e = req.body ?? {};
    const now = new Date().toISOString();

    const safeStart = String(e.start);
    const safeTitle = String(e.title || "Eveniment");
    const safeAllDay = e.allDay ? 1 : 0;
    const safeColor = String(e.backgroundColor || "black");
    const safeData = JSON.stringify(e.extendedProps || {});

    const dancers: string[] =
        Array.isArray(e.extendedProps?.dancers)
            ? e.extendedProps.dancers.map(String)
            : [];

    const conflict = hasDayConflict(safeStart, dancers, id);

    if (conflict) {
        return res.status(400).json({
            message: `Eroare: Dansatorul "${conflict}" este deja programat în această zi.`,
        });
    }

    db.prepare(`
    UPDATE events
    SET title=?, start=?, allDay=?, color=?, data=?, updatedAt=?
    WHERE id=?
  `).run(safeTitle, safeStart, safeAllDay, safeColor, safeData, now, id);

    res.json({ ok: true });
});

/* =======================
   DELETE EVENT
======================= */

app.delete("/events/:id", authMiddleware, (req, res) => {
    const id = String(req.params.id);

    db.prepare("DELETE FROM events WHERE id=?").run(id);

    res.json({ ok: true });
});

/* =======================
   START SERVER
======================= */

const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, "0.0.0.0", () => {
    console.log("API running on", PORT);
});