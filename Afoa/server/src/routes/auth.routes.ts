import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/login", (req, res) => {
    const password = String(req.body?.password ?? "").trim();
    const base = String(process.env.BASE_PASSWORD ?? "").trim();

    console.log("LOGIN TRY:", JSON.stringify(password));
    console.log("BASE_PASSWORD:", JSON.stringify(base));

    if (password !== base) {
        return res.status(401).json({ message: "Parola greșită" });
    }

    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET as string, {
        expiresIn: "7d",
    });

    return res.json({ token });
});

export default router;
