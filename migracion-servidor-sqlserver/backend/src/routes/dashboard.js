import { Router } from "express";
import { runQuery } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/kpis", async (_req, res, next) => {
  try {
    const result = await runQuery(`select * from ucaprec.vw_dashboard_kpis`);
    res.json(result.recordset[0] || {});
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/analytics", async (_req, res, next) => {
  try {
    const [casosMes, sexo, edad, delitos, jurisdicciones, alertas] = await Promise.all([
      runQuery(`select format(datefromparts(year(coalesce(fecha_recepcion, cast(created_at as date))), month(coalesce(fecha_recepcion, cast(created_at as date))), 1), 'yyyy-MM') as mes, count(*) as casos from ucaprec.expedientes group by year(coalesce(fecha_recepcion, cast(created_at as date))), month(coalesce(fecha_recepcion, cast(created_at as date))) order by mes`),
      runQuery(`select coalesce(sexo, 'Sin dato') as name, count(*) as value from ucaprec.imputados group by coalesce(sexo, 'Sin dato') order by value desc`),
      runQuery(`select case when edad is null or edad = 0 then 'Sin edad' when edad <= 25 then '18-25' when edad <= 35 then '26-35' when edad <= 45 then '36-45' when edad <= 60 then '46-60' else '60+' end as name, count(*) as casos from ucaprec.imputados group by case when edad is null or edad = 0 then 'Sin edad' when edad <= 25 then '18-25' when edad <= 35 then '26-35' when edad <= 45 then '36-45' when edad <= 60 then '46-60' else '60+' end`),
      runQuery(`select top 8 coalesce(delito_principal, 'Sin delito') as name, count(*) as casos from ucaprec.expedientes group by coalesce(delito_principal, 'Sin delito') order by casos desc`),
      runQuery(`select top 8 coalesce(jurisdiccion, provincia, 'Sin jurisdicción') as name, count(*) as casos from ucaprec.expedientes group by coalesce(jurisdiccion, provincia, 'Sin jurisdicción') order by casos desc`),
      runQuery(`select top 3 format(datefromparts(year(e.created_at), month(e.created_at), 1), 'yyyy-MM') as mes, sum(case when i.alerta_roja = 1 then 1 else 0 end) as roja, sum(case when i.alerta_migratoria = 1 then 1 else 0 end) as migratoria, sum(case when i.orden_arresto = 1 then 1 else 0 end) as arresto from ucaprec.expedientes e left join ucaprec.imputados i on i.expediente_id = e.id group by year(e.created_at), month(e.created_at) order by mes desc`),
    ]);

    res.json({
      casosPorMes: casosMes.recordset,
      perfilImputados: sexo.recordset,
      rangosEdad: edad.recordset,
      delitosPrincipales: delitos.recordset,
      jurisdicciones: jurisdicciones.recordset,
      alertasUltimosMeses: alertas.recordset.reverse(),
    });
  } catch (error) {
    next(error);
  }
});
