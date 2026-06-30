import { Router } from "express";
import bcrypt from "bcryptjs";
import { runQuery } from "../db.js";
import { requireAuth, signToken } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!identifier || !password) {
      return res.status(400).json({ error: "Usuario/correo y contraseña son requeridos." });
    }

    const result = await runQuery(
      `select top 1 id, nombre_completo, usuario, email, password_hash, rol, estatus, debe_cambiar_password
       from ucaprec.usuarios
       where lower(usuario) = @identifier or lower(email) = @identifier`,
      { identifier }
    );

    const user = result.recordset[0];
    if (!user || user.estatus !== "Activo") {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    const ok = user.password_hash?.startsWith("$2")
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!ok) return res.status(401).json({ error: "Credenciales incorrectas." });

    await runQuery(`update ucaprec.usuarios set ultimo_acceso = sysutcdatetime() where id = @id`, { id: user.id });

    const token = signToken(user);
    delete user.password_hash;
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
