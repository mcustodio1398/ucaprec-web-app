import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const documentsRouter = Router();

documentsRouter.use(requireAuth);

const uploadDir = process.env.UPLOAD_DIR || "./storage/documentos";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}-${crypto.randomUUID()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_MB || 25) * 1024 * 1024 },
});

documentsRouter.get("/", async (_req, res, next) => {
  try {
    const { rows } = await query(`select * from ucaprec.documentos order by fecha_subida desc limit 1000`);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Debe adjuntar un archivo." });

    const numeroExpediente = req.body.numero_expediente;
    const { rows: caseRows } = await query(
      `select id, delito_principal from ucaprec.expedientes where numero_expediente = $1`,
      [numeroExpediente]
    );
    const expediente = caseRows[0];
    if (!expediente) return res.status(404).json({ error: "Expediente no encontrado." });

    const fileBuffer = fs.readFileSync(req.file.path);
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const { rows } = await query(
      `insert into ucaprec.documentos (
        expediente_id, numero_expediente, nombre_archivo, tipo_archivo, peso,
        imputado, descripcion, subido_por, ruta_storage, checksum_sha256
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      returning *`,
      [
        expediente.id,
        numeroExpediente,
        req.file.originalname,
        req.file.mimetype,
        `${Math.round(req.file.size / 1024)} KB`,
        req.body.imputado || null,
        req.body.descripcion || null,
        req.user.usuario,
        req.file.filename,
        checksum,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (req.file?.path) fs.rmSync(req.file.path, { force: true });
    next(error);
  }
});

documentsRouter.get("/:id/download", async (req, res, next) => {
  try {
    const { rows } = await query(`select * from ucaprec.documentos where id = $1`, [req.params.id]);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: "Documento no encontrado." });

    const filePath = path.resolve(uploadDir, doc.ruta_storage);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Archivo físico no encontrado." });

    res.download(filePath, doc.nombre_archivo);
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/:id/preview", async (req, res, next) => {
  try {
    const { rows } = await query(`select * from ucaprec.documentos where id = $1`, [req.params.id]);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: "Documento no encontrado." });

    const filePath = path.resolve(uploadDir, doc.ruta_storage);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Archivo físico no encontrado." });

    res.setHeader("Content-Type", doc.tipo_archivo || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.nombre_archivo)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

documentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { rows } = await query(`delete from ucaprec.documentos where id = $1 returning ruta_storage`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Documento no encontrado." });

    fs.rmSync(path.resolve(uploadDir, rows[0].ruta_storage), { force: true });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
