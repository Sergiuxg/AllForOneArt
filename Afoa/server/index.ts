import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import db from "./src/db/db";
import { authMiddleware } from "./src/middleware/auth.middleware";

const app = express();
app.use(express.json());

// ✅ CORS (acceptă localhost + orice *.vercel.app)
app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true); // Postman/server
            const ok =
                origin === "http://localhost:5173" ||
                origin.endsWith(".vercel.app");
            if (ok) return cb(null, true);
            return cb(new Error("CORS blocked: " + origin));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// ---- LOGIN: parola + nume -> token
app.post("/login", (req, res) => {
    const password = String(req.body?.password ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    const base = String(process.env.BASE_PASSWORD ?? "").trim();

    if (!name) return res.status(400).json({ message: "Introduceți numele și prenumele" });

    if (password !== base) {
        return res.status(401).json({ message: "Parola greșită" });
    }

    const token = jwt.sign({ role: "admin", name }, process.env.JWT_SECRET as string, {
        expiresIn: "7d",
    });

    return res.json({ token, name });
});

// helper: citim dancers din row
function getDancersFromRow(row: any): string[] {
    try {
        const parsed = row.data ? JSON.parse(row.data) : {};
        const dancers = Array.isArray(parsed?.dancers) ? parsed.dancers : [];
        return dancers.map(String);
    } catch {
        return [];
    }
}

// ✅ Conflict check: același dansator în aceeași zi
function hasDayConflict(date: string, dancers: string[], excludeEventId?: string) {
    if (!date || dancers.length === 0) return null;

    const rows = db.prepare("SELECT id, data FROM events WHERE start = ?").all(date);

    for (const r of rows) {
        if (excludeEventId && r.id === excludeEventId) continue;

        const existingDancers = getDancersFromRow(r);
        for (const d of dancers) {
            if (existingDancers.includes(d)) {
                return d; // dansator în conflict
            }
        }
    }
    return null;
}

// ---- GET EVENTS
app.get("/events", authMiddleware, (req, res) => {
    const rows = db.prepare("SELECT * FROM events ORDER BY start ASC").all();

    const result = rows.map((r: any) => ({
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

// ---- CREATE EVENT
app.post("/events", authMiddleware, (req, res) => {
    const e = req.body ?? {};
    const now = new Date().toISOString();

    const safeId = String(e.id || Date.now());
    const safeStart = String(e.start || new Date().toISOString().slice(0, 10));
    const safeTitle = String(e.title || "Eveniment");
    const safeAllDay = e.allDay ? 1 : 0;
    const safeColor = String(e.backgroundColor || "black");
    const safeDataObj = e.extendedProps || {};
    const safeData = JSON.stringify(safeDataObj);

    const dancers: string[] = Array.isArray(safeDataObj?.dancers) ? safeDataObj.dancers.map(String) : [];
    const conflictDancer = hasDayConflict(safeStart, dancers);
    if (conflictDancer) {
        return res.status(400).json({
            message: `Eroare: Dansatorul "${conflictDancer}" este deja selectat la alt eveniment în această zi (${safeStart}).`,
        });
    }

    db.prepare(`
    INSERT INTO events (id, title, start, allDay, color, data, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(safeId, safeTitle, safeStart, safeAllDay, safeColor, safeData, now, now);

    res.status(201).json({ ok: true });
});

// ---- UPDATE EVENT
app.put("/events/:id", authMiddleware, (req, res) => {
    const id = String(req.params.id);
    const e = req.body ?? {};
    const now = new Date().toISOString();

    const safeStart = String(e.start || new Date().toISOString().slice(0, 10));
    const safeTitle = String(e.title || "Eveniment");
    const safeAllDay = e.allDay ? 1 : 0;
    const safeColor = String(e.backgroundColor || "black");
    const safeDataObj = e.extendedProps || {};
    const safeData = JSON.stringify(safeDataObj);

    const dancers: string[] = Array.isArray(safeDataObj?.dancers) ? safeDataObj.dancers.map(String) : [];
    const conflictDancer = hasDayConflict(safeStart, dancers, id);
    if (conflictDancer) {
        return res.status(400).json({
            message: `Eroare: Dansatorul "${conflictDancer}" este deja selectat la alt eveniment în această zi (${safeStart}).`,
        });
    }

    const result = db.prepare(`
    UPDATE events
    SET title=?, start=?, allDay=?, color=?, data=?, updatedAt=?
    WHERE id=?
  `).run(safeTitle, safeStart, safeAllDay, safeColor, safeData, now, id);

    if (result.changes === 0) return res.status(404).json({ message: "Nu există" });
    res.json({ ok: true });
});

// ---- DELETE EVENT
app.delete("/events/:id", authMiddleware, (req, res) => {
    const id = String(req.params.id);
    const result = db.prepare("DELETE FROM events WHERE id=?").run(id);

    if (result.changes === 0) return res.status(404).json({ message: "Nu există" });
    res.json({ ok: true });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, "0.0.0.0", () => console.log("API running on", PORT));