import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!identifier || !password) {
      return res.status(400).json({ error: "Usuario/correo y contraseña son requeridos." });
    }

    const { rows } = await query(
      `select id, nombre_completo, usuario, email, password_hash, rol, estatus, debe_cambiar_password
       from ucaprec.usuarios
       where lower(usuario) = $1 or lower(email) = $1
       limit 1`,
      [identifier]
    );

    const user = rows[0];
    if (!user || user.estatus !== "Activo") {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    const ok = user.password_hash.startsWith("$2")
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!ok) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    await query(
      `update ucaprec.usuarios set ultimo_acceso = now() where id = $1`,
      [user.id]
    );

    const token = signToken(user);
    delete user.password_hash;
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});
