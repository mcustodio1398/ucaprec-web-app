import { Router } from "express";
import bcrypt from "bcryptjs";
import { runQuery } from "../db.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/", requireAdmin, async (_req, res, next) => {
  try {
    const result = await runQuery(
      `select id, nombre_completo, usuario, email, rol, estatus, ultimo_acceso, casos_asignados, debe_cambiar_password
       from ucaprec.usuarios
       order by nombre_completo`
    );
    res.json(result.recordset);
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
    const result = await runQuery(
      `insert into ucaprec.usuarios (nombre_completo, usuario, email, rol, password_hash, estatus)
       output inserted.id, inserted.nombre_completo, inserted.usuario, inserted.email, inserted.rol, inserted.estatus
       values (@nombre_completo, @usuario, lower(@email), @rol, @passwordHash, 'Activo')`,
      { nombre_completo, usuario, email, rol, passwordHash }
    );

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const result = await runQuery(
      `update ucaprec.usuarios
       set nombre_completo = coalesce(@nombre_completo, nombre_completo),
           email = coalesce(lower(@email), email),
           rol = coalesce(@rol, rol),
           estatus = coalesce(@estatus, estatus)
       output inserted.id, inserted.nombre_completo, inserted.usuario, inserted.email, inserted.rol, inserted.estatus, inserted.ultimo_acceso, inserted.casos_asignados
       where id = @id`,
      { ...req.body, id: req.params.id }
    );
    if (!result.recordset[0]) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json(result.recordset[0]);
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
    const result = await runQuery(
      `update ucaprec.usuarios
       set password_hash = @passwordHash, debe_cambiar_password = 1
       output inserted.usuario, inserted.email
       where id = @id`,
      { passwordHash, id: req.params.id }
    );

    const target = result.recordset[0];
    if (!target) return res.status(404).json({ error: "Usuario no encontrado." });

    await runQuery(
      `insert into ucaprec.auditoria (usuario, accion, modulo, entidad, detalle, tipo, ip)
       values (@usuario, 'RESETEAR_CONTRASEÑA', 'Usuarios', @entidad, 'Contraseña restablecida por administrador', 'security', @ip)`,
      { usuario: req.user.usuario, entidad: target.usuario, ip: req.ip }
    );

    res.json({ ok: true, message: "Contraseña restablecida exitosamente." });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const result = await runQuery(`delete from ucaprec.usuarios where id = @id`, { id: req.params.id });
    if (!result.rowsAffected[0]) return res.status(404).json({ error: "Usuario no encontrado." });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:id/permissions", requireAdmin, async (req, res, next) => {
  try {
    const result = await runQuery(
      `select p.id, p.modulo, p.accion, p.descripcion, up.permitido
       from ucaprec.permissions p
       left join ucaprec.user_permissions up
         on up.permission_id = p.id and up.usuario_id = @id
       order by p.modulo, p.accion`,
      { id: req.params.id }
    );
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

usersRouter.put("/:id/permissions/:permissionId", requireAdmin, async (req, res, next) => {
  try {
    await runQuery(
      `merge ucaprec.user_permissions as target
       using (select cast(@usuario_id as uniqueidentifier) as usuario_id, @permission_id as permission_id) as source
       on target.usuario_id = source.usuario_id and target.permission_id = source.permission_id
       when matched then update set permitido = @permitido, updated_at = sysutcdatetime()
       when not matched then insert (usuario_id, permission_id, permitido) values (@usuario_id, @permission_id, @permitido);`,
      { usuario_id: req.params.id, permission_id: req.params.permissionId, permitido: Boolean(req.body.permitido) }
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
