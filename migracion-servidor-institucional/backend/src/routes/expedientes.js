import { Router } from "express";
import { query, withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const expedientesRouter = Router();

expedientesRouter.use(requireAuth);

expedientesRouter.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 500), 5000);
    const { rows } = await query(
      `select *
       from ucaprec.expedientes
       order by created_at desc
       limit $1`,
      [limit]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

expedientesRouter.get("/:numero", async (req, res, next) => {
  try {
    const { rows } = await query(
      `select e.*,
        coalesce(json_agg(distinct i.*) filter (where i.id is not null), '[]') as imputados,
        coalesce(json_agg(distinct v.*) filter (where v.id is not null), '[]') as victimas,
        coalesce(json_agg(distinct d.*) filter (where d.id is not null), '[]') as documentos
       from ucaprec.expedientes e
       left join ucaprec.imputados i on i.expediente_id = e.id
       left join ucaprec.victimas v on v.expediente_id = e.id
       left join ucaprec.documentos d on d.expediente_id = e.id
       where e.numero_expediente = $1
       group by e.id`,
      [req.params.numero]
    );
    if (!rows[0]) return res.status(404).json({ error: "Expediente no encontrado." });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

expedientesRouter.post("/", async (req, res, next) => {
  try {
    const expediente = req.body.expediente || req.body;
    const imputados = req.body.imputados || [];
    const victimas = req.body.victimas || [];

    const saved = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `insert into ucaprec.expedientes (
          numero_expediente, numero_sentencia, tipo_expediente, jurisdiccion, localidad_jurisdiccion,
          fecha_recepcion, fecha_decision, decision, quien_interpone, estado_registro, asignado_a,
          creado_por, provincia, municipio, sector, direccion, delito_principal, tipos_penales, observacion
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,coalesce($10,'En Revisión'),$11,$12,$13,$14,$15,$16,$17,$18,$19
        ) returning *`,
        [
          expediente.numero_expediente,
          expediente.numero_sentencia,
          expediente.tipo_expediente,
          expediente.jurisdiccion,
          expediente.localidad_jurisdiccion,
          expediente.fecha_recepcion,
          expediente.fecha_decision,
          expediente.decision,
          expediente.quien_interpone,
          expediente.estado_registro,
          expediente.asignado_a,
          req.user.usuario,
          expediente.provincia,
          expediente.municipio,
          expediente.sector,
          expediente.direccion,
          expediente.delito_principal,
          expediente.tipos_penales,
          expediente.observacion,
        ]
      );

      const savedCase = rows[0];

      for (const imputado of imputados) {
        await client.query(
          `insert into ucaprec.imputados (
            expediente_id, numero_expediente, tipo_persona, nombre_completo, documento, edad, sexo,
            nacionalidad, estado_imputado, estado_judicial, centro_penitenciario, pena, pena_impuesta,
            pena_privativa, pena_suspendida, indemnizacion, garantia, multa, decomiso,
            alerta_roja, alerta_migratoria, orden_arresto, subido_a_pn
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
          [
            savedCase.id,
            savedCase.numero_expediente,
            imputado.tipo_persona,
            imputado.nombre_completo,
            imputado.documento,
            imputado.edad,
            imputado.sexo,
            imputado.nacionalidad,
            imputado.estado_imputado,
            imputado.estado_judicial,
            imputado.centro_penitenciario,
            imputado.pena,
            imputado.pena_impuesta,
            imputado.pena_privativa,
            imputado.pena_suspendida,
            imputado.indemnizacion,
            imputado.garantia,
            imputado.multa,
            imputado.decomiso,
            Boolean(imputado.alerta_roja),
            Boolean(imputado.alerta_migratoria),
            Boolean(imputado.orden_arresto),
            Boolean(imputado.subido_a_pn),
          ]
        );
      }

      for (const victima of victimas) {
        await client.query(
          `insert into ucaprec.victimas (expediente_id, numero_expediente, tipo_persona, nombre_completo, imputado_relacionado, delito)
           values ($1,$2,$3,$4,$5,$6)`,
          [savedCase.id, savedCase.numero_expediente, victima.tipo_persona, victima.nombre_completo, victima.imputado_relacionado, victima.delito]
        );
      }

      await client.query(
        `insert into ucaprec.auditoria (usuario, accion, modulo, entidad, detalle, tipo, ip)
         values ($1, 'CREAR_EXPEDIENTE', 'Expedientes', $2, 'Expediente creado', 'create', $3)`,
        [req.user.usuario, savedCase.numero_expediente, req.ip]
      );

      return savedCase;
    });

    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

expedientesRouter.patch("/:numero", async (req, res, next) => {
  try {
    const fields = req.body;
    const { rows } = await query(
      `update ucaprec.expedientes
       set numero_sentencia = coalesce($1, numero_sentencia),
           tipo_expediente = coalesce($2, tipo_expediente),
           estado_registro = coalesce($3, estado_registro),
           asignado_a = coalesce($4, asignado_a),
           delito_principal = coalesce($5, delito_principal),
           observacion = coalesce($6, observacion)
       where numero_expediente = $7
       returning *`,
      [fields.numero_sentencia, fields.tipo_expediente, fields.estado_registro, fields.asignado_a, fields.delito_principal, fields.observacion, req.params.numero]
    );
    if (!rows[0]) return res.status(404).json({ error: "Expediente no encontrado." });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

expedientesRouter.delete("/:numero", async (req, res, next) => {
  try {
    const { rowCount } = await query(`delete from ucaprec.expedientes where numero_expediente = $1`, [req.params.numero]);
    if (!rowCount) return res.status(404).json({ error: "Expediente no encontrado." });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
