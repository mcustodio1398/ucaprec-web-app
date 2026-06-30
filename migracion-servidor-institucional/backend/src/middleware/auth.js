import jwt from "jsonwebtoken";
import { query } from "../db.js";

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      usuario: user.usuario,
      email: user.email,
      rol: user.rol,
      nombre: user.nombre_completo,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Sesión requerida." });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      `select id, nombre_completo, usuario, email, rol, estatus
       from ucaprec.usuarios
       where id = $1`,
      [payload.sub]
    );

    const user = rows[0];
    if (!user || user.estatus !== "Activo") {
      return res.status(401).json({ error: "Usuario inactivo o no encontrado." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Sesión inválida o expirada." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.rol !== "Administrador") {
    return res.status(403).json({ error: "Acceso reservado para administradores." });
  }
  next();
}
