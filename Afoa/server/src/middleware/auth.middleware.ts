import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) return res.status(401).json({ message: "No token" });

    try {
        jwt.verify(token, process.env.JWT_SECRET as string);
        next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
}
