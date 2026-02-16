import "dotenv/config";
import express = require("express");
import cors = require("cors");
import jwt = require("jsonwebtoken");

import db from "./src/db/db";
import { authMiddleware } from "./src/middleware/auth.middleware";

const app = express();
import cors from "cors";

const allowedOrigins = [
    "http://localhost:5173",
    "https://allforone-theta.vercel.app",
];

const allowedVercelRegex = /^https:\/\/allforone(-[a-z0-9-]+)?\.vercel\.app$/i;
// acceptă: allforone-theta.vercel.app + preview links gen allforone-git-main-...vercel.app

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true); // Postman / server-to-server
            if (allowedOrigins.includes(origin)) return cb(null, true);
            if (allowedVercelRegex.test(origin)) return cb(null, true);
            return cb(new Error("CORS blocked: " + origin));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

app.use(express.json());

const allowed = [
    "http://localhost:5173",
    "https://all-for-one-art.vercel.app/",
];

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);
            if (allowed.includes(origin)) return cb(null, true);
            return cb(new Error("CORS blocked: " + origin));
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

// preflight doar pe rute concrete (fără wildcard)
app.options("/login", cors());
app.options("/events", cors());
app.options("/events/:id", cors());



// ---- LOGIN: doar parola -> token
app.post("/login", (req, res) => {
    const password = String(req.body?.password ?? "").trim();
    const base = String(process.env.BASE_PASSWORD ?? "").trim();

    console.log("LOGIN TRY:", JSON.stringify(password), "BASE:", JSON.stringify(base));

    if (password !== base) {
        return res.status(401).json({ message: "Parola greșită" });
    }

    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET as string, {
        expiresIn: "7d",
    });

    return res.json({ token });
});

// ---- EVENTS
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

app.post("/events", authMiddleware, (req, res) => {
    const e = req.body ?? {};
    const now = new Date().toISOString();

    const safeId = String(e.id || Date.now());
    const safeTitle = String(e.title || "Eveniment");
    const safeStart = String(e.start || new Date().toISOString().slice(0, 10));
    const safeAllDay = e.allDay ? 1 : 0;
    const safeColor = String(e.backgroundColor || "black");
    const safeData = JSON.stringify(e.extendedProps || {});

    db.prepare(`
    INSERT INTO events (id, title, start, allDay, color, data, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(safeId, safeTitle, safeStart, safeAllDay, safeColor, safeData, now, now);

    res.status(201).json({ ok: true });
});

app.delete("/events/:id", authMiddleware, (req, res) => {
    const id = req.params.id;
    const result = db.prepare("DELETE FROM events WHERE id=?").run(id);

    if (result.changes === 0) return res.status(404).json({ message: "Nu există" });
    res.json({ ok: true });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, "0.0.0.0", () => {
    console.log("API running on", PORT);
});


