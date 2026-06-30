import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { expedientesRouter } from "./routes/expedientes.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { documentsRouter } from "./routes/documents.js";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",").map(item => item.trim()) || "*",
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ucaprec-backend", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/expedientes", expedientesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/documentos", documentsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.code === "23505" ? 409 : 500;
  res.status(status).json({
    error: status === 409 ? "Registro duplicado." : "Error interno del servidor.",
    detail: process.env.NODE_ENV === "production" ? undefined : error.message,
  });
});

app.listen(port, () => {
  console.log(`UCAPREC backend escuchando en puerto ${port}`);
});
