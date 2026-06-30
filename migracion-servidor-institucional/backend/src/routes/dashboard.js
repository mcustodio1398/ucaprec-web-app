import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/kpis", async (_req, res, next) => {
  try {
    const { rows } = await query(`select * from ucaprec.vw_dashboard_kpis`);
    res.json(rows[0] || {});
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/analytics", async (_req, res, next) => {
  try {
    const [casosMes, sexo, edad, delitos, jurisdicciones, alertas] = await Promise.all([
      query(`select to_char(date_trunc('month', coalesce(fecha_recepcion, created_at::date)), 'YYYY-MM') as mes, count(*)::int as casos from ucaprec.expedientes group by 1 order by 1`),
      query(`select coalesce(sexo, 'Sin dato') as name, count(*)::int as value from ucaprec.imputados group by 1 order by 2 desc`),
      query(`select case when edad is null or edad = 0 then 'Sin edad' when edad <= 25 then '18-25' when edad <= 35 then '26-35' when edad <= 45 then '36-45' when edad <= 60 then '46-60' else '60+' end as name, count(*)::int as casos from ucaprec.imputados group by 1 order by 1`),
      query(`select coalesce(delito_principal, 'Sin delito') as name, count(*)::int as casos from ucaprec.expedientes group by 1 order by 2 desc limit 8`),
      query(`select coalesce(jurisdiccion, provincia, 'Sin jurisdicción') as name, count(*)::int as casos from ucaprec.expedientes group by 1 order by 2 desc limit 8`),
      query(`select to_char(date_trunc('month', e.created_at), 'YYYY-MM') as mes, count(i.id) filter (where i.alerta_roja)::int as roja, count(i.id) filter (where i.alerta_migratoria)::int as migratoria, count(i.id) filter (where i.orden_arresto)::int as arresto from ucaprec.expedientes e left join ucaprec.imputados i on i.expediente_id = e.id group by 1 order by 1 desc limit 3`),
    ]);

    res.json({
      casosPorMes: casosMes.rows,
      perfilImputados: sexo.rows,
      rangosEdad: edad.rows,
      delitosPrincipales: delitos.rows,
      jurisdicciones: jurisdicciones.rows,
      alertasUltimosMeses: alertas.rows.reverse(),
    });
  } catch (error) {
    next(error);
  }
});
