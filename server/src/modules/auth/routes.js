import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../../db.js";
import { z } from "zod";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(4),
    });
    const { email, password } = schema.parse(req.body);

    const userRes = await query(`
      SELECT u.id, u.email, u.password_hash, u.name, r.name as role
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.email=$1 AND u.is_active=true
      LIMIT 1
    `, [email]);

    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({ token, user: { id: user.id, role: user.role, name: user.name, email: user.email } });
  } catch (e) { next(e); }
});

export default router;
