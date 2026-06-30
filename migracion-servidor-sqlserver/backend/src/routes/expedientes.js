import { Router } from "express";
import { runQuery, txRequest, withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const expedientesRouter = Router();

expedientesRouter.use(requireAuth);

expedientesRouter.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 500), 5000);
    const result = await runQuery(
      `select top (@limit) * from ucaprec.expedientes order by created_at desc`,
      { limit }
    );
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

expedientesRouter.get("/:numero", async (req, res, next) => {
  try {
    const caseResult = await runQuery(`select * from ucaprec.expedientes where numero_expediente = @numero`, { numero: req.params.numero });
    const expediente = caseResult.recordset[0];
    if (!expediente) return res.status(404).json({ error: "Expediente no encontrado." });

    const [imputados, victimas, documentos] = await Promise.all([
      runQuery(`select * from ucaprec.imputados where numero_expediente = @numero order by created_at`, { numero: req.params.numero }),
      runQuery(`select * from ucaprec.victimas where numero_expediente = @numero order by created_at`, { numero: req.params.numero }),
      runQuery(`select * from ucaprec.documentos where numero_expediente = @numero order by fecha_subida desc`, { numero: req.params.numero }),
    ]);

    res.json({
      ...expediente,
      imputados: imputados.recordset,
      victimas: victimas.recordset,
      documentos: documentos.recordset,
    });
  } catch (error) {
    next(error);
  }
});

expedientesRouter.post("/", async (req, res, next) => {
  try {
    const expediente = req.body.expediente || req.body;
    const imputados = req.body.imputados || [];
    const victimas = req.body.victimas || [];

    const saved = await withTransaction(async (transaction) => {
      const request = txRequest(transaction, {
        numero_expediente: expediente.numero_expediente,
        numero_sentencia: expediente.numero_sentencia,
        tipo_expediente: expediente.tipo_expediente,
        jurisdiccion: expediente.jurisdiccion,
        fecha_recepcion: expediente.fecha_recepcion,
        estado_registro: expediente.estado_registro || "En Revisión",
        asignado_a: expediente.asignado_a,
        creado_por: req.user.usuario,
        delito_principal: expediente.delito_principal,
        observacion: expediente.observacion,
      });

      const result = await request.query(
        `insert into ucaprec.expedientes (
          numero_expediente, numero_sentencia, tipo_expediente, jurisdiccion, fecha_recepcion,
          estado_registro, asignado_a, creado_por, delito_principal, observacion
        )
        output inserted.*
        values (
          @numero_expediente, @numero_sentencia, @tipo_expediente, @jurisdiccion, @fecha_recepcion,
          @estado_registro, @asignado_a, @creado_por, @delito_principal, @observacion
        )`
      );

      const savedCase = result.recordset[0];

      for (const imputado of imputados) {
        await txRequest(transaction, {
          expediente_id: savedCase.id,
          numero_expediente: savedCase.numero_expediente,
          tipo_persona: imputado.tipo_persona,
          nombre_completo: imputado.nombre_completo,
          documento: imputado.documento,
          edad: imputado.edad,
          sexo: imputado.sexo,
          nacionalidad: imputado.nacionalidad,
          estado_imputado: imputado.estado_imputado,
          estado_judicial: imputado.estado_judicial,
          alerta_roja: Boolean(imputado.alerta_roja),
          alerta_migratoria: Boolean(imputado.alerta_migratoria),
          orden_arresto: Boolean(imputado.orden_arresto),
          subido_a_pn: Boolean(imputado.subido_a_pn),
        }).query(
          `insert into ucaprec.imputados (
            expediente_id, numero_expediente, tipo_persona, nombre_completo, documento, edad, sexo, nacionalidad,
            estado_imputado, estado_judicial, alerta_roja, alerta_migratoria, orden_arresto, subido_a_pn
          ) values (
            @expediente_id, @numero_expediente, @tipo_persona, @nombre_completo, @documento, @edad, @sexo, @nacionalidad,
            @estado_imputado, @estado_judicial, @alerta_roja, @alerta_migratoria, @orden_arresto, @subido_a_pn
          )`
        );
      }

      for (const victima of victimas) {
        await txRequest(transaction, {
          expediente_id: savedCase.id,
          numero_expediente: savedCase.numero_expediente,
          tipo_persona: victima.tipo_persona,
          nombre_completo: victima.nombre_completo,
          imputado_relacionado: victima.imputado_relacionado,
          delito: victima.delito,
        }).query(
          `insert into ucaprec.victimas (expediente_id, numero_expediente, tipo_persona, nombre_completo, imputado_relacionado, delito)
           values (@expediente_id, @numero_expediente, @tipo_persona, @nombre_completo, @imputado_relacionado, @delito)`
        );
      }

      await txRequest(transaction, { usuario: req.user.usuario, entidad: savedCase.numero_expediente, ip: req.ip }).query(
        `insert into ucaprec.auditoria (usuario, accion, modulo, entidad, detalle, tipo, ip)
         values (@usuario, 'CREAR_EXPEDIENTE', 'Expedientes', @entidad, 'Expediente creado', 'create', @ip)`
      );

      return savedCase;
    });

    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

expedientesRouter.delete("/:numero", async (req, res, next) => {
  try {
    const result = await runQuery(`delete from ucaprec.expedientes where numero_expediente = @numero`, { numero: req.params.numero });
    if (!result.rowsAffected[0]) return res.status(404).json({ error: "Expediente no encontrado." });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
