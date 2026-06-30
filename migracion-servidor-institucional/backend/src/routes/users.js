import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/", requireAdmin, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `select id, nombre_completo, usuario, email, rol, estatus, ultimo_acceso, casos_asignados, debe_cambiar_password
       from ucaprec.usuarios
       order by nombre_completo`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    const { nombre_completo, usuario, email, rol, password } = req.body;
    if (!nombre_completo || !usuario || !email || !rol || !password) {
      return res.status(400).json({ error: "Faltan campos requeridos." });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    const { rows } = await query(
      `insert into ucaprec.usuarios (nombre_completo, usuario, email, rol, password_hash, estatus)
       values ($1, $2, lower($3), $4, $5, 'Activo')
       returning id, nombre_completo, usuario, email, rol, estatus`,
      [nombre_completo, usuario, email, rol, passwordHash]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { nombre_completo, email, rol, estatus } = req.body;
    const { rows } = await query(
      `update ucaprec.usuarios
       set nombre_completo = coalesce($1, nombre_completo),
           email = coalesce(lower($2), email),
           rol = coalesce($3, rol),
           estatus = coalesce($4, estatus)
       where id = $5
       returning id, nombre_completo, usuario, email, rol, estatus, ultimo_acceso, casos_asignados`,
      [nombre_completo, email, rol, estatus, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/:id/reset-password", requireAdmin, async (req, res, next) => {
  try {
    const password = String(req.body.password || "");
    if (password.length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener mínimo 8 caracteres." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `update ucaprec.usuarios
       set password_hash = $1, debe_cambiar_password = true
       where id = $2
       returning usuario, email`,
      [passwordHash, req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Usuario no encontrado." });

    await query(
      `insert into ucaprec.auditoria (usuario, accion, modulo, entidad, detalle, tipo, ip)
       values ($1, 'RESETEAR_CONTRASEÑA', 'Usuarios', $2, 'Contraseña restablecida por administrador', 'security', $3)`,
      [req.user.usuario, rows[0].usuario, req.ip]
    );

    res.json({ ok: true, message: "Contraseña restablecida exitosamente." });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await query(`delete from ucaprec.usuarios where id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Usuario no encontrado." });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:id/permissions", requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      `select p.id, p.modulo, p.accion, p.descripcion, up.permitido
       from ucaprec.permissions p
       left join ucaprec.user_permissions up
         on up.permission_id = p.id and up.usuario_id = $1
       order by p.modulo, p.accion`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

usersRouter.put("/:id/permissions/:permissionId", requireAdmin, async (req, res, next) => {
  try {
    const permitido = Boolean(req.body.permitido);
    await query(
      `insert into ucaprec.user_permissions (usuario_id, permission_id, permitido)
       values ($1, $2, $3)
       on conflict (usuario_id, permission_id)
       do update set permitido = excluded.permitido, updated_at = now()`,
      [req.params.id, req.params.permissionId, permitido]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
