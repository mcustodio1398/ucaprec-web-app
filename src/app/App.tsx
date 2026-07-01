import { useState, useEffect, useMemo, useCallback, useRef, type FormEvent, type ReactNode } from "react";
import {
  PROVINCIAS, getMunicipios, getSectores,
  INFRACCIONES, CENTROS_PENITENCIARIOS, JURISDICCIONES, NACIONALIDADES,
  TIPOS_EXPEDIENTE, DECISIONES, QUIEN_INTERPONE, ESTADOS_REGISTRO,
  ESTADOS_IMPUTADO, ESTADOS_JUDICIALES, SEXOS, CATALOG_META,
} from "../data/catalogs";
import {
  LayoutDashboard, FolderOpen, Users, UserX, Shield, FileText,
  User,
  BarChart2, Settings, LogOut, Bell, Search, Moon, Sun,
  AlertTriangle, CheckCircle, Clock, Eye, Edit2, Trash2, Plus,
  Download, Filter, ChevronRight, ChevronLeft, X, MapPin, AlertOctagon,
  BookOpen, Activity, Database, TrendingUp, ArrowUpRight,
  ArrowDownRight, Scale, Gavel, Building2, Globe, ChevronDown,
  Upload, Lock, RefreshCw, Menu, UserCheck, FileSearch, Layers, EyeOff,
  CheckSquare, AlertCircle, Info, Printer, FileSpreadsheet, ArrowLeft
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, LabelList
} from "recharts";
import mpLogo from "../imports/Logo_-_Ministerio_Publico_-_Horizontal.png";
import mpWhiteLogo from "../imports/Logo_Ministerio_Publico_Blanco.png";
import { supabase } from '../lib/supabase'
// ─── Types ─────────────────────────────────────────────────────────────────

type View =
  | "dashboard" | "cases" | "case-detail" | "case-form" | "case-new"
  | "defendants" | "victims" | "measures" | "documents"
  | "reports" | "analytics" | "notifications" | "users" | "audit" | "catalogs" | "settings" | "profile";

interface NavItem { id: View; label: string; icon: any; badge?: number }
interface NavGroup { label: string; items: NavItem[] }
interface SessionUser { id: string; name: string; username: string; email: string; role: string; initials: string }

// ─── Temporary access user ───────────────────────────────────────────────────

const ADMIN_USER: SessionUser = {
  id: "temp-admin",
  name: "Michael Custodio",
  username: "michael.custodio",
  email: "michael.custodio@pgr.gob.do",
  role: "Administrador",
  initials: "MC",
};

const toInstitutionalEmail = (identifier: string) => {
  const value = identifier.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@pgr.gob.do`;
};

const initialsFromName = (name: string, email: string) => {
  const source = name.trim() || email.split("@")[0].replace(/[._-]+/g, " ");
  return source
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "UC";
};

const sessionUserFromAuthUser = (authUser: any): SessionUser => {
  const appMeta = authUser?.app_metadata ?? {};
  const userMeta = authUser?.user_metadata ?? {};
  const email = firstText(authUser?.email);
  const username = firstText(appMeta.username, userMeta.username, email.split("@")[0]);
  const name = firstText(appMeta.name, userMeta.name, userMeta.full_name, username);
  const role = email.toLowerCase() === ADMIN_USER.email.toLowerCase()
    ? "Administrador"
    : firstText(appMeta.role, userMeta.role, "Analista");

  return {
    id: firstText(authUser?.id),
    name,
    username,
    email,
    role,
    initials: firstText(appMeta.initials, userMeta.initials, initialsFromName(name, email)),
  };
};

// ─── Mock Data ──────────────────────────────────────────────────────────────

const KPI = {
  total: 1847, profugos: 342, rebeldes: 218,
  alertaRoja: 156, alertaMig: 289, ordenArresto: 412,
  thisMonth: 47, pendReview: 93
};

const statusColors: Record<string, string> = {
  "Prófugo": "bg-red-100 text-red-800 dark:bg-red-900/25 dark:text-red-400",
  "Rebeldía": "bg-amber-100 text-amber-800 dark:bg-amber-900/25 dark:text-amber-400",
  "Recluido": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-400",
  "Libertad": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "Absuelto": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "Verificado": "bg-blue-100 text-blue-800 dark:bg-blue-900/25 dark:text-blue-400",
  "En Revisión": "bg-orange-100 text-orange-800 dark:bg-orange-900/25 dark:text-orange-400",
  "Activo": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-400",
  "Inactivo": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  "Condenado": "bg-red-100 text-red-800 dark:bg-red-900/25 dark:text-red-400",
};

const alertColors: Record<string, string> = {
  "Roja": "bg-red-600 text-white",
  "Migratoria": "bg-indigo-600 text-white",
  "Arresto": "bg-amber-600 text-white",
};

const evolutionData: Array<{ mes: string; casos: number }> = [];

const statusPieData: Array<{ name: string; value: number; color: string }> = [];

const districtData: Array<{ name: string; casos: number }> = [];

const byTypeData: Array<{ name: string; value: number; fill: string }> = [];

const alertsByMonthData: Array<{ mes: string; roja: number; migratoria: number; arresto: number }> = [];

const recentCases = [
  { id: "EXP-2024-1847", sentencia: "SCJ-PEN-2024-0892", imputado: "Carlos A. Méndez Ríos", delito: "Lavado de Activos", tipo: "Sentencia", estatus: "Prófugo", alerta: "Roja", estReg: "Verificado", fecha: "28/11/2024", asignado: "A. Rodríguez" },
  { id: "EXP-2024-1846", sentencia: "TC-PEN-2024-0441", imputado: "INVERSALUD S.A.", delito: "Fraude Fiscal", tipo: "Recurso de Casación", estatus: "Rebeldía", alerta: "Migratoria", estReg: "En Revisión", fecha: "27/11/2024", asignado: "L. Peña" },
  { id: "EXP-2024-1845", sentencia: "1JPEN-2024-0211", imputado: "Rafael J. Guerrero Díaz", delito: "Homicidio", tipo: "Sentencia", estatus: "Recluido", alerta: "—", estReg: "Verificado", fecha: "26/11/2024", asignado: "M. Santos" },
  { id: "EXP-2024-1844", sentencia: "SCJ-PEN-2024-0881", imputado: "José M. Paulino Marte", delito: "Tráfico de Drogas", tipo: "Sentencia", estatus: "Prófugo", alerta: "Roja", estReg: "Verificado", fecha: "25/11/2024", asignado: "A. Rodríguez" },
  { id: "EXP-2024-1843", sentencia: "TC-PEN-2024-0438", imputado: "Wilkins B. Castillo Luna", delito: "Estafa", tipo: "Resolución", estatus: "Rebeldía", alerta: "Arresto", estReg: "En Revisión", fecha: "24/11/2024", asignado: "P. Álvarez" },
  { id: "EXP-2024-1842", sentencia: "2JPEN-2024-0187", imputado: "Danilo F. Rosario Ureña", delito: "Robo Agravado", tipo: "Sentencia", estatus: "Recluido", alerta: "—", estReg: "Verificado", fecha: "23/11/2024", asignado: "L. Peña" },
  { id: "EXP-2024-1841", sentencia: "SCJ-PEN-2024-0877", imputado: "Constructora REYMA S.R.L.", delito: "Malversación", tipo: "Recurso de Casación", estatus: "Rebeldía", alerta: "Migratoria", estReg: "En Revisión", fecha: "22/11/2024", asignado: "M. Santos" },
];

const defendants = [
  { id: 1, nombre: "Carlos A. Méndez Ríos", doc: "001-1182044-3", edad: 47, sexo: "Hombre", estatus: "Prófugo", estJud: "Condenado", pena: "15 años", alertaRoja: true, alertaMig: true, ordenArresto: true, policia: true, exp: "EXP-2024-1847" },
  { id: 2, nombre: "INVERSALUD S.A.", doc: "RNC-101-83449-1", edad: 0, sexo: "Persona Jurídica", estatus: "Rebeldía", estJud: "Condenado", pena: "N/A", alertaRoja: false, alertaMig: true, ordenArresto: true, policia: true, exp: "EXP-2024-1846" },
  { id: 3, nombre: "Rafael J. Guerrero Díaz", doc: "402-3301872-4", edad: 34, sexo: "Hombre", estatus: "Recluido", estJud: "Condenado", pena: "30 años", alertaRoja: false, alertaMig: false, ordenArresto: false, policia: false, exp: "EXP-2024-1845" },
  { id: 4, nombre: "José M. Paulino Marte", doc: "001-0892341-7", edad: 52, sexo: "Hombre", estatus: "Prófugo", estJud: "Condenado", pena: "20 años", alertaRoja: true, alertaMig: true, ordenArresto: true, policia: true, exp: "EXP-2024-1844" },
  { id: 5, nombre: "Wilkins B. Castillo Luna", doc: "001-1234567-8", edad: 39, sexo: "Hombre", estatus: "Rebeldía", estJud: "Condenado", pena: "8 años", alertaRoja: false, alertaMig: false, ordenArresto: true, policia: true, exp: "EXP-2024-1843" },
];

const usersData = [
  { id: 1, nombre: "Roberto Herrera Matos", usuario: "rherrera", rol: "Administrador", estatus: "Activo", acceso: "28/11/2024 07:50", casos: 0, email: "rherrera@mp.gob.do" },
  { id: 2, nombre: "María Santos Jiménez", usuario: "msantos", rol: "Supervisor", estatus: "Activo", acceso: "28/11/2024 10:02", casos: 0, email: "msantos@mp.gob.do" },
  { id: 3, nombre: "Ana Rodríguez Féliz", usuario: "arodriguez", rol: "Analista", estatus: "Activo", acceso: "28/11/2024 09:42", casos: 47, email: "arodriguez@mp.gob.do" },
  { id: 4, nombre: "Luis Peña Marte", usuario: "lpena", rol: "Analista", estatus: "Activo", acceso: "28/11/2024 08:15", casos: 31, email: "lpena@mp.gob.do" },
  { id: 5, nombre: "Pedro Álvarez Gómez", usuario: "palvarez", rol: "Analista", estatus: "Activo", acceso: "27/11/2024 16:33", casos: 28, email: "palvarez@mp.gob.do" },
  { id: 6, nombre: "Carmen Díaz Peralta", usuario: "cdiaz", rol: "Consultor", estatus: "Activo", acceso: "26/11/2024 14:11", casos: 0, email: "cdiaz@mp.gob.do" },
  { id: 7, nombre: "Juana Belén Torres", usuario: "jtorres", rol: "Analista", estatus: "Inactivo", acceso: "15/10/2024 11:22", casos: 19, email: "jtorres@mp.gob.do" },
];

const auditData = [
  { id: 1, usuario: "arodriguez", accion: "CREAR_CASO", modulo: "Expedientes", entidad: "EXP-2024-1847", detalle: "Nuevo expediente registrado con 1 imputado", ip: "192.168.1.45", fecha: "28/11/2024 09:42:11", tipo: "create" },
  { id: 2, usuario: "arodriguez", accion: "SUBIR_DOCUMENTO", modulo: "Documentos", entidad: "EXP-2024-1847", detalle: "Sentencia_SCJ_0892.pdf (2.4MB) adjuntado", ip: "192.168.1.45", fecha: "28/11/2024 09:44:33", tipo: "create" },
  { id: 3, usuario: "msantos", accion: "VERIFICAR_CASO", modulo: "Expedientes", entidad: "EXP-2024-1847", detalle: "Estado cambiado: En Revisión → Verificado", ip: "192.168.1.12", fecha: "28/11/2024 10:05:17", tipo: "update" },
  { id: 4, usuario: "lpena", accion: "CREAR_CASO", modulo: "Expedientes", entidad: "EXP-2024-1846", detalle: "Nuevo expediente registrado con 1 imputado (Persona Jurídica)", ip: "192.168.1.78", fecha: "27/11/2024 14:22:08", tipo: "create" },
  { id: 5, usuario: "rherrera", accion: "CREAR_USUARIO", modulo: "Usuarios", entidad: "cdiaz", detalle: "Usuario Carmen Díaz creado con rol Consultor", ip: "192.168.1.1", fecha: "26/11/2024 11:15:44", tipo: "create" },
  { id: 6, usuario: "palvarez", accion: "EDITAR_IMPUTADO", modulo: "Imputados", entidad: "EXP-2024-1843", detalle: "Alerta roja: No → Sí para Wilkins Castillo", ip: "192.168.1.92", fecha: "24/11/2024 16:38:21", tipo: "update" },
  { id: 7, usuario: "msantos", accion: "EXPORTAR_REPORTE", modulo: "Reportes", entidad: "RPT-2024-0489", detalle: "Reporte PDF exportado: Casos por Jurisdicción Nov 2024", ip: "192.168.1.12", fecha: "23/11/2024 08:55:03", tipo: "export" },
  { id: 8, usuario: "rherrera", accion: "RESETEAR_CONTRASEÑA", modulo: "Usuarios", entidad: "jtorres", detalle: "Contraseña restablecida por administrador", ip: "192.168.1.1", fecha: "22/11/2024 14:02:55", tipo: "security" },
];

const systemAlerts: Array<{
  id: number;
  type: "danger" | "warning" | "info" | "success";
  msg: string;
  time: string;
  exp?: string;
  action?: string;
}> = [];

// ─── Supabase row adapters ───────────────────────────────────────────────────

type DbRow = Record<string, any>;

const firstText = (...values: any[]) => {
  const value = values.find(v => v !== null && v !== undefined && String(v).trim() !== "");
  return value === undefined ? "" : String(value);
};

const firstBool = (...values: any[]) => values.some(v => v === true || v === 1 || v === "true" || v === "Sí" || v === "si");

const firstId = (fallback: number, ...values: any[]) => {
  const raw = values.find(v => v !== null && v !== undefined && String(v).trim() !== "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (...values: any[]) => {
  const raw = firstText(...values);
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString("es-DO");
};

const formatDateTime = (...values: any[]) => {
  const raw = firstText(...values);
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString("es-DO");
};

const toDateInputValue = (...values: any[]) => {
  const raw = firstText(...values);
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const normalizeStructuredSegment = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

const buildStructuredCaseId = (sentenceOrResolution: string, dateValue = new Date(), sequence?: string | number) => {
  const date = dateValue instanceof Date && !Number.isNaN(dateValue.getTime()) ? dateValue : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const seq = String(sequence ?? "000000").padStart(6, "0");
  const reference = normalizeStructuredSegment(sentenceOrResolution || "SIN-RESOLUCION");
  return `UC-EXP-${y}${m}${d}-${seq}-${reference}`;
};

const dateFromDisplayValue = (value: string) => {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return new Date();
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const structuredIdForCase = (expediente: { codigo?: string; sentencia?: string; id?: string; fecha?: string }) =>
  expediente.codigo || buildStructuredCaseId(expediente.sentencia || expediente.id || "SIN-RESOLUCION", dateFromDisplayValue(expediente.fecha || ""));

const describeFieldChanges = (changes: Array<{ campo: string; antes?: string | number | boolean | null; despues?: string | number | boolean | null }>) => {
  const clean = changes.filter(change => String(change.antes ?? "") !== String(change.despues ?? ""));
  if (clean.length === 0) return "No se detectaron cambios de campos.";
  return clean.map(change => `${change.campo}: "${change.antes ?? "N/D"}" → "${change.despues ?? "N/D"}"`).join("; ");
};

const todayLong = () => new Date().toLocaleDateString("es-DO", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const monthLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-DO", { month: "short" }).replace(".", "");
};

const mapExpedienteRow = (row: DbRow, idx: number): typeof recentCases[number] & { codigo?: string } => ({
  id: firstText(row.numero_expediente, row.no_expediente, row.codigo, row.expediente, row.id, `EXP-${idx + 1}`),
  codigo: firstText(row.codigo_estructurado),
  sentencia: firstText(row.numero_sentencia, row.no_sentencia, row.sentencia, row.referencia_sentencia),
  imputado: firstText(row.imputado_principal, row.imputado, row.nombre_imputado),
  delito: firstText(row.delito_principal, row.delito, row.infraccion),
  tipo: firstText(row.tipo_expediente, row.tipo, row.tipo_documento),
  estatus: firstText(row.estado_imputado, row.estatus_imputado, row.estatus, row.estado),
  alerta: firstText(row.alerta, row.tipo_alerta, firstBool(row.alerta_roja) ? "Roja" : firstBool(row.alerta_migratoria) ? "Migratoria" : "—"),
  estReg: firstText(row.estado_registro, row.estatus_registro, row.estado_revision),
  fecha: formatDate(row.fecha_registro, row.created_at, row.fecha),
  asignado: firstText(row.asignado_a, row.analista, row.usuario_asignado),
});

const mapImputadoRow = (row: DbRow, idx: number): DefEntry => ({
  id: firstId(idx + 1, row.id, row.imputado_id),
  dbId: firstText(row.id, row.imputado_id),
  tipo: firstText(row.tipo_persona, row.tipo, firstBool(row.rnc, row.razon_social) ? "Persona Jurídica" : "Persona Física"),
  nombre: firstText(row.nombre_completo, row.nombre, row.razon_social),
  doc: firstText(row.documento, row.cedula, row.rnc, row.identificacion),
  edad: firstText(row.edad, row.age, ""),
  sexo: firstText(row.sexo, row.genero, row.sexo_registrado, row.sexo_persona, "Sin dato"),
  nac: firstText(row.nacionalidad, row.nac, row.pais, "N/A"),
  estadoImp: firstText(row.estado_imputado, row.estatus, row.estado),
  estadoJud: firstText(row.estado_judicial, row.estatus_judicial),
  centro: firstText(row.centro_penitenciario, row.centro, row.penal),
  penaImp: firstText(row.pena, row.pena_impuesta),
  penaPriv: firstText(row.pena_privativa, row.pena_privativa_anos),
  penaSusp: firstText(row.pena_suspendida, row.pena_suspendida_anos),
  indemnizacion: firstText(row.indemnizacion, row.indemnizacion_rd),
  garantia: firstText(row.garantia_economica, row.garantia_rd),
  multa: firstText(row.multa, row.multa_rd),
  decomiso: firstText(row.decomiso),
  alertaRoja: firstBool(row.alerta_roja, row.alerta_interpol),
  alertaMig: firstBool(row.alerta_migratoria),
  ordenArresto: firstBool(row.orden_arresto),
  subidoPN: firstBool(row.subido_pn, row.subido_a_pn, row.policia),
  policia: firstBool(row.subido_pn, row.subido_a_pn, row.policia),
  exp: firstText(row.numero_expediente, row.expediente, row.expediente_id),
  estatus: firstText(row.estado_imputado, row.estatus, row.estado),
  estJud: firstText(row.estado_judicial, row.estatus_judicial),
  pena: firstText(row.pena, row.pena_impuesta),
});

const mapUsuarioRow = (row: DbRow, idx: number): typeof usersData[number] => ({
  id: firstId(idx + 1, row.id, row.usuario_id),
  nombre: firstText(row.nombre_completo, row.nombre),
  usuario: firstText(row.usuario, row.username, row.email),
  rol: firstText(row.rol, row.nombre_rol, row.role),
  estatus: firstText(row.estatus, row.estado, row.activo === false ? "Inactivo" : "Activo"),
  acceso: formatDateTime(row.ultimo_acceso, row.last_sign_in_at, row.updated_at),
  casos: firstId(0, row.casos, row.casos_asignados),
  email: firstText(row.email, row.correo),
});

const mapAuditRow = (row: DbRow, idx: number): typeof auditData[number] => ({
  id: firstId(idx + 1, row.id),
  usuario: firstText(row.usuario, row.user_name, row.user_email),
  accion: firstText(row.accion, row.action),
  modulo: firstText(row.modulo, row.module),
  entidad: firstText(row.entidad, row.entity, row.registro_id),
  detalle: firstText(row.detalle, row.descripcion, row.description),
  ip: firstText(row.ip, row.ip_address),
  fecha: formatDateTime(row.fecha, row.created_at),
  tipo: firstText(row.tipo, row.type, "info"),
});

// ─── Export / Print utilities ────────────────────────────────────────────────

function downloadCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const escape = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadExcel(headers: string[], rows: (string | number | boolean | null | undefined)[][], filename: string) {
  const escapeXml = (value: string | number | boolean | null | undefined) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const worksheetName = filename.replace(/\.(xlsx?|csv)$/i, "").slice(0, 31) || "Reporte";
  const colName = (index: number) => {
    let name = "";
    let current = index + 1;
    while (current > 0) {
      const mod = (current - 1) % 26;
      name = String.fromCharCode(65 + mod) + name;
      current = Math.floor((current - mod) / 26);
    }
    return name;
  };
  const sheetRows = [headers, ...rows].map((row, rowIndex) =>
    `<row r="${rowIndex + 1}">${headers.map((_, colIndex) => {
      const value = row[colIndex] ?? "";
      return `<c r="${colName(colIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    }).join("")}</row>`
  ).join("");
  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(worksheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
  };
  const encoder = new TextEncoder();
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (data: Uint8Array) => {
    let crc = 0 ^ -1;
    for (let i = 0; i < data.length; i += 1) crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
    return (crc ^ -1) >>> 0;
  };
  const bytes: number[] = [];
  const central: number[] = [];
  const push16 = (target: number[], value: number) => { target.push(value & 0xff, (value >>> 8) & 0xff); };
  const push32 = (target: number[], value: number) => { target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff); };
  Object.entries(files).forEach(([path, content]) => {
    const name = encoder.encode(path);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const offset = bytes.length;
    push32(bytes, 0x04034b50); push16(bytes, 20); push16(bytes, 0); push16(bytes, 0); push16(bytes, 0); push16(bytes, 0);
    push32(bytes, crc); push32(bytes, data.length); push32(bytes, data.length); push16(bytes, name.length); push16(bytes, 0);
    bytes.push(...name, ...data);
    push32(central, 0x02014b50); push16(central, 20); push16(central, 20); push16(central, 0); push16(central, 0); push16(central, 0); push16(central, 0);
    push32(central, crc); push32(central, data.length); push32(central, data.length); push16(central, name.length); push16(central, 0); push16(central, 0); push16(central, 0); push16(central, 0); push32(central, 0); push32(central, offset);
    central.push(...name);
  });
  const centralOffset = bytes.length;
  bytes.push(...central);
  push32(bytes, 0x06054b50); push16(bytes, 0); push16(bytes, 0); push16(bytes, Object.keys(files).length); push16(bytes, Object.keys(files).length); push32(bytes, central.length); push32(bytes, centralOffset); push16(bytes, 0);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename.replace(/\.(xlsx?|csv)$/i, "") + ".xlsx" });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerPrint() { window.print(); }

let cachedClientIp = "";

async function getClientIp() {
  if (cachedClientIp) return cachedClientIp;
  try {
    const response = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
    const data = await response.json();
    cachedClientIp = firstText(data?.ip, "No disponible");
  } catch {
    cachedClientIp = "No disponible";
  }
  return cachedClientIp;
}

async function logAuditEvent(event: {
  usuario: string;
  accion: string;
  modulo: string;
  entidad?: string;
  detalle?: string;
  tipo?: "create" | "update" | "export" | "security" | "info";
  ip?: string;
}) {
  const { error } = await supabase.from("auditoria").insert({
    usuario: event.usuario,
    accion: event.accion,
    modulo: event.modulo,
    entidad: event.entidad ?? "",
    detalle: event.detalle ?? "",
    tipo: event.tipo ?? "info",
    ip: event.ip ?? await getClientIp(),
  });
  if (error) console.error("Error registrando auditoría:", error);
}

function hasUnsavedDefData(def: Omit<DefEntry, "id">) {
  return Object.entries(def).some(([key, value]) => {
    if (["subidoPN", "arresto", "alertaRoja", "alertaMig"].includes(key)) return Boolean(value);
    return String(value ?? "").trim() !== "";
  });
}

// ─── Shared defendant / victim types ─────────────────────────────────────────

interface DefEntry {
  id: number; dbId?: string; tipo: string; nombre: string; doc: string; edad: string;
  sexo: string; nac: string; estadoImp: string; estadoJud: string; centro: string;
  penaImp: string; penaPriv: string; penaSusp: string;
  indemnizacion: string; garantia: string; multa: string; decomiso: string;
  subidoPN: boolean; arresto: boolean; alertaRoja: boolean; alertaMig: boolean;
  exp?: string; estatus?: string; estJud?: string; pena?: string; policia?: boolean; ordenArresto?: boolean;
}

interface VicEntry { id: number; dbId?: string; tipo: string; nombre: string; }

const EMPTY_DEF: Omit<DefEntry, "id"> = {
  tipo: "", nombre: "", doc: "", edad: "", sexo: "",
  nac: "", estadoImp: "", estadoJud: "",
  centro: "", penaImp: "", penaPriv: "", penaSusp: "",
  indemnizacion: "", garantia: "", multa: "", decomiso: "",
  subidoPN: false, arresto: false, alertaRoja: false, alertaMig: false,
};

// ─── Navigation ─────────────────────────────────────────────────────────────

const NAV: NavGroup[] = [
  {
    label: "Principal",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }]
  },
  {
    label: "Gestión",
    items: [
      { id: "cases", label: "Expedientes", icon: FolderOpen },
      { id: "defendants", label: "Imputados", icon: UserX },
      { id: "victims", label: "Víctimas", icon: Users },
      { id: "measures", label: "Medidas y Alertas", icon: AlertOctagon },
      { id: "documents", label: "Documentos", icon: FileText },
    ]
  },
  {
    label: "Análisis",
    items: [
      { id: "reports", label: "Reportes", icon: BarChart2 },
      { id: "analytics", label: "Analítica", icon: Activity },
    ]
  }
];

const ADMIN_MENU: { id: View; label: string; icon: any }[] = [
  { id: "users", label: "Usuarios y Roles", icon: Shield },
  { id: "audit", label: "Auditoría", icon: Database },
  { id: "catalogs", label: "Catálogos", icon: BookOpen },
  { id: "settings", label: "Configuración", icon: Settings },
];

const PROFILE_MENU_ITEM = { id: "profile" as View, label: "Perfil", icon: User };

const ADMIN_LOGOUT_ITEM = { label: "Cerrar Sesión", icon: LogOut };

const ADMIN_ONLY_VIEWS: View[] = ["users", "audit", "catalogs", "settings", "analytics"];
const isAdminRole = (role: string) => role.toLowerCase() === "administrador";

// ─── Reusable UI ─────────────────────────────────────────────────────────────

function Badge({ label, colorClass }: { label: string; colorClass?: string }) {
  const cls = colorClass ?? statusColors[label] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono leading-none ${cls}`}>
      {label}
    </span>
  );
}

function AlertBadge({ type }: { type: string }) {
  if (type === "—") return <span className="text-xs text-muted-foreground font-mono">—</span>;
  const cls = alertColors[type] ?? "bg-slate-600 text-white";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium leading-none ${cls}`}>
      <AlertOctagon size={9} />
      {type}
    </span>
  );
}

function KPICard({ label, value, delta, icon: Icon, bg, fg, sub }: {
  label: string; value: string | number; delta?: string; icon: any;
  bg: string; fg: string; sub?: string;
}) {
  const up = delta?.startsWith("+");
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow text-center items-center justify-center min-h-[145px]">
      <div className="flex items-center justify-center">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} ${fg}`}>
          <Icon size={17} />
        </div>
        {delta && (
          <span className={`text-xs font-mono flex items-center gap-0.5 ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {delta}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center">
        <div className="text-[26px] font-bold font-mono text-foreground leading-none">{value.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground mt-1.5">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono">{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex-1 min-w-0 pr-4">
        {/* Module title badge — blue diffused container */}
        <div
          className="inline-flex items-center px-4 py-2 rounded-lg mb-1"
          style={{
            background: "linear-gradient(135deg, rgba(29,78,216,0.10) 0%, rgba(59,130,246,0.07) 100%)",
            border: "1px solid rgba(29,78,216,0.18)",
            boxShadow: "0 1px 8px 0 rgba(29,78,216,0.07)",
          }}
        >
          <h1
            className="text-xl font-bold leading-tight"
            style={{ fontFamily: "'Crimson Pro', serif", color: "var(--color-foreground)" }}
          >
            {title}
          </h1>
        </div>
        {sub && <p className="text-sm text-muted-foreground mt-1 pl-1">{sub}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

function Btn({ children, variant = "primary", size = "md", onClick, icon: Icon }: {
  children?: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md"; onClick?: () => void; icon?: any;
}) {
  const base = "inline-flex items-center gap-2 font-medium rounded-md transition-colors cursor-pointer select-none";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-muted",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function ActionDialog({
  open,
  title,
  message,
  variant = "info",
  confirmLabel = "Aceptar",
  cancelLabel,
  onConfirm,
  onCancel,
  icon: Icon,
}: {
  open: boolean;
  title: string;
  message: string;
  variant?: "info" | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  icon?: any;
}) {
  if (!open) return null;

  const iconCls = variant === "danger"
    ? "bg-red-100 dark:bg-red-900/30 text-red-600"
    : "bg-amber-100 dark:bg-amber-900/30 text-amber-600";
  const ActionIcon = Icon ?? (variant === "danger" ? AlertTriangle : Info);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconCls}`}>
            <ActionIcon size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-lg leading-tight">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          {cancelLabel && onCancel && (
            <Btn variant="secondary" onClick={onCancel}>{cancelLabel}</Btn>
          )}
          <Btn variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

function SearchBar({ placeholder }: { placeholder?: string }) {
  return (
    <div className="relative flex-1 max-w-xs">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/60 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring focus:border-ring/30 text-foreground placeholder:text-muted-foreground/60"
        placeholder={placeholder ?? "Buscar..."}
      />
    </div>
  );
}

function Table({
  headers,
  rows,
  columnClasses = [],
}: {
  headers: string[];
  rows: ReactNode[][];
  columnClasses?: string[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h, idx) => (
              <th
                key={h}
                className={`text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap ${columnClasses[idx] ?? ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className={`py-3 px-3 text-foreground ${columnClasses[j] ?? ""}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ total, pageSize = 7, currentPage = 1 }: { total: number; pageSize?: number; currentPage?: number }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <span className="text-xs text-muted-foreground font-mono">Mostrando {start}-{end} de {total} registros</span>
      <div className="flex items-center gap-1">
        {["«", "‹", ...pages.map(String), ...(pageCount > 5 ? ["...", String(pageCount)] : []), "›", "»"].map((p, i) => (
          <button key={i} className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${p === String(safePage) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipFilter({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
      {label}
    </button>
  );
}

function LoginPage({ onLogin }: { onLogin: (user: SessionUser, remember: boolean) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const email = toInstitutionalEmail(identifier);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginError || !data.user) {
      setError("Usuario, correo institucional o contraseña incorrectos.");
      return;
    }

    onLogin(sessionUserFromAuthUser(data.user), remember);
  };

  const sendPasswordReset = async () => {
    const email = toInstitutionalEmail(resetIdentifier || identifier);
    if (!email.trim()) {
      setResetMessage("Digite su correo institucional o usuario para continuar.");
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    setResetMessage(resetError
      ? "No se pudo enviar la recuperación. Verifique el correo o la configuración de Supabase Auth."
      : "Solicitud enviada. Revise el correo institucional para restablecer la contraseña."
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden">
        <div className="bg-[#0b1730] text-white p-8 lg:p-10 flex flex-col items-center justify-center text-center min-h-[560px]">
          <img src={mpWhiteLogo} alt="Ministerio Público" className="h-40 w-auto object-contain" />
          <div className="mt-10">
            <h1 className="text-3xl font-semibold leading-tight" style={{ fontFamily: "'Crimson Pro', serif" }}>UCAPREC</h1>
            <p className="mt-4 text-sm leading-6 text-blue-100 max-w-md">
              Unidad de Captura de Prófugos, Rebeldes y Condenados.
            </p>
          </div>
        </div>

        <div className="p-8 lg:p-10 flex flex-col justify-center">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-slate-950">Iniciar sesión</h2>
            <p className="text-sm text-slate-500 mt-2">Ingrese con su correo institucional o usuario asignado.</p>
          </div>

          <form onSubmit={submitLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Correo institucional o usuario</label>
              <div className="relative">
                <UserCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={identifier}
                  onChange={event => setIdentifier(event.target.value)}
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  placeholder="Inserte su correo o usuario"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 text-sm border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  placeholder="Ingrese su contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Recordar sesión
              </label>
              <button type="button" onClick={() => { setResetOpen(true); setResetIdentifier(identifier); setResetMessage(""); }} className="text-sm text-blue-700 hover:underline">Recuperar acceso</button>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1a3a6e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12315f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              <Lock size={15} />
              {loading ? "Validando acceso..." : "Entrar al sistema"}
            </button>
          </form>

        </div>
      </div>
      {resetOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-950">Recuperar acceso</h3>
              <button onClick={() => setResetOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Digite su correo institucional o usuario. El sistema registrará la solicitud para restablecer la contraseña.</p>
            <input value={resetIdentifier} onChange={event => setResetIdentifier(event.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" placeholder="correo@pgr.gob.do o usuario" />
            {resetMessage && <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{resetMessage}</div>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setResetOpen(false)} className="px-3 py-2 rounded-md border border-slate-300 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={sendPasswordReset} className="px-3 py-2 rounded-md bg-[#1a3a6e] text-sm font-semibold text-white hover:bg-[#12315f]">Enviar solicitud</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ view, setView, navigateModule, collapsed, setCollapsed, currentUser, onLogout, canAccessAdmin, reviewCount }: {
  view: View; setView: (v: View) => void; navigateModule: (v: View) => void;
  collapsed: boolean; setCollapsed: (b: boolean) => void; currentUser: SessionUser; onLogout: () => void; canAccessAdmin: boolean; reviewCount: number;
}) {
  const visibleNav = useMemo(() => NAV.map(group => ({
    ...group,
    items: group.items
      .filter(item => canAccessAdmin || !ADMIN_ONLY_VIEWS.includes(item.id))
      .map(item => item.id === "cases" && reviewCount > 0 ? { ...item, badge: reviewCount } : item),
  })).filter(group => group.items.length > 0), [canAccessAdmin, reviewCount]);

  return (
    <aside className={`flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 ${collapsed ? "w-[60px]" : "w-[220px]"} flex-shrink-0 overflow-hidden`}>
      {/* Logo */}
      <div className={`flex items-center border-b border-sidebar-border ${collapsed ? "justify-center px-2 py-2" : "px-2 py-1.5"}`}>
        {collapsed ? (
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
            <Scale size={15} className="text-white" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5 min-w-0 w-full">
            <img src={mpLogo} alt="Ministerio Público" className="h-25 w-auto object-contain -mb-1 mx-auto" />
            <div className="text-[11px] text-blue-300/60 tracking-[0.16em] uppercase font-semibold -mt-1 text-center w-full">UCAPREC</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-hidden py-1.5 px-2 space-y-2">
        {visibleNav.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/40 px-2 mb-0.5">{group.label}</div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateModule(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors relative group
                      ${active ? "bg-white/10 text-white" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"}
                      ${collapsed ? "justify-center" : ""}`}
                  >
                    <item.icon size={15} className="flex-shrink-0" />
                    {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="text-[10px] font-mono bg-red-600 text-white rounded px-1.5 py-0.5 leading-none">{item.badge}</span>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User & toggle */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-sidebar-foreground/50 hover:text-white hover:bg-sidebar-accent transition-colors text-[11px]"
        >
          <Menu size={13} />
          {!collapsed && <span>Colapsar menú</span>}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">{currentUser.initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-white truncate">{currentUser.name}</div>
              <div className="text-[9px] text-sidebar-foreground/50">{currentUser.role}</div>
            </div>
            <button onClick={onLogout} title="Cerrar sesión" className="text-sidebar-foreground/40 hover:text-white flex-shrink-0">
              <LogOut size={12} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({
  title,
  dark,
  setDark,
  setView,
  navigateModule,
  goBack,
  canGoBack,
  breadcrumb,
  openCaseFromNotification,
  openNotificationsCenter,
  canAccessAdmin,
  onLogout,
}: {
  title: string; dark: boolean; setDark: (b: boolean) => void; setView: (v: View) => void;
  navigateModule: (v: View) => void; goBack: () => void; canGoBack: boolean; breadcrumb: View[];
  openCaseFromNotification: (caseId: string) => void; openNotificationsCenter: () => void; canAccessAdmin: boolean; onLogout: () => void;
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (notifMenuRef.current && notifMenuRef.current.contains(target)) return;
      if (adminMenuRef.current && adminMenuRef.current.contains(target)) return;
      setNotifOpen(false);
      setAdminMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-blue-900/30 bg-[#1a3a6e] sticky top-0 z-10 shadow-md">
      {/* Left: back button + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {canGoBack && (
          <button
            onClick={goBack}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
            title="Volver"
          >
            <ArrowLeft size={15} />
          </button>
        )}
        <div className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
          {breadcrumb.map((v, i) => (
            <span key={`${v}-${i}`} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight size={12} className="text-blue-300/50 flex-shrink-0" />}
              {i < breadcrumb.length - 1 ? (
                <button
                  onClick={() => setView(v)}
                  className="text-blue-200/70 hover:text-white transition-colors truncate text-xs"
                >
                  {VIEW_TITLES[v]}
                </button>
              ) : (
                <span className="font-semibold text-white truncate">{VIEW_TITLES[v]}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Right: search, notifications, dark mode, admin menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notifications */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              if (adminMenuOpen) setAdminMenuOpen(false);
            }}
            className="relative w-8 h-8 flex items-center justify-center rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Bell size={16} />
            {systemAlerts.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">Notificaciones</span>
                <button onClick={() => setNotifOpen(false)}><X size={14} className="text-muted-foreground" /></button>
              </div>
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {systemAlerts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No hay notificaciones pendientes.
                  </div>
                ) : systemAlerts.map((a) => {
                  const colors = { danger: "text-red-600", warning: "text-amber-600", info: "text-blue-600", success: "text-emerald-600" };
                  const icons = { danger: AlertOctagon, warning: AlertTriangle, info: Info, success: CheckCircle };
                  const Icon = icons[a.type as keyof typeof icons];
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setNotifOpen(false);
                        if (a.exp) {
                          openCaseFromNotification(a.exp);
                          return;
                        }
                        openNotificationsCenter();
                      }}
                      className="w-full flex gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                    >
                      <Icon size={14} className={`mt-0.5 flex-shrink-0 ${colors[a.type as keyof typeof colors]}`} />
                      <div>
                        <p className="text-xs text-foreground leading-snug">{a.msg}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">{a.time}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="px-4 py-2 border-t border-border">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    openNotificationsCenter();
                  }}
                  className="text-xs text-primary hover:underline w-full text-center"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dark mode - middle */}
        <button
          onClick={() => setDark(!dark)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          title={dark ? "Modo claro" : "Modo oscuro"}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Admin menu - right */}
        <div className="relative" ref={adminMenuRef}>
          <button
            onClick={() => {
              setAdminMenuOpen(!adminMenuOpen);
              if (notifOpen) setNotifOpen(false);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
            title={canAccessAdmin ? "Menú de administración" : "Menú de usuario"}
          >
            <Menu size={16} />
          </button>
          {adminMenuOpen && (
            <div className="absolute right-0 top-11 w-60 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{canAccessAdmin ? "Administración" : "Menú de usuario"}</span>
              </div>
              <div className="py-1.5">
                <button
                  onClick={() => {
                    setAdminMenuOpen(false);
                    navigateModule(PROFILE_MENU_ITEM.id);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${breadcrumb[breadcrumb.length - 1] === PROFILE_MENU_ITEM.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-foreground hover:bg-muted/60"}`}
                >
                  <PROFILE_MENU_ITEM.icon size={15} className="flex-shrink-0" />
                  <span className="truncate">{PROFILE_MENU_ITEM.label}</span>
                </button>
                {canAccessAdmin && <div className="my-1 border-t border-border" />}
                {canAccessAdmin && ADMIN_MENU.map(item => {
                  const active = breadcrumb[breadcrumb.length - 1] === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setAdminMenuOpen(false);
                        navigateModule(item.id);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-foreground hover:bg-muted/60"}`}
                    >
                      <item.icon size={15} className="flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                      </button>
                  );
                })}
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => {
                    setAdminMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <ADMIN_LOGOUT_ITEM.icon size={15} className="flex-shrink-0" />
                  <span className="truncate">{ADMIN_LOGOUT_ITEM.label}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Notifications View ──────────────────────────────────────────────────────
function NotificationsView({ openCaseFromNotification }: { openCaseFromNotification: (caseId: string) => void }) {
  const [filterType, setFilterType] = useState("Todas");

  const filtered = systemAlerts.filter(a => filterType === "Todas" || a.type === filterType);

  const colors = {
    danger: "text-red-600",
    warning: "text-amber-600",
    info: "text-blue-600",
    success: "text-emerald-600",
  };
  const badges = {
    danger: "bg-red-100 text-red-800 dark:bg-red-900/25 dark:text-red-400",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/25 dark:text-amber-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/25 dark:text-blue-400",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-400",
  };
  const icons = {
    danger: AlertOctagon,
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle,
  };
  const labels = {
    danger: "Crítica",
    warning: "Atención",
    info: "Informativa",
    success: "Completada",
  };

  return (
    <div className="p-6">
      <SectionHeader
        title="Centro de Notificaciones"
        sub="Historial de alertas operativas y acceso rápido para editar expedientes relacionados"
      />

      <div className="bg-card border border-border rounded-lg p-4 mb-4 flex flex-wrap gap-2 items-center">
        {[
          ["Todas", "Todas"],
          ["danger", "Críticas"],
          ["warning", "Atención"],
          ["info", "Informativas"],
          ["success", "Completadas"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilterType(value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterType === value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground font-mono">{filtered.length} notificación(es)</span>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Bell size={30} className="opacity-30" />
            <p className="text-sm">No hay notificaciones para el filtro seleccionado.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(alert => {
              const Icon = icons[alert.type as keyof typeof icons];
              return (
                <button
                  key={alert.id}
                  onClick={() => alert.exp && openCaseFromNotification(alert.exp)}
                  className="w-full flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                >
                  <Icon size={18} className={`mt-0.5 flex-shrink-0 ${colors[alert.type as keyof typeof colors]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${badges[alert.type as keyof typeof badges]}`}>
                        {labels[alert.type as keyof typeof labels]}
                      </span>
                      {alert.exp && <span className="text-[11px] font-mono text-primary">{alert.exp}</span>}
                      <span className="text-[11px] text-muted-foreground font-mono ml-auto">{alert.time}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{alert.msg}</p>
                    {alert.exp && <p className="text-xs text-primary mt-2">Abrir expediente para edición</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function exportDashboardPDF() {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Informe UCAPREC — ${new Date().toLocaleDateString("es-DO")}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #0D1B2A; font-size: 13px; }
    h1 { font-size: 18px; color: #0F2044; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #0F2044; margin: 20px 0 8px; border-bottom: 2px solid #0F2044; padding-bottom: 4px; }
    .sub { color: #64748B; font-size: 11px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .card { border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; background: #F8FAFC; }
    .card-val { font-size: 28px; font-weight: 700; font-family: monospace; color: #0F2044; }
    .card-lbl { font-size: 11px; color: #64748B; margin-top: 4px; }
    .alert-card { border-left: 4px solid; padding: 10px 14px; border-radius: 4px; margin-bottom: 8px; }
    .roja { border-color: #B91C1C; background: #FEF2F2; }
    .migr { border-color: #4F46E5; background: #EEF2FF; }
    .arr  { border-color: #D97706; background: #FFFBEB; }
    .pn   { border-color: #059669; background: #ECFDF5; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th { background: #0F2044; color: white; padding: 8px 10px; text-align: left; }
    td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; }
    tr:nth-child(even) td { background: #F8FAFC; }
    .footer { margin-top: 40px; font-size: 10px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 12px; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>Ministerio Público — UCAPREC</h1>
  <h2 style="font-size:16px;border:none;padding:0;margin-top:0">Estadísticas Sobre Unidad de Captura de Prófugos, Rebeldes y Condenados</h2>
  <div class="sub">Informe generado el ${new Date().toLocaleDateString("es-DO", { weekday:"long", year:"numeric", month:"long", day:"numeric" })} a las ${new Date().toLocaleTimeString("es-DO")}</div>

  <h2>Indicadores Operativos</h2>
  <div class="grid">
    <div class="card"><div class="card-val">${KPI.total.toLocaleString()}</div><div class="card-lbl">Expedientes Totales</div></div>
    <div class="card"><div class="card-val" style="color:#B91C1C">${KPI.profugos}</div><div class="card-lbl">Prófugos Activos</div></div>
    <div class="card"><div class="card-val" style="color:#D97706">${KPI.rebeldes}</div><div class="card-lbl">En Rebeldía</div></div>
    <div class="card"><div class="card-val" style="color:#D97706">${KPI.pendReview}</div><div class="card-lbl">Pendientes Revisión</div></div>
    <div class="card"><div class="card-val" style="color:#B91C1C">${KPI.alertaRoja}</div><div class="card-lbl">Alertas Rojas</div></div>
    <div class="card"><div class="card-val" style="color:#4F46E5">${KPI.alertaMig}</div><div class="card-lbl">Alertas Migratorias</div></div>
    <div class="card"><div class="card-val" style="color:#7C3AED">${KPI.ordenArresto}</div><div class="card-lbl">Órdenes de Arresto</div></div>
    <div class="card"><div class="card-val" style="color:#059669">${KPI.thisMonth}</div><div class="card-lbl">Nuevos este mes</div></div>
  </div>

  <h2>Medidas Activas por Tipo</h2>
  <div class="alert-card roja"><strong>Alertas Rojas (Interpol):</strong> ${KPI.alertaRoja} imputados — coordinación activa con organismos internacionales.</div>
  <div class="alert-card migr"><strong>Alertas Migratorias:</strong> ${KPI.alertaMig} imputados — notificación vigente ante la Dirección General de Migración.</div>
  <div class="alert-card arr"><strong>Órdenes de Arresto:</strong> ${KPI.ordenArresto} imputados — órdenes judiciales emitidas y pendientes de ejecución.</div>
  <div class="alert-card pn"><strong>Subidos a Policía Nacional:</strong> 284 imputados — fichas enviadas a la PN para captura.</div>

  <h2>Expedientes Recientes</h2>
  <table>
    <thead><tr><th>Expediente</th><th>Imputado</th><th>Delito</th><th>Estatus</th><th>Alerta</th><th>Asignado</th></tr></thead>
    <tbody>
      ${recentCases.slice(0,7).map(c => `<tr><td>${c.id}</td><td>${c.imputado}</td><td>${c.delito}</td><td>${c.estatus}</td><td>${c.alerta}</td><td>${c.asignado}</td></tr>`).join("")}
    </tbody>
  </table>

  <h2>Distribución por Estatus de Imputado</h2>
  <table>
    <thead><tr><th>Estatus</th><th>Cantidad</th><th>Porcentaje</th></tr></thead>
    <tbody>
      ${statusPieData.map(s => `<tr><td>${s.name}</td><td>${s.value.toLocaleString()}</td><td>${Math.round(s.value / KPI.total * 100)}%</td></tr>`).join("")}
    </tbody>
  </table>

  <div class="footer">
    Ministerio Público de la República Dominicana — Unidad de Captura de Prófugos, Rebeldes y Condenados (UCAPREC)<br/>
    Documento generado automáticamente. No requiere firma para su validez interna.
  </div>
</body>
</html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
}

function DashboardView({ setView }: { setView: (v: View) => void }) {
const [dashboardKpis, setDashboardKpis] = useState<null | {
  expedientes_totales: number
  imputados_totales: number
  profugos_activos: number
  en_rebeldia: number
  expedientes_en_revision: number
  alertas_rojas: number
  alertas_migratorias: number
  ordenes_arresto: number
  subidos_a_pn: number
}>(null)
const [dashboardCases, setDashboardCases] = useState<typeof recentCases>([])
const [dashboardExportRows, setDashboardExportRows] = useState<(string | number)[][]>([])
const [dashboardEvolution, setDashboardEvolution] = useState<Array<{ mes: string; casos: number }>>([])
const [dashboardStatusPie, setDashboardStatusPie] = useState<Array<{ name: string; value: number; color: string }>>([])
const [dashboardDistricts, setDashboardDistricts] = useState<Array<{ name: string; casos: number }>>([])
const [dashboardAlertsByMonth, setDashboardAlertsByMonth] = useState<Array<{ mes: string; roja: number; migratoria: number; arresto: number }>>([])
const [dashboardSexData, setDashboardSexData] = useState<Array<{ name: string; value: number; color: string }>>([])
const [dashboardAgeRanges, setDashboardAgeRanges] = useState<Array<{ name: string; casos: number }>>([])
const [dashboardNationality, setDashboardNationality] = useState<Array<{ name: string; casos: number }>>([])
const [dashboardTopCrimes, setDashboardTopCrimes] = useState<Array<{ name: string; casos: number }>>([])
const [dashboardAnalysts, setDashboardAnalysts] = useState<Array<{ name: string; casos: number }>>([])
const [dashboardRecordStatus, setDashboardRecordStatus] = useState<Array<{ name: string; casos: number }>>([])
const [dashboardDataQuality, setDashboardDataQuality] = useState<Array<{ name: string; casos: number }>>([])
const [showFilters, setShowFilters] = useState(false)
const [dashboardRefresh, setDashboardRefresh] = useState(0)
const [dashboardLoading, setDashboardLoading] = useState(false)
const [filters, setFilters] = useState({
  desde: "",
  hasta: "",
  estadoRegistro: "Todos",
  estadoImputado: "Todos",
  tipo: "Todos",
  delito: "Todos",
  alerta: "Todos",
  texto: "",
})

  const clearDashboardFilters = () => setFilters({
    desde: "",
    hasta: "",
    estadoRegistro: "Todos",
    estadoImputado: "Todos",
    tipo: "Todos",
    delito: "Todos",
    alerta: "Todos",
    texto: "",
  })

  const dashboardHasFilters = Object.values(filters).some(value => value !== "" && value !== "Todos")

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setDashboardLoading(true)
      let casesQuery = supabase
      .from("expedientes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000)

      if (filters.desde) casesQuery = casesQuery.gte("fecha_recepcion", filters.desde)
      if (filters.hasta) casesQuery = casesQuery.lte("fecha_recepcion", filters.hasta)
      if (filters.estadoRegistro !== "Todos") casesQuery = casesQuery.eq("estado_registro", filters.estadoRegistro)
      if (filters.estadoImputado !== "Todos") casesQuery = casesQuery.eq("estado_imputado", filters.estadoImputado)
      if (filters.tipo !== "Todos") casesQuery = casesQuery.eq("tipo_expediente", filters.tipo)
      if (filters.delito !== "Todos") casesQuery = casesQuery.eq("delito_principal", filters.delito)
      if (filters.texto.trim()) {
        const q = filters.texto.trim()
        casesQuery = casesQuery.or(`numero_expediente.ilike.%${q}%,numero_sentencia.ilike.%${q}%,imputado_principal.ilike.%${q}%,delito_principal.ilike.%${q}%`)
      }

      const { data: caseRows, error: caseError } = await casesQuery
      if (!active) return
      if (caseError) {
        console.error("Error cargando indicadores del dashboard:", caseError)
        setDashboardKpis(null)
        setDashboardCases([])
        setDashboardExportRows([])
        setDashboardLoading(false)
        return
      }

      const cases = (caseRows ?? []).map(mapExpedienteRow)
      const filteredCases = filters.alerta === "Todos" ? cases : cases.filter(c => c.alerta === filters.alerta)
      const caseIds = new Set(filteredCases.map(c => c.id))
      const { data: defendantRows } = await supabase.from("imputados").select("*").limit(5000)
      const { data: documentRows } = await supabase.from("documentos").select("numero_expediente, expediente_id").limit(5000)
      const defendantsForCases = (defendantRows ?? []).map(mapImputadoRow).filter(d => caseIds.has(d.exp))
      const rawDefendantsForCases = (defendantRows ?? []).filter(row => caseIds.has(firstText(row.numero_expediente, row.expediente, row.expediente_id)))
      const rawFilteredRows = (caseRows ?? []).filter(row => caseIds.has(mapExpedienteRow(row, 0).id))
      const countMap = <T extends string>(items: T[]) => items.reduce<Record<string, number>>((acc, item) => {
        const key = item || "Sin dato"
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      }, {})
      const topList = (items: string[], limit = 8) => Object.entries(countMap(items))
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, casos]) => ({ name, casos }))
      const ageRange = (value: number) => {
        if (!value) return "Sin edad"
        if (value <= 25) return "18-25"
        if (value <= 35) return "26-35"
        if (value <= 45) return "36-45"
        if (value <= 60) return "46-60"
        return "60+"
      }
      const byMonth = countMap(rawFilteredRows.map(row => monthLabel(firstText(row.fecha_recepcion, row.created_at, row.fecha_registro))))
      const byDistrict = countMap(rawFilteredRows.map(row => firstText(row.jurisdiccion, row.localidad_jurisdiccion, row.provincia, "Sin jurisdicción")))
      const statusCounts = countMap(defendantsForCases.map(d => d.estatus || "Sin estatus"))
      const colors: Record<string, string> = { "Prófugo": "#B91C1C", "Rebeldía": "#D97706", "Recluido": "#059669", "Libertad": "#94A3B8", "Absuelto": "#94A3B8", "Sin estatus": "#64748B" }
      const sexColors: Record<string, string> = { "Hombre": "#1D4ED8", "Masculino": "#1D4ED8", "Mujer": "#DB2777", "Femenino": "#DB2777", "Persona Jurídica": "#7C3AED", "Sin dato": "#64748B" }
      const alertMonths = Object.entries(byMonth).map(([mes]) => {
        const monthRows = rawFilteredRows.filter(row => monthLabel(firstText(row.fecha_recepcion, row.created_at, row.fecha_registro)) === mes)
        const monthCases = monthRows.map(row => mapExpedienteRow(row, 0))
        return {
          mes,
          roja: monthCases.filter(c => c.alerta === "Roja").length,
          migratoria: monthCases.filter(c => c.alerta === "Migratoria").length,
          arresto: defendantsForCases.filter(d => d.ordenArresto && monthCases.some(c => c.id === d.exp)).length,
        }
      })
      const documentExpedientes = new Set((documentRows ?? []).map(row => firstText(row.numero_expediente, row.expediente_id)).filter(Boolean))
      const caseIdsWithDefendants = new Set(defendantsForCases.map(d => d.exp))
      const qualityRows = [
        { name: "Sin imputados", casos: filteredCases.filter(c => !caseIdsWithDefendants.has(c.id)).length },
        { name: "Sin documentos", casos: filteredCases.filter(c => !documentExpedientes.has(c.id)).length },
        { name: "En revisión", casos: filteredCases.filter(c => c.estReg === "En Revisión").length },
        { name: "Verificados", casos: filteredCases.filter(c => c.estReg === "Verificado").length },
      ]

      setDashboardKpis({
        expedientes_totales: filteredCases.length,
        imputados_totales: defendantsForCases.length,
        profugos_activos: filteredCases.filter(c => c.estatus === "Prófugo").length,
        en_rebeldia: filteredCases.filter(c => c.estatus === "Rebeldía").length,
        expedientes_en_revision: filteredCases.filter(c => c.estReg === "En Revisión").length,
        alertas_rojas: filteredCases.filter(c => c.alerta === "Roja").length,
        alertas_migratorias: filteredCases.filter(c => c.alerta === "Migratoria").length,
        ordenes_arresto: defendantsForCases.filter(d => d.ordenArresto).length,
        subidos_a_pn: defendantsForCases.filter(d => d.policia).length,
      })
      setDashboardCases(filteredCases.slice(0, 5))
      setDashboardExportRows(filteredCases.map(c => [structuredIdForCase(c), c.id, c.sentencia, c.imputado, c.delito, c.tipo, c.estatus, c.alerta, c.estReg, c.asignado, c.fecha]))
      setDashboardEvolution(Object.entries(byMonth).map(([mes, casos]) => ({ mes, casos })))
      setDashboardStatusPie(Object.entries(statusCounts).map(([name, value]) => ({ name, value, color: colors[name] ?? "#1D4ED8" })))
      setDashboardDistricts(Object.entries(byDistrict).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, casos]) => ({ name, casos })))
      setDashboardAlertsByMonth(alertMonths.slice(-3))
      setDashboardSexData(Object.entries(countMap(defendantsForCases.map(d => d.sexo || "Sin dato"))).map(([name, value]) => ({ name, value, color: sexColors[name] ?? "#0F766E" })))
      setDashboardAgeRanges(["18-25", "26-35", "36-45", "46-60", "60+", "Sin edad"].map(name => ({ name, casos: defendantsForCases.filter(d => ageRange(Number(d.edad)) === name).length })))
      setDashboardNationality(topList(rawDefendantsForCases.map(row => firstText(row.nacionalidad, row.nac, "Sin nacionalidad")), 6))
      setDashboardTopCrimes(topList(filteredCases.map(c => c.delito || "Sin delito"), 8))
      setDashboardAnalysts(topList(filteredCases.map(c => c.asignado || "Sin asignar"), 8))
      setDashboardRecordStatus(topList(filteredCases.map(c => c.estReg || "Sin estado"), 6))
      setDashboardDataQuality(qualityRows)
      setDashboardLoading(false)
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [filters, dashboardRefresh])

const dashboardValues = {
  expedientesTotales: dashboardKpis?.expedientes_totales ?? 0,
  imputadosTotales: dashboardKpis?.imputados_totales ?? 0,
  profugosActivos: dashboardKpis?.profugos_activos ?? 0,
  enRebeldia: dashboardKpis?.en_rebeldia ?? 0,
  pendientesRevision: dashboardKpis?.expedientes_en_revision ?? 0,
  alertasRojas: dashboardKpis?.alertas_rojas ?? 0,
  alertasMigratorias: dashboardKpis?.alertas_migratorias ?? 0,
  ordenesArresto: dashboardKpis?.ordenes_arresto ?? 0,
  subidosPN: dashboardKpis?.subidos_a_pn ?? 0,
}

const exportDashboardReport = () => {
  const escapeHtml = (value: unknown) => String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
  const pct = (value: number, total: number) => total > 0 ? `${Math.round((value / total) * 100)}%` : "0%"
  const activeFilters = Object.entries(filters)
    .filter(([, value]) => value !== "" && value !== "Todos")
    .map(([key, value]) => `${key}: ${value}`)
  const topLabel = (data: Array<{ name: string; casos: number }>) => data[0] ? `${data[0].name} (${data[0].casos})` : "sin datos suficientes"
  const chartBars = (title: string, data: Array<{ name: string; casos: number }>, color = "#1D4ED8") => {
    const max = Math.max(1, ...data.map(item => item.casos))
    return `
      <section class="block">
        <h2>${escapeHtml(title)}</h2>
        <div class="bars">
          ${data.length === 0 ? `<p class="muted">No hay datos disponibles.</p>` : data.map(item => `
            <div class="bar-row">
              <div class="bar-label">${escapeHtml(item.name)}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (item.casos / max) * 100)}%; background:${color};"></div></div>
              <div class="bar-value">${item.casos.toLocaleString()}</div>
            </div>
          `).join("")}
        </div>
      </section>`
  }
  const pieLegend = (title: string, data: Array<{ name: string; value: number; color: string }>, total: number) => `
    <section class="block">
      <h2>${escapeHtml(title)}</h2>
      <div class="legend">
        ${data.length === 0 ? `<p class="muted">No hay datos disponibles.</p>` : data.map(item => `
          <div class="legend-row">
            <span class="dot" style="background:${item.color};"></span>
            <span>${escapeHtml(item.name)}</span>
            <strong>${item.value.toLocaleString()} (${pct(item.value, total)})</strong>
          </div>
        `).join("")}
      </div>
    </section>`
  const alertChart = `
    <section class="block wide">
      <h2>Alertas por tipo - ultimos 3 meses</h2>
      <table>
        <thead><tr><th>Mes</th><th>Alertas rojas</th><th>Alertas migratorias</th><th>Ordenes de arresto</th></tr></thead>
        <tbody>
          ${dashboardAlertsByMonth.length === 0 ? `<tr><td colspan="4">No hay datos disponibles.</td></tr>` : dashboardAlertsByMonth.map(row => `
            <tr><td>${escapeHtml(row.mes)}</td><td>${row.roja}</td><td>${row.migratoria}</td><td>${row.arresto}</td></tr>
          `).join("")}
        </tbody>
      </table>
    </section>`
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Informe sobre las estadisticas de UCAPREC</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      margin: 0;
      background: linear-gradient(180deg, #eef2f8 0%, #ffffff 220px);
    }
    body::before {
      content: "UCAPREC";
      position: fixed;
      right: 18mm;
      bottom: 18mm;
      color: rgba(30, 58, 138, .045);
      font-size: 68px;
      font-weight: 800;
      letter-spacing: .14em;
      z-index: -1;
    }
    header {
      position: relative;
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 24px;
      align-items: center;
      border-radius: 0 0 18px 18px;
      padding: 32px 30px 26px;
      margin: 0 0 20px;
      background: #293681;
      box-shadow: 0 16px 40px rgba(15, 23, 42, .18);
      overflow: visible;
    }
    .report-logo { width: 220px; max-height: 118px; object-fit: contain; display: block; }
    h1 { margin: 0 0 8px; font-size: 25px; color: #ffffff; }
    h2 { margin: 0 0 10px; font-size: 14px; color: #1e3a8a; text-transform: uppercase; letter-spacing: .04em; }
    p { font-size: 12px; line-height: 1.55; margin: 0 0 8px; }
    .muted { color: #64748b; }
    header .muted { color: rgba(255, 255, 255, .82); }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
    .card { border: 1px solid #dbe3ef; border-radius: 10px; padding: 10px; background: rgba(255, 255, 255, .96); box-shadow: 0 8px 24px rgba(15, 23, 42, .04); }
    .card span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
    .card strong { display: block; font-size: 22px; margin-top: 4px; }
    .report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .block { border: 1px solid #dbe3ef; border-radius: 10px; padding: 12px; break-inside: avoid; margin-bottom: 12px; background: rgba(255, 255, 255, .96); box-shadow: 0 8px 24px rgba(15, 23, 42, .04); }
    .wide { grid-column: 1 / -1; }
    .bars { display: grid; gap: 7px; }
    .bar-row { display: grid; grid-template-columns: 105px 1fr 44px; gap: 8px; align-items: center; font-size: 11px; }
    .bar-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { height: 12px; background: #eef2f7; border-radius: 999px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 999px; }
    .bar-value { text-align: right; font-weight: 700; }
    .legend { display: grid; gap: 7px; }
    .legend-row { display: grid; grid-template-columns: 12px 1fr auto; gap: 8px; align-items: center; font-size: 11px; }
    .dot { width: 10px; height: 10px; border-radius: 999px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 7px; text-align: left; }
    th { background: #f8fafc; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
    footer { margin-top: 18px; color: #64748b; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  </style>
</head>
<body>
  <header>
    <img class="report-logo" src="${mpWhiteLogo}" alt="Ministerio Publico" />
    <div>
      <h1>Informe sobre las estadisticas de UCAPREC</h1>
      <p class="muted">Unidad de Captura de Profugos, Rebeldes y Condenados</p>
      <p class="muted">Generado el ${escapeHtml(new Date().toLocaleString("es-DO"))}</p>
      <p class="muted">Filtros aplicados: ${escapeHtml(activeFilters.length ? activeFilters.join(" | ") : "Sin filtros")}</p>
    </div>
  </header>

  <section class="block wide">
    <h2>Analisis ejecutivo</h2>
    <p>El universo analizado contiene ${dashboardValues.expedientesTotales.toLocaleString()} expediente(s) y ${dashboardValues.imputadosTotales.toLocaleString()} imputado(s). Actualmente se identifican ${dashboardValues.profugosActivos.toLocaleString()} profugo(s), ${dashboardValues.enRebeldia.toLocaleString()} registro(s) en rebeldia y ${dashboardValues.pendientesRevision.toLocaleString()} expediente(s) pendiente(s) de revision.</p>
    <p>El delito con mayor presencia en la muestra es ${escapeHtml(topLabel(dashboardTopCrimes))}. La jurisdiccion con mayor concentracion es ${escapeHtml(topLabel(dashboardDistricts))}, mientras que el analista con mas expedientes asignados es ${escapeHtml(topLabel(dashboardAnalysts))}.</p>
    <p>En materia de medidas, el sistema refleja ${dashboardValues.alertasRojas.toLocaleString()} alerta(s) roja(s), ${dashboardValues.alertasMigratorias.toLocaleString()} alerta(s) migratoria(s) y ${dashboardValues.ordenesArresto.toLocaleString()} orden(es) de arresto. Estos indicadores permiten priorizar seguimiento operativo y revision documental.</p>
  </section>

  <section class="grid">
    ${[
      ["Expedientes", dashboardValues.expedientesTotales],
      ["Imputados", dashboardValues.imputadosTotales],
      ["Profugos", dashboardValues.profugosActivos],
      ["En rebeldia", dashboardValues.enRebeldia],
      ["En revision", dashboardValues.pendientesRevision],
      ["Alertas rojas", dashboardValues.alertasRojas],
      ["Alertas migratorias", dashboardValues.alertasMigratorias],
      ["Ordenes arresto", dashboardValues.ordenesArresto],
    ].map(([label, value]) => `<div class="card"><span>${escapeHtml(label)}</span><strong>${Number(value).toLocaleString()}</strong></div>`).join("")}
  </section>

  <section class="report-grid">
    ${pieLegend("Perfil de los imputados", dashboardSexData, dashboardValues.imputadosTotales)}
    ${chartBars("Rangos de edad", dashboardAgeRanges, "#0F766E")}
    ${chartBars("Nacionalidades principales", dashboardNationality, "#7C3AED")}
    ${chartBars("Delitos principales", dashboardTopCrimes, "#B91C1C")}
    ${chartBars("Casos por analista", dashboardAnalysts, "#1D4ED8")}
    ${chartBars("Estado del registro", dashboardRecordStatus, "#D97706")}
    ${chartBars("Calidad de datos", dashboardDataQuality, "#475569")}
    ${alertChart}
  </section>

  <section class="block wide">
    <h2>Expedientes recientes incluidos</h2>
    <table>
      <thead><tr><th>Expediente</th><th>Imputado</th><th>Delito</th><th>Estatus</th><th>Alerta</th><th>Asignado</th></tr></thead>
      <tbody>
        ${dashboardCases.length === 0 ? `<tr><td colspan="6">No hay expedientes recientes.</td></tr>` : dashboardCases.map(c => `
          <tr><td>${escapeHtml(c.id)}</td><td>${escapeHtml(c.imputado)}</td><td>${escapeHtml(c.delito)}</td><td>${escapeHtml(c.estatus)}</td><td>${escapeHtml(c.alerta)}</td><td>${escapeHtml(c.asignado)}</td></tr>
        `).join("")}
      </tbody>
    </table>
  </section>

  <footer>Ministerio Publico de la Republica Dominicana - Unidad de Captura de Profugos, Rebeldes y Condenados (UCAPREC). Documento generado automaticamente desde el sistema.</footer>
</body>
</html>`
  const reportWindow = window.open("", "_blank", "width=1000,height=800")
  if (!reportWindow) return
  reportWindow.document.write(html)
  reportWindow.document.close()
  reportWindow.focus()
  setTimeout(() => reportWindow.print(), 500)
}

  return (

    <div className="p-6 space-y-6">
      <SectionHeader
        title="Estadísticas Sobre la Unidad de Captura de Prófugos, Rebeldes y Condenados (UCAPREC)"
        action={
          <div className="flex gap-2">
            <Btn variant={showFilters ? "primary" : "secondary"} icon={Filter} size="sm" onClick={() => setShowFilters(value => !value)}>Filtros</Btn>
            <Btn variant="secondary" icon={RefreshCw} size="sm" onClick={() => setDashboardRefresh(value => value + 1)}>{dashboardLoading ? "Actualizando..." : "Actualizar"}</Btn>
            <Btn variant="secondary" icon={FileSpreadsheet} size="sm" onClick={() => downloadExcel(
              ["ID UCAPREC", "Expediente", "No. Sentencia", "Imputado", "Delito", "Tipo", "Estatus", "Alerta", "Estado Reg.", "Asignado", "Fecha"],
              dashboardExportRows,
              "dashboard_filtrado.xls"
            )}>Exportar Excel</Btn>
            <Btn variant="secondary" icon={Printer} size="sm" onClick={exportDashboardReport}>Exportar PDF</Btn>
          </div>
        }
      />

      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={filters.texto} onChange={e => setFilters(p => ({ ...p, texto: e.target.value }))} className="w-full pl-8 pr-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" placeholder="Buscar por expediente, sentencia, imputado o delito" />
            </div>
            <input type="date" value={filters.desde} onChange={e => setFilters(p => ({ ...p, desde: e.target.value }))} className="px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" />
            <input type="date" value={filters.hasta} onChange={e => setFilters(p => ({ ...p, hasta: e.target.value }))} className="px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" />
            <select value={filters.estadoRegistro} onChange={e => setFilters(p => ({ ...p, estadoRegistro: e.target.value }))} className="px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground">
              <option value="Todos">Estado de registro: Todos</option>
              {ESTADOS_REGISTRO.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={filters.estadoImputado} onChange={e => setFilters(p => ({ ...p, estadoImputado: e.target.value }))} className="px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground">
              <option value="Todos">Estatus imputado: Todos</option>
              {ESTADOS_IMPUTADO.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={filters.tipo} onChange={e => setFilters(p => ({ ...p, tipo: e.target.value }))} className="px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground">
              <option value="Todos">Tipo: Todos</option>
              {TIPOS_EXPEDIENTE.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={filters.delito} onChange={e => setFilters(p => ({ ...p, delito: e.target.value }))} className="px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground">
              <option value="Todos">Delito: Todos</option>
              {INFRACCIONES.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={filters.alerta} onChange={e => setFilters(p => ({ ...p, alerta: e.target.value }))} className="px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground">
              <option value="Todos">Alerta: Todas</option>
              <option value="Roja">Roja</option>
              <option value="Migratoria">Migratoria</option>
              <option value="Arresto">Arresto</option>
              <option value="—">Sin alerta</option>
            </select>
          </div>
          {dashboardHasFilters && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{dashboardValues.expedientesTotales} expediente(s) según filtros aplicados</span>
              <button onClick={clearDashboardFilters} className="text-xs text-primary hover:underline flex items-center gap-1"><X size={10} /> Limpiar filtros</button>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard label="Expedientes Totales" value={dashboardValues.expedientesTotales}
          icon={FolderOpen} bg="bg-blue-50 dark:bg-blue-900/20" fg="text-blue-700 dark:text-blue-400" />
        <KPICard label="Imputados Totales" value={dashboardValues.imputadosTotales}
          icon={Users} bg="bg-sky-50 dark:bg-sky-900/20" fg="text-sky-700 dark:text-sky-400" />
        <KPICard label="Prófugos Activos" value={dashboardValues.profugosActivos}
          icon={UserX} bg="bg-red-50 dark:bg-red-900/20" fg="text-red-700 dark:text-red-400" />
        <KPICard label="En Rebeldía" value={dashboardValues.enRebeldia}
          icon={Gavel} bg="bg-amber-50 dark:bg-amber-900/20" fg="text-amber-700 dark:text-amber-400" />
        <KPICard label="Pendiente Revisión" value={dashboardValues.pendientesRevision}
          icon={Clock} bg="bg-orange-50 dark:bg-orange-900/20" fg="text-orange-700 dark:text-orange-400" sub="Sin verificar >7 días" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard label="Alertas Rojas" value={dashboardValues.alertasRojas}
          icon={AlertOctagon} bg="bg-red-50 dark:bg-red-900/20" fg="text-red-700 dark:text-red-400" />
        <KPICard label="Alertas Migratorias" value={dashboardValues.alertasMigratorias}
          icon={Globe} bg="bg-indigo-50 dark:bg-indigo-900/20" fg="text-indigo-700 dark:text-indigo-400" />
        <KPICard label="Órdenes de Arresto" value={dashboardValues.ordenesArresto}
          icon={Lock} bg="bg-violet-50 dark:bg-violet-900/20" fg="text-violet-700 dark:text-violet-400" />
        <KPICard label="Subidos a PN" value={dashboardValues.subidosPN}
          icon={UserCheck} bg="bg-teal-50 dark:bg-teal-900/20" fg="text-teal-700 dark:text-teal-400" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Recepción de Casos — {new Date().getFullYear()}</h3>
              <p className="text-xs text-muted-foreground">Nuevos expedientes por mes</p>
            </div>
            <TrendingUp size={16} className="text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dashboardEvolution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="casosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
              <Area type="monotone" dataKey="casos" stroke="#1D4ED8" strokeWidth={2} fill="url(#casosGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Estatus de Imputados</h3>
            <p className="text-xs text-muted-foreground">Distribución actual</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={dashboardStatusPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {dashboardStatusPie.map((entry) => <Cell key={`status-${entry.name}`} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {dashboardStatusPie.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-mono font-medium text-foreground">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Expedientes por Jurisdicción</h3>
              <p className="text-xs text-muted-foreground">Top 8 jurisdicciones</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dashboardDistricts} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Bar key="dash-casos" dataKey="casos" fill="#1D4ED8" radius={[0, 3, 3, 0]} barSize={12}>
                <LabelList dataKey="casos" position="right" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Alertas por Tipo — Últimos 3 Meses</h3>
            <p className="text-xs text-muted-foreground">Evolución de alertas activas</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dashboardAlertsByMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar key="dash-roja" dataKey="roja" name="Roja" stackId="a" fill="#B91C1C">
                <LabelList dataKey="roja" position="insideTop" style={{ fontSize: 9, fill: "white", fontWeight: 600 }} />
              </Bar>
              <Bar key="dash-migratoria" dataKey="migratoria" name="Migratoria" stackId="a" fill="#4F46E5">
                <LabelList dataKey="migratoria" position="insideTop" style={{ fontSize: 9, fill: "white", fontWeight: 600 }} />
              </Bar>
              <Bar key="dash-arresto" dataKey="arresto" name="Arresto" stackId="a" fill="#D97706" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="arresto" position="insideTop" style={{ fontSize: 9, fill: "white", fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Analytical profile charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Perfil de los imputados</h3>
            <p className="text-xs text-muted-foreground">Distribución de imputados registrados</p>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={dashboardSexData} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={3} dataKey="value">
                {dashboardSexData.map((entry) => <Cell key={`sex-${entry.name}`} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {dashboardSexData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-mono font-medium text-foreground">{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Rangos de Edad</h3>
            <p className="text-xs text-muted-foreground">Concentración por perfil etario</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dashboardAgeRanges} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="casos" fill="#0F766E" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="casos" position="top" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Nacionalidades Principales</h3>
            <p className="text-xs text-muted-foreground">Top 6 nacionalidades registradas</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dashboardNationality} layout="vertical" margin={{ left: 12, right: 10, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="casos" fill="#7C3AED" radius={[0, 3, 3, 0]} barSize={12}>
                <LabelList dataKey="casos" position="right" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Delitos con Mayor Incidencia</h3>
            <p className="text-xs text-muted-foreground">Top 8 por volumen de expedientes</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dashboardTopCrimes} layout="vertical" margin={{ left: 20, right: 12, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="casos" fill="#B91C1C" radius={[0, 3, 3, 0]} barSize={12}>
                <LabelList dataKey="casos" position="right" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Carga Operativa por Analista</h3>
            <p className="text-xs text-muted-foreground">Expedientes asignados según filtros</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dashboardAnalysts} layout="vertical" margin={{ left: 20, right: 12, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="casos" fill="#1D4ED8" radius={[0, 3, 3, 0]} barSize={12}>
                <LabelList dataKey="casos" position="right" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Estado del Registro</h3>
            <p className="text-xs text-muted-foreground">Calidad del flujo documental</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dashboardRecordStatus} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="casos" fill="#D97706" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="casos" position="top" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-sm">Control de Calidad de Datos</h3>
            <p className="text-xs text-muted-foreground">Registros que requieren atención operativa</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dashboardDataQuality} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="casos" fill="#475569" radius={[3, 3, 0, 0]}>
                <LabelList dataKey="casos" position="top" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom: Recent cases + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Expedientes Recientes</h3>
            <button onClick={() => setView("cases")} className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ChevronRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Expediente", "Imputado", "Delito", "Estatus", "Alerta", "Asignado"].map(h => (
                    <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dashboardCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No hay expedientes recientes registrados.
                    </td>
                  </tr>
                ) : dashboardCases.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="py-2.5 px-4 font-mono text-[10px] text-primary">{c.id}</td>
                    <td className="py-2.5 px-4 text-foreground max-w-[120px] truncate">{c.imputado}</td>
                    <td className="py-2.5 px-4 text-muted-foreground">{c.delito}</td>
                    <td className="py-2.5 px-4"><Badge label={c.estatus} /></td>
                    <td className="py-2.5 px-4"><AlertBadge type={c.alerta} /></td>
                    <td className="py-2.5 px-4 text-muted-foreground">{c.asignado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Actividad Reciente</h3>
          </div>
          <div className="divide-y divide-border">
            {systemAlerts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No hay actividad reciente registrada.
              </div>
            ) : systemAlerts.map((a, i) => {
              const colorMap = { danger: "text-red-600", warning: "text-amber-600", info: "text-blue-500", success: "text-emerald-600" };
              const iconMap = { danger: AlertOctagon, warning: AlertTriangle, info: Info, success: CheckCircle };
              const Icon = iconMap[a.type as keyof typeof iconMap];
              return (
                <div key={i} className="flex gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <Icon size={13} className={`mt-0.5 flex-shrink-0 ${colorMap[a.type as keyof typeof colorMap]}`} />
                  <div>
                    <p className="text-xs text-foreground leading-snug">{a.msg}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cases View ───────────────────────────────────────────────────────────────

function CasesView({ setView, openCase, currentUser, canCreateCases, canEditCases, canDeleteCases }: {
  setView: (v: View) => void;
  openCase: (caseId: string, mode?: "detail" | "form") => void;
  currentUser: SessionUser;
  canCreateCases: boolean;
  canEditCases: boolean;
  canDeleteCases: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filterRecordStatus, setFilterRecordStatus] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterDelito, setFilterDelito] = useState("Todos");
  const [filterAnalista, setFilterAnalista] = useState("Todos");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [cases, setCases] = useState<typeof recentCases>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("expedientes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando expedientes:", error);
          setCases([]);
          return;
        }
        setCases((data ?? []).map(mapExpedienteRow));
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cases.filter(c => {
      if (filterRecordStatus === "Requieren atención" && c.estReg !== "En Revisión") return false;
      if (filterRecordStatus !== "Todos" && filterRecordStatus !== "Requieren atención" && c.estReg !== filterRecordStatus) return false;
      if (filterStatus !== "Todos" && c.estatus !== filterStatus) return false;
      if (filterTipo !== "Todos" && c.tipo !== filterTipo) return false;
      if (filterDelito !== "Todos" && c.delito !== filterDelito) return false;
      if (filterAnalista !== "Todos" && !c.asignado.toLowerCase().includes(filterAnalista.split(" ")[0].toLowerCase())) return false;
      if (filterDesde) {
        const [d, m, y] = c.fecha.split("/");
        if (new Date(`${y}-${m}-${d}`) < new Date(filterDesde)) return false;
      }
      if (filterHasta) {
        const [d, m, y] = c.fecha.split("/");
        if (new Date(`${y}-${m}-${d}`) > new Date(filterHasta)) return false;
      }
      if (q && !c.id.toLowerCase().includes(q) && !c.imputado.toLowerCase().includes(q) &&
          !c.delito.toLowerCase().includes(q) && !c.sentencia.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cases, search, filterRecordStatus, filterStatus, filterTipo, filterDelito, filterAnalista, filterDesde, filterHasta]);

  const reviewCount = cases.filter(c => c.estReg === "En Revisión").length;
  const verifiedCount = cases.filter(c => c.estReg === "Verificado").length;
  const attentionCount = cases.filter(c => c.estReg === "En Revisión").length;

  const confirmDelete = (id: string) => setDeleteId(id);
  const doDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("expedientes")
      .delete()
      .eq("numero_expediente", deleteId);

    if (error) {
      console.error("Error eliminando expediente:", error);
      return;
    }

    await logAuditEvent({
      usuario: currentUser.username,
      accion: "ELIMINAR_EXPEDIENTE",
      modulo: "Expedientes",
      entidad: deleteId,
      detalle: `Expediente ${deleteId} eliminado desde el módulo de expedientes.`,
      tipo: "security",
    });

    setCases(prev => prev.filter(c => c.id !== deleteId));
    setDeleteId(null);
  };

  const clearFilters = () => {
    setSearch("");
    setFilterRecordStatus("Todos");
    setFilterStatus("Todos");
    setFilterTipo("Todos");
    setFilterDelito("Todos");
    setFilterAnalista("Todos");
    setFilterDesde("");
    setFilterHasta("");
  };

  const selectCls = "text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="p-6">
      <SectionHeader
        title="Gestión de Expedientes"
        sub={`${filtered.length} de ${cases.length} expedientes mostrados`}
        action={canCreateCases ? <Btn icon={Plus} onClick={() => setView("case-new")}>Nuevo Expediente</Btn> : undefined}
      />

      {/* Resumen de estatus de registro */}
<div className="flex gap-2.5 mb-4 overflow-x-auto pb-1">
  <button
    onClick={() => setFilterRecordStatus("Todos")}
    className={`min-w-[200px] flex-1 text-left bg-card border rounded-lg p-3 transition-colors ${filterRecordStatus === "Todos" ? "border-primary ring-1 ring-primary/20" : "border-border hover:bg-muted/20"}`}
  >
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
    <div className="text-xl font-bold font-mono text-foreground mt-1">{cases.length}</div>
    <div className="text-[11px] text-muted-foreground mt-1">Expedientes registrados</div>
  </button>

  <button
    onClick={() => setFilterRecordStatus("En Revisión")}
    className={`min-w-[200px] flex-1 text-left bg-card border rounded-lg p-3 transition-colors ${filterRecordStatus === "En Revisión" ? "border-orange-500 ring-1 ring-orange-500/20 bg-orange-50/60 dark:bg-orange-900/10" : "border-border hover:bg-muted/20"}`}
  >
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">En Revisión</div>
    <div className="text-xl font-bold font-mono text-orange-600 dark:text-orange-400 mt-1">{reviewCount}</div>
    <div className="text-[11px] text-muted-foreground mt-1">Pendientes de cierre documental</div>
  </button>

  <button
    onClick={() => setFilterRecordStatus("Verificado")}
    className={`min-w-[200px] flex-1 text-left bg-card border rounded-lg p-3 transition-colors ${filterRecordStatus === "Verificado" ? "border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/60 dark:bg-blue-900/10" : "border-border hover:bg-muted/20"}`}
  >
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Verificado</div>
    <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{verifiedCount}</div>
    <div className="text-[11px] text-muted-foreground mt-1">Completamente revisados</div>
  </button>

  <button
    onClick={() => setFilterRecordStatus("Requieren atención")}
    className={`min-w-[220px] flex-1 text-left bg-card border rounded-lg p-3 transition-colors ${filterRecordStatus === "Requieren atención" ? "border-amber-500 ring-1 ring-amber-500/20 bg-amber-50/60 dark:bg-amber-900/10" : "border-border hover:bg-muted/20"}`}
  >
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Requieren atención</div>
    <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{attentionCount}</div>
    <div className="text-[11px] text-muted-foreground mt-1">Casos activos que deben revisarse</div>
  </button>
</div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/60 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/60"
              placeholder="Buscar por No. sentencia, imputado, delito…"
            />
          </div>

          {/* Estado de registro chips */}
          <div className="flex gap-1.5 flex-wrap">
            {["Todos", "En Revisión", "Verificado"].map(s => (
              <button
                key={s}
                onClick={() => setFilterRecordStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterRecordStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex gap-2 ml-auto">
            <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadExcel(
              ["ID UCAPREC", "Expediente", "No. Sentencia", "Imputado", "Delito", "Estatus", "Alerta", "Estado Reg.", "Asignado", "Fecha"],
              filtered.map(c => [structuredIdForCase(c), c.id, c.sentencia, c.imputado, c.delito, c.estatus, c.alerta, c.estReg, c.asignado, c.fecha]),
              "expedientes.xls"
            )}>Exportar Excel</Btn>
          </div>
        </div>

        {/* Advanced filters */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border items-end">
  <div className="flex flex-col gap-0.5">
  <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Estatus del Imputado</label>
  <select
    value={filterStatus}
    onChange={e => setFilterStatus(e.target.value)}
    className={`${selectCls} min-w-[170px]`}
  >
    <option value="Todos">Todos</option>
    <option value="Prófugo">Prófugo</option>
    <option value="Rebeldía">Rebeldía</option>
    <option value="Recluido">Recluido</option>
    <option value="Libertad">Libertad</option>
  </select>
</div>


          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tipo de Expediente</label>
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className={`${selectCls} min-w-[150px]`}>
              <option value="Todos">Todos</option>
              {TIPOS_EXPEDIENTE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Delito Principal</label>
            <select value={filterDelito} onChange={e => setFilterDelito(e.target.value)} className={`${selectCls} min-w-[180px]`}>
              <option value="Todos">Todos</option>
              {INFRACCIONES.map(inf => <option key={inf} value={inf}>{inf}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Analista</label>
            <select value={filterAnalista} onChange={e => setFilterAnalista(e.target.value)} className={`${selectCls} min-w-[140px]`}>
              <option value="Todos">Todos</option>
              {["Ana Rodríguez", "Luis Peña", "María Santos", "Pedro Álvarez"].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Fecha desde</label>
            <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} className={`${selectCls} min-w-[140px]`} />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Fecha hasta</label>
            <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} className={`${selectCls} min-w-[140px]`} />
          </div>

          {(search || filterRecordStatus !== "Todos" || filterStatus !== "Todos" || filterTipo !== "Todos" || filterDelito !== "Todos" || filterAnalista !== "Todos" || filterDesde || filterHasta) && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors self-end">
              <X size={12} /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <FileSearch size={32} className="opacity-30" />
            <p className="text-sm">No se encontraron expedientes con los filtros aplicados.</p>
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">Limpiar filtros</button>
          </div>
        ) : (
          <Table
            headers={["Expediente", "No. Sentencia", "Imputado Principal", "Delito", "Estatus", "Alerta", "Estado Reg.", "Asignado", "Fecha", "Acciones"]}
            rows={filtered.map(c => [
              <span className="font-mono text-xs text-primary cursor-pointer hover:underline" onClick={() => openCase(c.id)}>{c.id}</span>,
              <span className="font-mono text-xs text-muted-foreground">{c.sentencia}</span>,
              <span className="text-sm">{c.imputado}</span>,
              <span className="text-xs text-muted-foreground">{c.delito}</span>,
              <Badge label={c.estatus} />,
              <AlertBadge type={c.alerta} />,
              <Badge label={c.estReg} />,
              <span className="text-xs text-muted-foreground">{c.asignado}</span>,
              <span className="font-mono text-xs text-muted-foreground">{c.fecha}</span>,
              <div className="flex gap-1">
                <button title="Ver detalle" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" onClick={() => openCase(c.id)}><Eye size={13} /></button>
                {canEditCases && <button title="Editar expediente" className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 transition-colors" onClick={() => openCase(c.id, "form")}><Edit2 size={13} /></button>}
                {canDeleteCases && <button title="Eliminar expediente" className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors" onClick={() => confirmDelete(c.id)}><Trash2 size={13} /></button>}
              </div>
            ])}
          />
        )}
        <div className="px-4 pb-4 border-t border-border">
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-muted-foreground font-mono">{filtered.length} resultado(s)</span>
            <Pagination total={filtered.length} />
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Eliminar Expediente</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{deleteId}</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-6">¿Está seguro que desea eliminar este expediente? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Btn>
              <Btn variant="danger" icon={Trash2} onClick={doDelete}>Eliminar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Location Tab (cascading provincia → municipio → sector) ─────────────────

function LocationTab({ isEdit }: { isEdit: boolean }) {
  const [provincia, setProvincia] = useState("Distrito Nacional");
  const [municipio, setMunicipio] = useState("Distrito Nacional");
  const [sector, setSector] = useState("N/A");
  const [delito, setDelito] = useState("Lavado de activos");

  const municipios = useMemo(() => getMunicipios(provincia), [provincia]);
  const sectores = useMemo(() => getSectores(provincia, municipio), [provincia, municipio]);

  const inputCls = `w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground ${!isEdit ? "opacity-75 cursor-default" : ""}`;
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider";

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Provincia */}
        <div>
          <label className={labelCls}>Provincia<span className="text-red-500">*</span></label>
          <select
            disabled={!isEdit}
            value={provincia}
            onChange={e => { setProvincia(e.target.value); setMunicipio(getMunicipios(e.target.value)[0] ?? "N/A"); setSector("N/A"); }}
            className={inputCls}
          >
            <option value="N/A">N/A</option>
            {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        {/* Municipio — depende de provincia */}
        <div>
          <label className={labelCls}>Municipio</label>
          <select
            disabled={!isEdit}
            value={municipio}
            onChange={e => { setMunicipio(e.target.value); setSector("N/A"); }}
            className={inputCls}
          >
            <option value="N/A">N/A</option>
            {municipios.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        {/* Sector — depende de municipio */}
        <div>
          <label className={labelCls}>Sector</label>
          <select
            disabled={!isEdit}
            value={sector}
            onChange={e => setSector(e.target.value)}
            className={inputCls}
          >
            <option value="N/A">N/A</option>
            {sectores.filter(s => s !== "N/A").map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Dirección */}
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelCls}>Dirección Detallada</label>
          <textarea
            readOnly={!isEdit}
            defaultValue="Av. Máximo Gómez #145, Edif. Torre Empresarial, Piso 8"
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Delito principal — catálogo real */}
        <div>
          <label className={labelCls}>Delito Principal<span className="text-red-500">*</span></label>
          <select
            disabled={!isEdit}
            value={delito}
            onChange={e => setDelito(e.target.value)}
            className={inputCls}
          >
            {INFRACCIONES.map(inf => <option key={inf}>{inf}</option>)}
          </select>
        </div>

        {/* Tipos penales */}
        <div className="sm:col-span-2">
          <label className={labelCls}>Tipos Penales (texto libre)</label>
          <input
            readOnly={!isEdit}
            defaultValue="Lavado de activos agravado — Art. 3 y 4 Ley 155-17; Asociación de malhechores — Art. 265 y 266 C.P."
            className={inputCls}
          />
        </div>
      </div>

      {/* Pill informativo */}
      {!isEdit && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <MapPin size={12} />
          <span className="font-mono">{provincia} › {municipio} › {sector}</span>
          <span className="text-border mx-1">|</span>
          <span>Delito: <span className="text-foreground font-medium">{delito}</span></span>
        </div>
      )}
    </div>
  );
}

// ─── Case Detail / Form View ──────────────────────────────────────────────────

function CaseDetailView({
  setView,
  mode,
  initialTab = 0,
  autoOpenAddDefModal = false,
  selectedCaseId,
  currentUser,
  canEditCases = true,
  returnToView = "cases",
  onConsumedAutoOpenAddDefModal,
}: {
  setView: (v: View) => void;
  mode: "detail" | "form";
  initialTab?: number;
  autoOpenAddDefModal?: boolean;
  selectedCaseId?: string;
  currentUser: SessionUser;
  canEditCases?: boolean;
  returnToView?: View;
  onConsumedAutoOpenAddDefModal?: () => void;
}) {
  const isEdit = mode === "form" && canEditCases;
  const [tab, setTab] = useState(initialTab);
  const activeCaseId = selectedCaseId?.trim() || "";
  const [caseRecord, setCaseRecord] = useState<DbRow | null>(null);
  const [caseDocs, setCaseDocs] = useState<Array<typeof docsData[0] & { ruta?: string }>>([]);
  const [caseUploadFile, setCaseUploadFile] = useState<File | null>(null);
  const [caseUploadDescription, setCaseUploadDescription] = useState("");
  const [analystOptions, setAnalystOptions] = useState<string[]>([]);
  const [locationEdit, setLocationEdit] = useState({ provincia: "", municipio: "", sector: "", direccion: "", delito: "", tiposPenales: "" });
  const [caseMeasureNotes, setCaseMeasureNotes] = useState("");
  const [generalEdit, setGeneralEdit] = useState({
    numeroExpediente: "",
    fechaRecepcion: "",
    sentencia: "",
    tipoExpediente: "",
    jurisdiccion: "",
    localidad: "",
    fechaDecision: "",
    decision: "",
    interpone: "",
    estadoRegistro: "",
    asignado: "",
  });

  // ── Defendants state ──
  const [defs, setDefs] = useState<DefEntry[]>([]);
  const [showDefModal, setShowDefModal] = useState(false);
  const [newDef, setNewDef] = useState<Omit<DefEntry, "id">>({ ...EMPTY_DEF });
  const [dialog, setDialog] = useState<null | {
    title: string;
    message: string;
    variant?: "info" | "danger";
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>(null);

  useEffect(() => {
    if (mode === "form") {
      setTab(initialTab);
    }
  }, [mode, initialTab]);

  useEffect(() => {
    if (mode === "form" && autoOpenAddDefModal) {
      setShowDefModal(true);
      onConsumedAutoOpenAddDefModal?.();
    }
  }, [mode, autoOpenAddDefModal, onConsumedAutoOpenAddDefModal]);

  const handleCancelCaseEdit = () => {
    if (!isEdit) {
      setView("cases");
      return;
    }

    setDialog({
      title: "Cancelar edición del expediente",
      message: "Si cancela esta acción, se perderán los cambios realizados en el expediente.",
      variant: "danger",
      confirmLabel: "Sí, cancelar",
      cancelLabel: "Volver",
      onConfirm: () => {
        setDialog(null);
        setView(returnToView);
      },
      onCancel: () => setDialog(null),
    });
  };

  const updateGeneralEdit = (key: keyof typeof generalEdit, value: string) => {
    setGeneralEdit(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveCaseEdit = async () => {
    if (!activeCaseId) return;
    const nextCaseNumber = generalEdit.numeroExpediente.trim() || activeCaseId;
    const parseMoney = (value: string) => {
      const normalized = String(value ?? "").trim().replace(/,/g, "");
      return normalized === "" ? null : Number(normalized);
    };
    const auditDetail = describeFieldChanges([
      { campo: "No. expediente", antes: activeCaseId, despues: nextCaseNumber },
      { campo: "No. sentencia / resolución", antes: firstText(caseRecord?.numero_sentencia), despues: generalEdit.sentencia },
      { campo: "Tipo expediente", antes: firstText(caseRecord?.tipo_expediente), despues: generalEdit.tipoExpediente },
      { campo: "Jurisdicción", antes: firstText(caseRecord?.jurisdiccion), despues: generalEdit.jurisdiccion },
      { campo: "Estado registro", antes: firstText(caseRecord?.estado_registro), despues: generalEdit.estadoRegistro || "En Revisión" },
      { campo: "Asignado a", antes: firstText(caseRecord?.asignado_a), despues: generalEdit.asignado },
      { campo: "Provincia", antes: firstText(caseRecord?.provincia), despues: locationEdit.provincia },
      { campo: "Municipio", antes: firstText(caseRecord?.municipio), despues: locationEdit.municipio },
      { campo: "Sector", antes: firstText(caseRecord?.sector), despues: locationEdit.sector },
      { campo: "Observación medidas", antes: caseMeasureNotes, despues: caseMeasureNotes },
    ]);

    const updatePayload: DbRow = {
      numero_expediente: nextCaseNumber,
      fecha_recepcion: generalEdit.fechaRecepcion || null,
      numero_sentencia: generalEdit.sentencia,
      tipo_expediente: generalEdit.tipoExpediente,
      jurisdiccion: generalEdit.jurisdiccion,
      localidad_jurisdiccion: generalEdit.localidad,
      fecha_decision: generalEdit.fechaDecision || null,
      decision: generalEdit.decision,
      quien_interpone: generalEdit.interpone,
      estado_registro: generalEdit.estadoRegistro || "En Revisión",
      asignado_a: generalEdit.asignado,
      provincia: locationEdit.provincia,
      municipio: locationEdit.municipio,
      sector: locationEdit.sector,
      direccion: locationEdit.direccion,
      delito_principal: locationEdit.delito,
      tipos_penales: locationEdit.tiposPenales,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("expedientes")
      .update(updatePayload)
      .eq("numero_expediente", activeCaseId);

    if (error) {
      console.error("Error actualizando expediente:", error);
      setDialog({
        title: "No se pudo guardar",
        message: "No fue posible actualizar el expediente. Verifique la conexión e intente nuevamente.",
        variant: "danger",
        confirmLabel: "Aceptar",
        onConfirm: () => setDialog(null),
      });
      return;
    }

    if (caseMeasureNotes.trim()) {
      const { error: measureNoteError } = await supabase
        .from("medidas_alertas_expediente")
        .update({ observacion: caseMeasureNotes })
        .eq("numero_expediente", activeCaseId);
      if (measureNoteError) console.error("Error actualizando observaciones de medidas:", measureNoteError);
    }

    for (const def of defs) {
      const defPayload = {
        expediente_id: caseRecord?.id ?? null,
        numero_expediente: nextCaseNumber,
        tipo_persona: def.tipo,
        nombre_completo: def.nombre,
        documento: def.doc || null,
        edad: def.edad ? Number(def.edad) : null,
        sexo: def.sexo || null,
        nacionalidad: def.nac || null,
        estado_imputado: def.estadoImp || null,
        estado_judicial: def.estadoJud || null,
        centro_penitenciario: def.centro || null,
        pena: def.penaImp ? `${def.penaImp} años` : "",
        pena_impuesta: parseMoney(def.penaImp),
        pena_privativa: parseMoney(def.penaPriv),
        pena_suspendida: parseMoney(def.penaSusp),
        indemnizacion: parseMoney(def.indemnizacion),
        garantia: parseMoney(def.garantia),
        multa: parseMoney(def.multa),
        decomiso: def.decomiso || null,
        alerta_roja: def.alertaRoja,
        alerta_migratoria: def.alertaMig,
        orden_arresto: def.arresto,
        subido_a_pn: def.subidoPN,
        updated_at: new Date().toISOString(),
      };

      if (def.dbId) {
        const { error: defUpdateError } = await supabase.from("imputados").update(defPayload).eq("id", def.dbId);
        if (defUpdateError) {
          console.error("Error actualizando imputado:", defUpdateError);
          setDialog({
            title: "No se pudo guardar el imputado",
            message: "El expediente se guardó, pero uno de los imputados no pudo actualizarse. Revise la conexión e intente nuevamente.",
            variant: "danger",
            confirmLabel: "Aceptar",
            onConfirm: () => setDialog(null),
          });
          return;
        }
      } else {
        const { data: insertedDef, error: defInsertError } = await supabase.from("imputados").insert(defPayload).select().single();
        if (defInsertError) {
          console.error("Error insertando imputado:", defInsertError);
          setDialog({
            title: "No se pudo guardar el imputado",
            message: "El expediente se guardó, pero uno de los imputados nuevos no pudo registrarse. Revise la conexión e intente nuevamente.",
            variant: "danger",
            confirmLabel: "Aceptar",
            onConfirm: () => setDialog(null),
          });
          return;
        }
        if (insertedDef?.id) {
          setDefs(prev => prev.map(item => item.id === def.id ? { ...item, dbId: firstText(insertedDef.id) } : item));
        }
      }
    }

    for (const vic of vics) {
      const vicPayload = {
        expediente_id: caseRecord?.id ?? null,
        numero_expediente: nextCaseNumber,
        tipo_persona: vic.tipo,
        nombre_completo: vic.nombre,
        imputado_relacionado: defs[0]?.nombre ?? "",
        delito: firstText(caseRecord?.delito_principal),
      };

      if (vic.dbId) {
        const { error: vicUpdateError } = await supabase.from("victimas").update(vicPayload).eq("id", vic.dbId);
        if (vicUpdateError) {
          console.error("Error actualizando víctima:", vicUpdateError);
          setDialog({
            title: "No se pudo guardar la víctima",
            message: "El expediente se guardó, pero una víctima no pudo actualizarse. Revise la conexión e intente nuevamente.",
            variant: "danger",
            confirmLabel: "Aceptar",
            onConfirm: () => setDialog(null),
          });
          return;
        }
      } else {
        const { data: insertedVic, error: vicInsertError } = await supabase.from("victimas").insert(vicPayload).select().single();
        if (vicInsertError) {
          console.error("Error insertando víctima:", vicInsertError);
          setDialog({
            title: "No se pudo guardar la víctima",
            message: "El expediente se guardó, pero una víctima nueva no pudo registrarse. Revise la conexión e intente nuevamente.",
            variant: "danger",
            confirmLabel: "Aceptar",
            onConfirm: () => setDialog(null),
          });
          return;
        }
        if (insertedVic?.id) {
          setVics(prev => prev.map(item => item.id === vic.id ? { ...item, dbId: firstText(insertedVic.id) } : item));
        }
      }
    }

    await logAuditEvent({
      usuario: currentUser.username,
      accion: "EDITAR_EXPEDIENTE",
      modulo: "Expedientes",
      entidad: nextCaseNumber,
      detalle: auditDetail,
      tipo: "update",
    });

    setCaseRecord(prev => prev ? {
      ...prev,
      numero_expediente: nextCaseNumber,
      fecha_recepcion: generalEdit.fechaRecepcion,
      numero_sentencia: generalEdit.sentencia,
      tipo_expediente: generalEdit.tipoExpediente,
      jurisdiccion: generalEdit.jurisdiccion,
      localidad_jurisdiccion: generalEdit.localidad,
      fecha_decision: generalEdit.fechaDecision,
      decision: generalEdit.decision,
      quien_interpone: generalEdit.interpone,
      estado_registro: generalEdit.estadoRegistro || "En Revisión",
      asignado_a: generalEdit.asignado,
      provincia: locationEdit.provincia,
      municipio: locationEdit.municipio,
      sector: locationEdit.sector,
      direccion: locationEdit.direccion,
      delito_principal: locationEdit.delito,
      tipos_penales: locationEdit.tiposPenales,
    } : prev);

    setDialog({
      title: "Cambios guardados",
      message: "Los cambios del expediente se guardaron correctamente.",
      variant: "info",
      confirmLabel: "Aceptar",
      onConfirm: () => {
        setDialog(null);
        setView(returnToView);
      },
    });
  };

  const handleCancelAddDef = () => {
    setDialog({
      title: "Cancelar imputado",
      message: "Si cancela esta acción, se perderán los datos digitados del imputado.",
      variant: "danger",
      confirmLabel: "Sí, cancelar",
      cancelLabel: "Volver",
      onConfirm: () => {
        setDialog(null);
        setNewDef({ ...EMPTY_DEF });
        setShowDefModal(false);
      },
      onCancel: () => setDialog(null),
    });
  };

  const addDef = async () => {
    const allFieldsEmpty = !hasUnsavedDefData(newDef);

    if (allFieldsEmpty) {
      setDialog({
        title: "Datos requeridos",
        message: "Debe completar al menos un campo antes de agregar el imputado.",
        variant: "info",
        confirmLabel: "Entendido",
        onConfirm: () => setDialog(null),
      });
      return;
    }

    if (!newDef.nombre.trim()) {
      setDialog({
        title: "Nombre requerido",
        message: "Debe completar el nombre completo del imputado.",
        variant: "info",
        confirmLabel: "Entendido",
        onConfirm: () => setDialog(null),
      });
      return;
    }

    if (activeCaseId) {
      const { data, error } = await supabase.from("imputados").insert({
        expediente_id: caseRecord?.id,
        numero_expediente: activeCaseId,
        tipo_persona: newDef.tipo,
        nombre_completo: newDef.nombre,
        documento: newDef.doc,
        edad: newDef.edad ? Number(newDef.edad) : null,
        sexo: newDef.sexo,
        nacionalidad: newDef.nac,
        estado_imputado: newDef.estadoImp,
        estado_judicial: newDef.estadoJud,
        centro_penitenciario: newDef.centro,
        pena: newDef.penaImp ? `${newDef.penaImp} años` : "",
        pena_impuesta: newDef.penaImp ? Number(newDef.penaImp) : null,
        pena_privativa: newDef.penaPriv ? Number(newDef.penaPriv) : null,
        pena_suspendida: newDef.penaSusp ? Number(newDef.penaSusp) : null,
        indemnizacion: newDef.indemnizacion ? Number(String(newDef.indemnizacion).replace(/,/g, "")) : null,
        garantia: newDef.garantia ? Number(String(newDef.garantia).replace(/,/g, "")) : null,
        multa: newDef.multa ? Number(String(newDef.multa).replace(/,/g, "")) : null,
        decomiso: newDef.decomiso,
        alerta_roja: newDef.alertaRoja,
        alerta_migratoria: newDef.alertaMig,
        orden_arresto: newDef.arresto,
        subido_a_pn: newDef.subidoPN,
      }).select().single();

      if (error) {
        console.error("Error agregando imputado al expediente:", error);
        return;
      }

      setDefs(prev => [...prev, { ...newDef, id: firstId(Date.now(), data?.id), dbId: firstText(data?.id) }]);
    } else {
      setDefs(prev => [...prev, { ...newDef, id: Date.now() }]);
    }
    setNewDef({ ...EMPTY_DEF });
    setShowDefModal(false);
  };
  const updateDefField = (id: number, key: keyof Omit<DefEntry, "id" | "dbId">, value: string | boolean) => {
    setDefs(prev => prev.map(def => def.id === id ? { ...def, [key]: value } as DefEntry : def));
  };

  const removeDef = async (id: number) => {
    const target = defs.find(d => d.id === id);
    if (!target) return;
    if (activeCaseId && target.dbId) {
      const { error } = await supabase.from("imputados").delete().eq("id", target.dbId);
      if (error) {
        console.error("Error eliminando imputado:", error);
        return;
      }
    }
    setDefs(prev => prev.filter(d => d.id !== id));
  };

  // ── Victims state ──
  const [vics, setVics] = useState<VicEntry[]>([]);
  const [showVicModal, setShowVicModal] = useState(false);
  const [newVic, setNewVic] = useState({ tipo: "Persona Física", nombre: "" });

  const addVic = async () => {
    if (!newVic.nombre.trim()) return;
    if (activeCaseId) {
      const { data, error } = await supabase.from("victimas").insert({
        expediente_id: caseRecord?.id,
        numero_expediente: activeCaseId,
        tipo_persona: newVic.tipo,
        nombre_completo: newVic.nombre,
        imputado_relacionado: defs[0]?.nombre ?? "",
        delito: firstText(caseRecord?.delito_principal),
      }).select().single();

      if (error) {
        console.error("Error agregando víctima al expediente:", error);
        return;
      }

      setVics(prev => [...prev, { id: firstId(Date.now(), data?.id), dbId: firstText(data?.id), ...newVic }]);
    } else {
      setVics(prev => [...prev, { id: Date.now(), ...newVic }]);
    }
    setNewVic({ tipo: "Persona Física", nombre: "" });
    setShowVicModal(false);
  };
  const updateVicField = (id: number, key: keyof Omit<VicEntry, "id" | "dbId">, value: string) => {
    setVics(prev => prev.map(vic => vic.id === id ? { ...vic, [key]: value } as VicEntry : vic));
  };

  const removeVic = async (id: number) => {
    const target = vics.find(v => v.id === id);
    if (!target) return;
    if (activeCaseId && target.dbId) {
      const { error } = await supabase.from("victimas").delete().eq("id", target.dbId);
      if (error) {
        console.error("Error eliminando víctima:", error);
        return;
      }
    }
    setVics(prev => prev.filter(v => v.id !== id));
  };

  // ── Measures state ──
  const [measures, setMeasures] = useState({ arresto: false, roja: false, migratoria: false, policia: false });
  const toggleMeasure = (k: keyof typeof measures) => setMeasures(m => ({ ...m, [k]: !m[k] }));

  useEffect(() => {
    if (!activeCaseId) return;
    let active = true;

    const loadCase = async () => {
      const { data: expRow } = await supabase
        .from("expedientes")
        .select("*")
        .eq("numero_expediente", activeCaseId)
        .maybeSingle();
      if (!active) return;
      setCaseRecord(expRow ?? null);
      if (expRow) {
        setGeneralEdit({
          numeroExpediente: firstText(expRow.numero_expediente, expRow.no_expediente, expRow.expediente),
          fechaRecepcion: toDateInputValue(expRow.fecha_recepcion, expRow.fecha_registro, expRow.created_at),
          sentencia: firstText(expRow.numero_sentencia, expRow.no_sentencia, expRow.sentencia),
          tipoExpediente: firstText(expRow.tipo_expediente, expRow.tipo),
          jurisdiccion: firstText(expRow.jurisdiccion),
          localidad: firstText(expRow.localidad_jurisdiccion),
          fechaDecision: toDateInputValue(expRow.fecha_decision),
          decision: firstText(expRow.decision),
          interpone: firstText(expRow.quien_interpone),
          estadoRegistro: firstText(expRow.estado_registro, "En Revisión"),
          asignado: firstText(expRow.asignado_a, expRow.analista, expRow.usuario_asignado),
        });
        setLocationEdit({
          provincia: firstText(expRow.provincia),
          municipio: firstText(expRow.municipio),
          sector: firstText(expRow.sector),
          direccion: firstText(expRow.direccion),
          delito: firstText(expRow.delito_principal),
          tiposPenales: firstText(expRow.tipos_penales),
        });
      }

      const { data: imputadoRows } = await supabase
        .from("imputados")
        .select("*")
        .eq("numero_expediente", activeCaseId);
      if (active) {
        const loadedDefs = (imputadoRows ?? []).map(mapImputadoRow).map(row => ({
          id: row.id,
          dbId: row.dbId,
          tipo: row.sexo === "Persona Jurídica" ? "Persona Jurídica" : "Persona Física",
          nombre: row.nombre,
          doc: row.doc,
          edad: row.edad ? String(row.edad) : "",
          sexo: row.sexo,
          nac: "",
          estadoImp: row.estatus,
          estadoJud: row.estJud,
          centro: "",
          penaImp: row.pena,
          penaPriv: "",
          penaSusp: "",
          indemnizacion: "",
          garantia: "",
          multa: "",
          decomiso: "",
          subidoPN: row.policia,
          arresto: row.ordenArresto,
          alertaRoja: row.alertaRoja,
          alertaMig: row.alertaMig,
        }));
        setDefs(loadedDefs);
        setMeasures({
          arresto: loadedDefs.some(d => d.arresto),
          roja: loadedDefs.some(d => d.alertaRoja),
          migratoria: loadedDefs.some(d => d.alertaMig),
          policia: loadedDefs.some(d => d.subidoPN),
        });
      }

      const { data: victimRows } = await supabase
        .from("victimas")
        .select("*")
        .eq("numero_expediente", activeCaseId);
      if (active) {
        setVics((victimRows ?? []).map((row, idx) => ({
          id: firstId(idx + 1, row.id),
          dbId: firstText(row.id),
          tipo: firstText(row.tipo_persona, "Persona Física"),
          nombre: firstText(row.nombre_completo, row.nombre),
        })));
      }

      const { data: measureRows } = await supabase
        .from("medidas_alertas_expediente")
        .select("*")
        .eq("numero_expediente", activeCaseId);
      if (active) {
        setCaseMeasureNotes(firstText(...(measureRows ?? []).map(row => firstText(row.observacion, row.observaciones, row.descripcion))));
      }

      const { data: docRows } = await supabase
        .from("documentos")
        .select("*")
        .eq("numero_expediente", activeCaseId)
        .order("fecha_subida", { ascending: false });
      if (active) {
        setCaseDocs((docRows ?? []).map((row, idx) => ({
          id: firstId(idx + 1, row.id),
          nombre: firstText(row.nombre_archivo, row.nombre),
          tipo: firstText(row.tipo_archivo, row.tipo).toUpperCase(),
          peso: firstText(row.peso),
          exp: firstText(row.numero_expediente),
          imputado: firstText(row.imputado),
          descripcion: firstText(row.descripcion),
          subidoPor: firstText(row.subido_por),
          fecha: formatDateTime(row.fecha_subida, row.created_at),
          version: firstId(1, row.version),
          ruta: firstText(row.ruta_storage),
        })));
      }
    };

    loadCase();
    return () => {
      active = false;
    };
  }, [activeCaseId]);

  useEffect(() => {
    let active = true;
    supabase
      .from("usuarios")
      .select("nombre_completo, usuario, rol")
      .eq("estatus", "Activo")
      .order("nombre_completo", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        const names = (data ?? []).map(row => {
          const name = firstText(row.nombre_completo, row.usuario);
          const role = firstText(row.rol);
          return role ? `${name} (${role})` : name;
        }).filter(Boolean);
        setAnalystOptions(names.length > 0 ? names : [currentUser.username]);
      });
    return () => {
      active = false;
    };
  }, []);

  const tabs = ["Datos Generales", "Imputados", "Víctimas", "Medidas / Alertas", "Localización", "Documentos", "Observaciones"];
  const inputCls = `w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/50 ${!isEdit ? "opacity-75 cursor-default" : ""}`;
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider";

  const Field = ({ label, value, type = "text", required = false, onChange }: { label: string; value?: string; type?: string; required?: boolean; onChange?: (value: string) => void }) => (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {type === "textarea"
        ? <textarea readOnly={!isEdit} value={value ?? ""} onChange={e => onChange?.(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
        : <input readOnly={!isEdit} type={type} value={value ?? ""} onChange={e => onChange?.(e.target.value)} className={inputCls} />
      }
    </div>
  );
  const Sel = ({ label, value, options, required = false, onChange }: { label: string; value?: string; options: string[]; required?: boolean; onChange?: (value: string) => void }) => (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select
        disabled={!isEdit}
        value={value ?? ""}
        onChange={e => onChange?.(e.target.value)}
        className={inputCls}
      >
        <option value="">Seleccione una opción</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  const BoolBadge = ({ v }: { v: boolean }) => (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium ${v ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"}`}>
      {v ? <CheckSquare size={10} /> : <X size={10} />}{v ? "Sí" : "No"}
    </div>
  );
  const activeCase = caseRecord ? mapExpedienteRow(caseRecord, 0) : null;
  const locationMunicipios = useMemo(() => locationEdit.provincia ? getMunicipios(locationEdit.provincia) : [], [locationEdit.provincia]);
  const locationSectores = useMemo(() => (locationEdit.provincia && locationEdit.municipio) ? getSectores(locationEdit.provincia, locationEdit.municipio) : [], [locationEdit.provincia, locationEdit.municipio]);

  // Export helpers for this case
  const exportCaseCSV = () => {
    downloadExcel(
      ["ID UCAPREC", "Expediente", "Sentencia", "Imputado", "Documento", "Estado", "Pena", "Alerta Roja", "Alert. Migratoria", "Orden Arresto"],
      defs.map(d => [structuredIdForCase({ id: activeCaseId, sentencia: activeCase?.sentencia, fecha: activeCase?.fecha }), activeCaseId, activeCase?.sentencia ?? "", d.nombre, d.doc, d.estadoImp, d.penaImp, d.alertaRoja ? "Sí" : "No", d.alertaMig ? "Sí" : "No", d.arresto ? "Sí" : "No"]),
      `${activeCaseId}.xls`
    );
  };

  const uploadCaseDocumentInputId = "ucaprec-case-document-upload";
  const showCaseDocumentMessage = (title: string, message: string, variant: "info" | "danger" = "info") => {
    setDialog({
      title,
      message,
      variant,
      confirmLabel: "Aceptar",
      onConfirm: () => setDialog(null),
    });
  };

  const getCaseDocumentUrl = async (doc: typeof caseDocs[number]) => {
    if (!doc.ruta) {
      showCaseDocumentMessage("Documento no disponible", "Este documento no tiene una ruta de archivo asociada en Storage.", "danger");
      return "";
    }

    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.ruta, 60 * 5);
    if (error || !data?.signedUrl) {
      console.error("Error generando enlace del documento:", error);
      showCaseDocumentMessage("No se pudo abrir el documento", "No fue posible generar el enlace privado del archivo. Verifique que exista en Storage.", "danger");
      return "";
    }

    return data.signedUrl;
  };

  const previewCaseDocument = async (doc: typeof caseDocs[number]) => {
    const url = await getCaseDocumentUrl(doc);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadCaseDocument = async (doc: typeof caseDocs[number]) => {
    const url = await getCaseDocumentUrl(doc);
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = doc.nombre;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const uploadCaseDocument = async () => {
    if (!activeCaseId) return;
    if (!caseUploadFile) {
      showCaseDocumentMessage("Seleccione un archivo", "Debe seleccionar un archivo antes de subir el documento.", "danger");
      return;
    }

    const normalizedName = caseUploadFile.name.trim().toLowerCase();
    const duplicateInView = caseDocs.some(doc => doc.nombre.trim().toLowerCase() === normalizedName);
    if (duplicateInView) {
      showCaseDocumentMessage("Documento duplicado", "Ya existe un documento con esa misma nomenclatura en este expediente.", "danger");
      return;
    }

    const { data: duplicateRows, error: duplicateError } = await supabase
      .from("documentos")
      .select("id")
      .eq("numero_expediente", activeCaseId)
      .eq("nombre_archivo", caseUploadFile.name)
      .limit(1);

    if (duplicateError) {
      console.error("Error validando documento duplicado:", duplicateError);
      showCaseDocumentMessage("No se pudo validar el documento", "Intente nuevamente antes de subir el archivo.", "danger");
      return;
    }

    if ((duplicateRows ?? []).length > 0) {
      showCaseDocumentMessage("Documento duplicado", "Ya existe un documento con esa misma nomenclatura en este expediente.", "danger");
      return;
    }

    const ext = caseUploadFile.name.split(".").pop()?.toUpperCase() || "FILE";
    const storagePath = `${activeCaseId}/${Date.now()}-${caseUploadFile.name}`;
    const { error: storageError } = await supabase.storage.from("documentos").upload(storagePath, caseUploadFile, { upsert: false });
    if (storageError) {
      console.error("Error subiendo documento del expediente:", storageError);
      showCaseDocumentMessage("No se pudo subir el archivo", storageError.message, "danger");
      return;
    }
    const { error } = await supabase.from("documentos").insert({
      numero_expediente: activeCaseId,
      nombre_archivo: caseUploadFile.name,
      tipo_archivo: ext,
      peso: `${(caseUploadFile.size / 1024 / 1024).toFixed(2)} MB`,
      imputado: defs[0]?.nombre ?? "",
      descripcion: caseUploadDescription,
      subido_por: currentUser.username,
      version: 1,
      ruta_storage: storagePath,
    });
    if (error) {
      console.error("Error registrando documento del expediente:", error);
      await supabase.storage.from("documentos").remove([storagePath]);
      showCaseDocumentMessage("No se pudo registrar el documento", error.message, "danger");
      return;
    }
    setCaseDocs(prev => [{
      id: Date.now(),
      nombre: caseUploadFile.name,
      tipo: ext,
      peso: `${(caseUploadFile.size / 1024 / 1024).toFixed(2)} MB`,
      exp: activeCaseId,
      imputado: defs[0]?.nombre ?? "",
      descripcion: caseUploadDescription,
      subidoPor: currentUser.username,
      fecha: new Date().toLocaleString("es-DO"),
      version: 1,
      ruta: storagePath,
    }, ...prev]);
    setCaseUploadFile(null);
    setCaseUploadDescription("");
  };

  const confirmDeleteCaseDocument = (doc: typeof caseDocs[number]) => {
    setDialog({
      title: "Eliminar documento",
      message: `¿Está seguro que desea eliminar "${doc.nombre}"? Esta acción no se puede deshacer.`,
      variant: "danger",
      confirmLabel: "Sí, eliminar",
      cancelLabel: "Cancelar",
      onCancel: () => setDialog(null),
      onConfirm: async () => {
        const { error } = await supabase
          .from("documentos")
          .delete()
          .eq("numero_expediente", activeCaseId)
          .eq("nombre_archivo", doc.nombre);

        if (error) {
          console.error("Error eliminando documento del expediente:", error);
          showCaseDocumentMessage("No se pudo eliminar", error.message, "danger");
          return;
        }

        if (doc.ruta) {
          const { error: storageError } = await supabase.storage.from("documentos").remove([doc.ruta]);
          if (storageError) console.error("Error eliminando archivo de Storage:", storageError);
        }

        setCaseDocs(prev => prev.filter(item => item.id !== doc.id));
        setDialog(null);
      },
    });
  };

  if (!activeCaseId) {
    return (
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg p-10 flex flex-col items-center gap-4 text-center">
          <FileSearch size={36} className="text-muted-foreground opacity-40" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Seleccione un expediente</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Esta vista se completará cuando se abra un expediente real desde el listado.
            </p>
          </div>
          <Btn variant="secondary" icon={ArrowLeft} onClick={() => setView("cases")}>Volver a Expedientes</Btn>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setView("cases")} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              <FolderOpen size={12} /> Expedientes
            </button>
            <ChevronRight size={12} className="text-muted-foreground/40" />
            <span className="text-xs font-mono text-primary">{activeCaseId}</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            {isEdit ? "Editar Expediente" : "Detalle del Expediente"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCase ? `No. Sentencia ${activeCase.sentencia || "Sin sentencia"} — ${activeCase.delito || "Sin delito"}` : `Expediente seleccionado: ${activeCaseId}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {!isEdit && (
            <>
              <Btn variant="secondary" icon={FileSpreadsheet} size="sm" onClick={exportCaseCSV}>Exportar Excel</Btn>
              {canEditCases && <Btn icon={Edit2} size="sm" onClick={() => setView("case-form")}>Editar</Btn>}
            </>
          )}
          {isEdit && (
            <>
              <Btn variant="secondary" size="sm" onClick={handleCancelCaseEdit}>Cancelar</Btn>
              <Btn size="sm" icon={CheckCircle} onClick={handleSaveCaseEdit}>Guardar Cambios</Btn>
            </>
          )}
        </div>
      </div>

      {/* Status strip */}
      {!isEdit && (
        <div className="flex flex-wrap gap-3 mb-6 px-4 py-3 bg-card border border-border rounded-lg text-xs">
          {([["Estado Registro", <Badge label={activeCase?.estReg || "En Revisión"} />], ["Imputado Principal", <Badge label={activeCase?.estatus || "Sin estatus"} />],
            ["Alerta Roja", <BoolBadge v={measures.roja} />], ["Alert. Migratoria", <BoolBadge v={measures.migratoria} />],
            ["Orden Arresto", <BoolBadge v={measures.arresto} />], ["Subido a PN", <BoolBadge v={measures.policia} />],
            ["Asignado a", <span className="font-mono">{activeCase?.asignado || "Sin asignar"}</span>], ["Última mod.", <span className="font-mono">{formatDateTime(caseRecord?.updated_at, caseRecord?.created_at)}</span>]
          ] as [string, ReactNode][]).map(([l, v], i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-muted-foreground">{l}:</span>{v}
              {i < 7 && <span className="text-border ml-1">|</span>}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t}
              {i === 1 && <span className="ml-1.5 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{defs.length}</span>}
              {i === 2 && <span className="ml-1.5 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{vics.length}</span>}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Tab 0: General Data */}
          {tab === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="No. Expediente" value={generalEdit.numeroExpediente} onChange={v => updateGeneralEdit("numeroExpediente", v)} required />
              <Field label="Fecha de recepción" value={generalEdit.fechaRecepcion} onChange={v => updateGeneralEdit("fechaRecepcion", v)} type="date" required />
              <Field label="No. Sentencia / Resolución" value={generalEdit.sentencia} onChange={v => updateGeneralEdit("sentencia", v)} required />
              <Sel label="Tipo de Expediente" value={generalEdit.tipoExpediente} onChange={v => updateGeneralEdit("tipoExpediente", v)} options={TIPOS_EXPEDIENTE} required />
              <Field label="Jurisdicción" value={generalEdit.jurisdiccion} onChange={v => updateGeneralEdit("jurisdiccion", v)} required />
              <Sel label="Localidad de Jurisdicción" value={generalEdit.localidad} onChange={v => updateGeneralEdit("localidad", v)} options={JURISDICCIONES} />
              <Field label="Fecha de la Decisión" value={generalEdit.fechaDecision} onChange={v => updateGeneralEdit("fechaDecision", v)} type="date" required />
              <Sel label="Decisión" value={generalEdit.decision} onChange={v => updateGeneralEdit("decision", v)} options={DECISIONES} />
              <Sel label="Quién Interpone el Recurso" value={generalEdit.interpone} onChange={v => updateGeneralEdit("interpone", v)} options={QUIEN_INTERPONE} />
              <Sel label="Estado del Registro" value={generalEdit.estadoRegistro} onChange={v => updateGeneralEdit("estadoRegistro", v)} options={ESTADOS_REGISTRO} />
              <Sel label="Asignado a" value={generalEdit.asignado} onChange={v => updateGeneralEdit("asignado", v)} options={analystOptions} />
              <Field label="Creado por" value={firstText(caseRecord?.creado_por)} />
              <Field label="Fecha de Creación" value={formatDateTime(caseRecord?.created_at)} />
            </div>
          )}

          {/* Tab 1: Defendants — fully dynamic */}
          {tab === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Imputados registrados ({defs.length})</h3>
                {isEdit && <Btn variant="secondary" icon={Plus} size="sm" onClick={() => setShowDefModal(true)}>Agregar Imputado</Btn>}
              </div>

              {defs.map((d, idx) => (
                <div key={d.id} className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Imputado #{idx + 1}</span>
                      <Badge label={d.estadoImp} />
                    </div>
                    {isEdit && (
                      <button onClick={() => removeDef(d.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={12} /> Eliminar
                      </button>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Sel label="Tipo de Entidad" value={d.tipo} options={["Persona Física", "Persona Jurídica"]} onChange={value => updateDefField(d.id, "tipo", value)} />
                    <Field label="Nombre completo" value={d.nombre} required onChange={value => updateDefField(d.id, "nombre", value)} />
                    <Field label="Documento de Identidad" value={d.doc} required onChange={value => updateDefField(d.id, "doc", value)} />
                    <Field label="Edad" value={d.edad} type="number" onChange={value => updateDefField(d.id, "edad", value)} />
                    <Sel label="Sexo" value={d.sexo} options={SEXOS} onChange={value => updateDefField(d.id, "sexo", value)} />
                    <Sel label="Nacionalidad" value={d.nac} options={NACIONALIDADES} onChange={value => updateDefField(d.id, "nac", value)} />
                    <Sel label="Estatus del Imputado" value={d.estadoImp} options={ESTADOS_IMPUTADO} onChange={value => updateDefField(d.id, "estadoImp", value)} />
                    <Sel label="Estatus Judicial" value={d.estadoJud} options={ESTADOS_JUDICIALES} onChange={value => updateDefField(d.id, "estadoJud", value)} />
                    <Sel label="Centro Penitenciario" value={d.centro} options={["N/A", ...CENTROS_PENITENCIARIOS]} onChange={value => updateDefField(d.id, "centro", value)} />
                    <Field label="Pena Impuesta (años)" value={d.penaImp} type="number" onChange={value => updateDefField(d.id, "penaImp", value)} />
                    <Field label="Pena Privativa (años)" value={d.penaPriv} type="number" onChange={value => updateDefField(d.id, "penaPriv", value)} />
                    <Field label="Pena Suspendida (años)" value={d.penaSusp} type="number" onChange={value => updateDefField(d.id, "penaSusp", value)} />
                    <Field label="Indemnización (RD$)" value={d.indemnizacion} onChange={value => updateDefField(d.id, "indemnizacion", value)} />
                    <Field label="Garantía Económica (RD$)" value={d.garantia} onChange={value => updateDefField(d.id, "garantia", value)} />
                    <Field label="Multa (RD$)" value={d.multa} onChange={value => updateDefField(d.id, "multa", value)} />
                    <div className="sm:col-span-2 lg:col-span-3"><Field label="Decomiso" value={d.decomiso} onChange={value => updateDefField(d.id, "decomiso", value)} /></div>
                  </div>
                  <div className="border-t border-border px-4 py-3 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Medidas activas</p>
                    <div className="flex flex-wrap gap-4">
                      {([["Subido a Policía Nacional", d.subidoPN], ["Orden de Arresto", d.arresto], ["Alerta Roja", d.alertaRoja], ["Alerta Migratoria", d.alertaMig]] as [string, boolean][]).map(([l, v]) => (
                        <div key={l} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{l}:</span>
                          <BoolBadge v={v} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {defs.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <UserX size={32} className="opacity-30" />
                  <p className="text-sm">No hay imputados registrados.</p>
                  {isEdit && <Btn variant="secondary" icon={Plus} size="sm" onClick={() => setShowDefModal(true)}>Agregar Imputado</Btn>}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Victims — fully dynamic */}
          {tab === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Víctimas registradas ({vics.length})</h3>
                {isEdit && <Btn variant="secondary" icon={Plus} size="sm" onClick={() => setShowVicModal(true)}>Agregar Víctima</Btn>}
              </div>

              {vics.map((v, i) => (
                <div key={v.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Víctima #{i + 1}</span>
                    {isEdit && (
                      <button onClick={() => removeVic(v.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 size={12} /> Eliminar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Sel label="Tipo de Persona" value={v.tipo} options={["Persona Física", "Persona Jurídica"]} onChange={value => updateVicField(v.id, "tipo", value)} />
                    <Field label="Nombre / Razón Social" value={v.nombre} required onChange={value => updateVicField(v.id, "nombre", value)} />
                  </div>
                </div>
              ))}

              {vics.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Users size={32} className="opacity-30" />
                  <p className="text-sm">No hay víctimas registradas.</p>
                  {isEdit && <Btn variant="secondary" icon={Plus} size="sm" onClick={() => setShowVicModal(true)}>Agregar Víctima</Btn>}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Measures — toggleable state */}
          {tab === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { key: "arresto" as const, label: "Orden de Arresto", icon: Lock, color: "text-amber-600" },
                  { key: "roja" as const, label: "Alerta Roja (Interpol)", icon: AlertOctagon, color: "text-red-600" },
                  { key: "migratoria" as const, label: "Alerta Migratoria", icon: Globe, color: "text-indigo-600" },
                  { key: "policia" as const, label: "Subido a Policía Nacional", icon: Shield, color: "text-teal-600" },
                ]).map(({ key, label, icon: Icon, color }) => {
                  const active = measures[key];
                  return (
                    <div key={key} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${active ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10" : "border-border bg-muted/20"}`}>
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={color} />
                        <span className="text-sm font-medium text-foreground">{label}</span>
                      </div>
                      {isEdit ? (
                        <button onClick={() => toggleMeasure(key)}
                          className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${active ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"}`}>
                          {active ? "ACTIVA" : "INACTIVA"}
                        </button>
                      ) : (
                        <div className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${active ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"}`}>
                          {active ? "ACTIVA" : "INACTIVA"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="border border-border rounded-lg p-4">
                <Field label="Observaciones de medidas" type="textarea" value={caseMeasureNotes} onChange={setCaseMeasureNotes} />
              </div>
            </div>
          )}

          {/* Tab 4: Location */}
          {tab === 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Provincia</label>
                <select
                  disabled={!isEdit}
                  value={locationEdit.provincia}
                  onChange={event => setLocationEdit(prev => ({ ...prev, provincia: event.target.value, municipio: "", sector: "" }))}
                  className={inputCls}
                >
                  <option value="">Seleccione una provincia</option>
                  <option value="N/A">N/A</option>
                  {PROVINCIAS.map(provincia => <option key={provincia} value={provincia}>{provincia}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Municipio</label>
                <select
                  disabled={!isEdit}
                  value={locationEdit.municipio}
                  onChange={event => setLocationEdit(prev => ({ ...prev, municipio: event.target.value, sector: "" }))}
                  className={inputCls}
                >
                  <option value="">Seleccione un municipio</option>
                  <option value="N/A">N/A</option>
                  {locationMunicipios.map(municipio => <option key={municipio} value={municipio}>{municipio}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Sector</label>
                <select
                  disabled={!isEdit}
                  value={locationEdit.sector}
                  onChange={event => setLocationEdit(prev => ({ ...prev, sector: event.target.value }))}
                  className={inputCls}
                >
                  <option value="">Seleccione un sector</option>
                  <option value="N/A">N/A</option>
                  {locationSectores.filter(sector => sector !== "N/A").map(sector => <option key={sector} value={sector}>{sector}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Dirección Detallada" value={locationEdit.direccion} onChange={value => setLocationEdit(prev => ({ ...prev, direccion: value }))} type="textarea" />
              </div>
              <div>
                <label className={labelCls}>Delito Principal</label>
                <select
                  disabled={!isEdit}
                  value={locationEdit.delito}
                  onChange={event => setLocationEdit(prev => ({ ...prev, delito: event.target.value }))}
                  className={inputCls}
                >
                  <option value="">Seleccione un delito</option>
                  {INFRACCIONES.map(delito => <option key={delito} value={delito}>{delito}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Field label="Tipos Penales" value={locationEdit.tiposPenales} onChange={value => setLocationEdit(prev => ({ ...prev, tiposPenales: value }))} />
              </div>
            </div>
          )}

          {/* Tab 5: Documents */}
          {tab === 5 && (
            <div className="space-y-4">
              {isEdit && (
                <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 hover:border-primary/40 transition-colors">
                  <input
                    id={uploadCaseDocumentInputId}
                    type="file"
                    className="hidden"
                    onChange={event => setCaseUploadFile(event.target.files?.[0] ?? null)}
                  />
                  <Upload size={24} className="text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Arrastre documentos aquí o haga clic para seleccionar</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, JPG, PNG — Máx. 20MB por archivo</p>
                  </div>
                  {caseUploadFile && <p className="text-xs text-primary font-mono">{caseUploadFile.name}</p>}
                  <input
                    value={caseUploadDescription}
                    onChange={event => setCaseUploadDescription(event.target.value)}
                    className="w-full max-w-md px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground"
                    placeholder="Descripción del documento"
                  />
                  <div className="flex gap-2">
                    <Btn variant="secondary" size="sm" onClick={() => document.getElementById(uploadCaseDocumentInputId)?.click()}>Seleccionar archivo</Btn>
                    <Btn icon={Upload} size="sm" onClick={uploadCaseDocument}>Subir documento</Btn>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {caseDocs.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground border border-border rounded-lg">
                    <FileText size={28} className="opacity-30" />
                    <p className="text-sm">Todavía no hay documentos asociados a este expediente.</p>
                  </div>
                ) : caseDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border border-border rounded-lg hover:bg-muted/20 transition-colors">
                    <div className="w-9 h-9 rounded-md bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.nombre}</p>
                      <p className="text-xs text-muted-foreground">{doc.descripcion || "Sin descripción"} · {doc.peso} · Subido por {doc.subidoPor || "N/D"} el {doc.fecha}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => previewCaseDocument(doc)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Vista previa"><Eye size={14} /></button>
                      <button onClick={() => downloadCaseDocument(doc)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Descargar"><Download size={14} /></button>
                      {isEdit && <button onClick={() => confirmDeleteCaseDocument(doc)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors" title="Eliminar"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 6: Observations */}
          {tab === 6 && (
            <div className="space-y-4">
              <Field
                label="Observación general del caso"
                type="textarea"
                value={firstText(caseRecord?.observacion)}
              />
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial de Cambios</p>
                </div>
                {[
                  { u: firstText(caseRecord?.creado_por, activeCase?.asignado, "sistema"), a: `Creó o actualizó el expediente con ${defs.length} imputado(s), ${vics.length} víctima(s) y ${caseDocs.length} documento(s)`, t: formatDateTime(caseRecord?.updated_at, caseRecord?.created_at) },
                ].map((h, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-400 flex-shrink-0 mt-0.5">{h.u[0].toUpperCase()}</div>
                    <div>
                      <span className="text-xs font-mono text-primary">{h.u}</span>
                      <span className="text-xs text-foreground"> — {h.a}</span>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{h.t}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ActionDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        variant={dialog?.variant ?? "info"}
        confirmLabel={dialog?.confirmLabel ?? "Aceptar"}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />

      {/* ── Modal: Agregar Imputado ── */}
      {showDefModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-foreground">Agregar Imputado</h2>
              <button onClick={handleCancelAddDef}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedCaseId && (
                <div className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 px-4 py-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    El imputado se agregará al expediente <span className="font-mono font-semibold">{activeCaseId}</span>.
                  </p>
                </div>
              )}
              {([
                ["Tipo de Entidad", "tipo", "select", ["Persona Física", "Persona Jurídica"]],
                ["Nombre completo *", "nombre", "text"],
                ["Documento de Identidad *", "doc", "text"],
                ["Edad", "edad", "number"],
                ["Sexo", "sexo", "select", SEXOS],
                ["Nacionalidad", "nac", "select", NACIONALIDADES],
                ["Estatus del Imputado", "estadoImp", "select", ESTADOS_IMPUTADO],
                ["Estatus Judicial", "estadoJud", "select", ESTADOS_JUDICIALES],
                ["Centro Penitenciario", "centro", "select", ["N/A", ...CENTROS_PENITENCIARIOS]],
                ["Pena Impuesta (años)", "penaImp", "number"],
                ["Pena Privativa (años)", "penaPriv", "number"],
                ["Pena Suspendida (años)", "penaSusp", "number"],
                ["Indemnización (RD$)", "indemnizacion", "text"],
                ["Garantía Económica (RD$)", "garantia", "text"],
                ["Multa (RD$)", "multa", "text"],
              ] as [string, keyof Omit<DefEntry,"id">, string, string[]?][]).map(([lbl, fld, tp, opts]) => (
                <div key={fld}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">{lbl}</label>
                  {tp === "select"
                    ? <select value={String(newDef[fld] ?? "")} onChange={e => setNewDef(p => ({ ...p, [fld]: e.target.value }))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground">
                        <option value="">Seleccione una opción</option>
                        {(opts ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    : <input type={tp} value={String(newDef[fld] ?? "")} onChange={e => setNewDef(p => ({ ...p, [fld]: e.target.value }))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" />
                  }
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Decomiso</label>
                <input value={newDef.decomiso} onChange={e => setNewDef(p => ({ ...p, decomiso: e.target.value }))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Medidas activas</label>
                <div className="flex flex-wrap gap-4">
                  {([["Subido a PN", "subidoPN"], ["Orden de Arresto", "arresto"], ["Alerta Roja", "alertaRoja"], ["Alerta Migratoria", "alertaMig"]] as [string, keyof Omit<DefEntry,"id">][]).map(([lbl, fld]) => (
                    <label key={fld} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input type="checkbox" checked={Boolean(newDef[fld])} onChange={e => setNewDef(p => ({ ...p, [fld]: e.target.checked }))} className="rounded" />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5 sticky bottom-0 bg-card border-t border-border pt-4">
              <Btn variant="secondary" onClick={handleCancelAddDef}>Cancelar</Btn>
              <Btn icon={Plus} onClick={addDef}>Agregar Imputado</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Agregar Víctima ── */}
      {showVicModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Agregar Víctima</h2>
              <button onClick={() => setShowVicModal(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Tipo de Persona *</label>
                <select value={newVic.tipo} onChange={e => setNewVic(p => ({ ...p, tipo: e.target.value }))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground">
                  <option>Persona Física</option>
                  <option>Persona Jurídica</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Nombre / Razón Social *</label>
                <input value={newVic.nombre} onChange={e => setNewVic(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre completo o razón social" className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" />
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => setShowVicModal(false)}>Cancelar</Btn>
              <Btn icon={Plus} onClick={addVic}>Agregar Víctima</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Case View ───────────────────────────────────────────────────────────
function NewCaseView({ setView, currentUser }: { setView: (v: View) => void; currentUser: SessionUser }) {
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showDefModal, setShowDefModal] = useState(false);
  const [showVicModal, setShowVicModal] = useState(false);
  const [dialog, setDialog] = useState<null | {
    title: string;
    message: string;
    variant?: "info" | "danger";
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>(null);
  const [general, setGeneral] = useState({
    numeroExpediente: "",
    fechaRecepcion: "",
    sentencia: "",
    tipoExpediente: "",
    jurisdiccion: "",
    localidad: "",
    fechaDecision: "",
    decision: "",
    interpone: "",
    estadoRegistro: "",
    asignado: "",
    creadoPor: "",
    fechaCreacion: "",
  });
  const [defs, setDefs] = useState<DefEntry[]>([]);
  const [newDef, setNewDef] = useState<Omit<DefEntry, "id">>({ ...EMPTY_DEF });
  const [vics, setVics] = useState<VicEntry[]>([]);
  const [newVic, setNewVic] = useState({ tipo: "Persona Física", nombre: "" });
  const [measures, setMeasures] = useState({ arresto: false, roja: false, migratoria: false, policia: false });
  const [location, setLocation] = useState({ provincia: "", municipio: "", sector: "", direccion: "", delito: "", tiposPenales: "" });
  const [observation, setObservation] = useState("");
  const [measureObservation, setMeasureObservation] = useState("");
  const [analystOptions, setAnalystOptions] = useState<string[]>([]);
  const [newCaseFiles, setNewCaseFiles] = useState<File[]>([]);
  const newCaseFileInputId = "ucaprec-new-case-files";

  const municipios = useMemo(() => location.provincia ? getMunicipios(location.provincia) : [], [location.provincia]);
  const sectores = useMemo(() => (location.provincia && location.municipio) ? getSectores(location.provincia, location.municipio) : [], [location.provincia, location.municipio]);
  const tabs = ["Datos Generales", "Imputados", "Víctimas", "Medidas / Alertas", "Localización", "Documentos", "Observaciones"];
  const inputCls = 'w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/50';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider';

  const updateGeneral = (key: keyof typeof general, value: string) => setGeneral(prev => ({ ...prev, [key]: value }));
  const updateLocation = (key: keyof typeof location, value: string) => setLocation(prev => ({ ...prev, [key]: value }));
  const toggleMeasure = (k: keyof typeof measures) => setMeasures(prev => ({ ...prev, [k]: !prev[k] }));

  useEffect(() => {
    setGeneral(prev => ({
      ...prev,
      creadoPor: currentUser.username,
      fechaCreacion: new Date().toLocaleString("es-DO"),
    }));
  }, [currentUser.username]);

  useEffect(() => {
    let active = true;
    supabase
      .from("usuarios")
      .select("nombre_completo, usuario")
      .eq("rol", "Analista")
      .eq("estatus", "Activo")
      .order("nombre_completo", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        const names = (data ?? []).map(row => firstText(row.nombre_completo, row.usuario)).filter(Boolean);
        setAnalystOptions(names.length > 0 ? names : ["Analista UCAPREC"]);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasUnsavedNewCaseData = () => {
    const generalHasData = Object.values(general).some(v => String(v ?? "").trim() !== "");
    const locationHasData = Object.values(location).some(v => String(v ?? "").trim() !== "");
    const measuresHasData = Object.values(measures).some(Boolean);
    const observationHasData = observation.trim() !== "" || measureObservation.trim() !== "";
    const defsHasData = defs.length > 0;
    const vicsHasData = vics.length > 0;
    return generalHasData || locationHasData || measuresHasData || observationHasData || defsHasData || vicsHasData || newCaseFiles.length > 0;
  };

  const handleCancelNewCase = () => {
    if (!hasUnsavedNewCaseData()) {
      setView("cases");
      return;
    }

    setDialog({
      title: "Cancelar nuevo expediente",
      message: "Si cancela esta acción, se perderán los datos digitados del expediente.",
      variant: "danger",
      confirmLabel: "Sí, cancelar",
      cancelLabel: "Volver",
      onConfirm: () => {
        setDialog(null);
        setView("cases");
      },
      onCancel: () => setDialog(null),
    });
  };

  const handleSaveNewCase = async () => {
    if (!general.numeroExpediente.trim()) {
      setDialog({
        title: "Número de expediente requerido",
        message: "Para guardar el registro se necesita al menos el número de expediente, porque es el identificador único del caso.",
        variant: "info",
        confirmLabel: "Entendido",
        onConfirm: () => setDialog(null),
      });
      return;
    }

    setSaving(true);
    const caseNumber = general.numeroExpediente.trim();
    const payload = {
      numero_expediente: caseNumber,
      numero_sentencia: general.sentencia,
      tipo_expediente: general.tipoExpediente,
      jurisdiccion: general.jurisdiccion,
      localidad_jurisdiccion: general.localidad,
      fecha_recepcion: general.fechaRecepcion || null,
      fecha_decision: general.fechaDecision || null,
      decision: general.decision,
      quien_interpone: general.interpone,
      estado_registro: general.estadoRegistro || "En Revisión",
      asignado_a: general.asignado,
      creado_por: currentUser.username,
      provincia: location.provincia,
      municipio: location.municipio,
      sector: location.sector,
      direccion: location.direccion,
      delito_principal: location.delito,
      tipos_penales: location.tiposPenales,
      observacion: observation,
    };

    const { data: savedCase, error } = await supabase.from("expedientes").insert(payload).select().single();

    if (error) {
      setSaving(false);
      const unauthorized = error.message?.toLowerCase().includes("unauthorized") || error.message?.includes("401");
      setDialog({
        title: unauthorized ? "Supabase bloqueó el registro" : "No se pudo guardar el expediente",
        message: unauthorized
          ? "La tabla expedientes está rechazando la solicitud. Revise la llave pública y las políticas RLS para permitir insert/select desde el rol anon o autenticado."
          : error.message,
        variant: "danger",
        confirmLabel: "Entendido",
        onConfirm: () => setDialog(null),
      });
      return;
    }

    const savedCaseId = savedCase?.id;

    if (defs.length > 0) {
      await supabase.from("imputados").insert(defs.map(def => ({
        expediente_id: savedCaseId,
        numero_expediente: caseNumber,
        tipo_persona: def.tipo,
        nombre_completo: def.nombre,
        documento: def.doc,
        edad: def.edad ? Number(def.edad) : null,
        sexo: def.sexo,
        nacionalidad: def.nac,
        estado_imputado: def.estadoImp,
        estado_judicial: def.estadoJud,
        centro_penitenciario: def.centro,
        pena: def.penaImp ? `${def.penaImp} años` : "",
        pena_impuesta: def.penaImp ? Number(def.penaImp) : null,
        pena_privativa: def.penaPriv ? Number(def.penaPriv) : null,
        pena_suspendida: def.penaSusp ? Number(def.penaSusp) : null,
        indemnizacion: def.indemnizacion ? Number(String(def.indemnizacion).replace(/,/g, "")) : null,
        garantia: def.garantia ? Number(String(def.garantia).replace(/,/g, "")) : null,
        multa: def.multa ? Number(String(def.multa).replace(/,/g, "")) : null,
        decomiso: def.decomiso,
        alerta_roja: def.alertaRoja || measures.roja,
        alerta_migratoria: def.alertaMig || measures.migratoria,
        orden_arresto: def.arresto || measures.arresto,
        subido_a_pn: def.subidoPN || measures.policia,
      })));
    }

    if (vics.length > 0) {
      await supabase.from("victimas").insert(vics.map(vic => ({
        expediente_id: savedCaseId,
        numero_expediente: caseNumber,
        tipo_persona: vic.tipo,
        nombre_completo: vic.nombre,
        imputado_relacionado: defs[0]?.nombre ?? "",
        delito: location.delito,
      })));
    }

    if (newCaseFiles.length > 0) {
      for (const file of newCaseFiles) {
        const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
        const storagePath = `${caseNumber}/${Date.now()}-${file.name}`;
        const { error: storageError } = await supabase.storage.from("documentos").upload(storagePath, file, { upsert: false });
        if (storageError) {
          console.error("Error subiendo documento del nuevo expediente:", storageError);
          continue;
        }
        const { error: docError } = await supabase.from("documentos").insert({
          expediente_id: savedCaseId,
          numero_expediente: caseNumber,
          nombre_archivo: file.name,
          tipo_archivo: ext,
          peso: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          imputado: defs[0]?.nombre ?? "",
          descripcion: "Documento cargado al crear expediente",
          subido_por: currentUser.username,
          version: 1,
          ruta_storage: storagePath,
        });
        if (docError) {
          console.error("Error registrando documento del nuevo expediente:", docError);
          await supabase.storage.from("documentos").remove([storagePath]);
        }
      }
    }

    const activeMeasures = [
      measures.roja ? "Alerta Roja" : "",
      measures.migratoria ? "Alerta Migratoria" : "",
      measures.arresto ? "Orden de Arresto" : "",
      measures.policia ? "Subido a PN" : "",
    ].filter(Boolean);
    const measureTargets = defs.length > 0 ? defs : [{ ...EMPTY_DEF, nombre: "" }];
    if (activeMeasures.length > 0) {
      await supabase.from("medidas_alertas_expediente").insert(activeMeasures.flatMap(tipo =>
        measureTargets.map(def => ({
          expediente_id: savedCaseId,
          numero_expediente: caseNumber,
          tipo_medida: tipo,
          imputado: def.nombre,
          delito: location.delito,
          activada_por: currentUser.username,
          activa: true,
          observacion: measureObservation,
        }))
      ));
    }

    await logAuditEvent({
      usuario: currentUser.username,
      accion: "CREAR_EXPEDIENTE",
      modulo: "Expedientes",
      entidad: caseNumber,
      detalle: `Expediente creado con ${defs.length} imputado(s), ${vics.length} víctima(s) y ${newCaseFiles.length} documento(s).`,
      tipo: "create",
    });

    setSaving(false);

    setDialog({
      title: "Expediente registrado",
      message: `El expediente ${caseNumber} fue guardado correctamente.`,
      variant: "info",
      confirmLabel: "Volver a Expedientes",
      onConfirm: () => {
        setDialog(null);
        setView("cases");
      },
    });
  };

  const addDef = () => {
    if (!newDef.nombre.trim()) return;
    setDefs(prev => [...prev, { ...newDef, id: Date.now() }]);
    setNewDef({ ...EMPTY_DEF });
    setShowDefModal(false);
  };
  const removeDef = (id: number) => setDefs(prev => prev.filter(d => d.id !== id));
  const addVic = () => {
    if (!newVic.nombre.trim()) return;
    setVics(prev => [...prev, { id: Date.now(), ...newVic }]);
    setNewVic({ tipo: "Persona Física", nombre: "" });
    setShowVicModal(false);
  };
  const removeVic = (id: number) => setVics(prev => prev.filter(v => v.id !== id));

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setView("cases")} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              <FolderOpen size={12} /> Expedientes
            </button>
            <ChevronRight size={12} className="text-muted-foreground/40" />
            <span className="text-xs font-mono text-primary">Nuevo expediente</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>Nuevo Expediente</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Complete los datos para registrar un nuevo expediente.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Btn variant="secondary" size="sm" onClick={handleCancelNewCase}>Cancelar</Btn>
          <Btn size="sm" icon={CheckCircle} onClick={handleSaveNewCase}>{saving ? "Guardando..." : "Guardar Cambios"}</Btn>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t}
              {i === 1 && <span className="ml-1.5 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{defs.length}</span>}
              {i === 2 && <span className="ml-1.5 font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{vics.length}</span>}
            </button>
          ))}
        </div>
        <div className="p-6">
          <div className={tab === 0 ? "" : "hidden"}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div><label className={labelCls}>No. Expediente</label><input value={general.numeroExpediente} onChange={e => updateGeneral("numeroExpediente", e.target.value)} className={inputCls} placeholder="Digite el número recibido" /></div>
              <div><label className={labelCls}>Fecha de recepción</label><input type="date" value={general.fechaRecepcion} onChange={e => updateGeneral("fechaRecepcion", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>No. Sentencia / Resolución</label><input value={general.sentencia} onChange={e => updateGeneral("sentencia", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Tipo de Expediente</label><select value={general.tipoExpediente} onChange={e => updateGeneral("tipoExpediente", e.target.value)} className={inputCls}><option value="">Seleccione una opción</option>{TIPOS_EXPEDIENTE.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className={labelCls}>Jurisdicción</label><input value={general.jurisdiccion} onChange={e => updateGeneral("jurisdiccion", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Localidad de Jurisdicción</label><select value={general.localidad} onChange={e => updateGeneral("localidad", e.target.value)} className={inputCls}><option value="">Seleccione una opción</option>{JURISDICCIONES.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className={labelCls}>Fecha de la Decisión</label><input type="date" value={general.fechaDecision} onChange={e => updateGeneral("fechaDecision", e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Decisión</label><select value={general.decision} onChange={e => updateGeneral("decision", e.target.value)} className={inputCls}><option value="">Seleccione una opción</option>{DECISIONES.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className={labelCls}>Quién Interpone el Recurso</label><select value={general.interpone} onChange={e => updateGeneral("interpone", e.target.value)} className={inputCls}><option value="">Seleccione una opción</option>{QUIEN_INTERPONE.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className={labelCls}>Estado del Registro</label><select value={general.estadoRegistro} onChange={e => updateGeneral("estadoRegistro", e.target.value)} className={inputCls}><option value="">Seleccione una opción</option>{ESTADOS_REGISTRO.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className={labelCls}>Asignado a</label><select value={general.asignado} onChange={e => updateGeneral("asignado", e.target.value)} className={inputCls}><option value="">Seleccione una opción</option>{analystOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className={labelCls}>Creado por</label><input value={general.creadoPor} readOnly className={`${inputCls} opacity-75 cursor-default`} /></div>
              <div><label className={labelCls}>Fecha de Creación</label><input value={general.fechaCreacion} readOnly className={`${inputCls} opacity-75 cursor-default`} /></div>
            </div>
          </div>
          <div className={tab === 1 ? "" : "hidden"}>
            <div className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="font-medium text-foreground">Imputados registrados ({defs.length})</h3><Btn variant="secondary" icon={Plus} size="sm" onClick={() => setShowDefModal(true)}>Agregar Imputado</Btn></div>
              {defs.length === 0 ? <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground border border-border rounded-lg"><UserX size={32} className="opacity-30" /><p className="text-sm">No hay imputados registrados todavía.</p></div> : defs.map((d, idx) => <div key={d.id} className="border border-border rounded-lg overflow-hidden"><div className="bg-muted/30 px-4 py-2.5 border-b border-border flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-xs font-semibold text-foreground uppercase tracking-wider">Imputado #{idx + 1}</span>{d.estadoImp && <Badge label={d.estadoImp} />}</div><button onClick={() => removeDef(d.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={12} /> Eliminar</button></div><div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm"><div><span className="text-xs text-muted-foreground uppercase tracking-wider">Nombre</span><p className="mt-1 text-foreground">{d.nombre || '—'}</p></div><div><span className="text-xs text-muted-foreground uppercase tracking-wider">Documento</span><p className="mt-1 text-foreground">{d.doc || '—'}</p></div><div><span className="text-xs text-muted-foreground uppercase tracking-wider">Sexo</span><p className="mt-1 text-foreground">{d.sexo || '—'}</p></div></div></div>)}
            </div>
          </div>
          <div className={tab === 2 ? "" : "hidden"}>
            <div className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="font-medium text-foreground">Víctimas registradas ({vics.length})</h3><Btn variant="secondary" icon={Plus} size="sm" onClick={() => setShowVicModal(true)}>Agregar Víctima</Btn></div>
              {vics.length === 0 ? <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground border border-border rounded-lg"><Users size={32} className="opacity-30" /><p className="text-sm">No hay víctimas registradas todavía.</p></div> : vics.map((v, i) => <div key={v.id} className="border border-border rounded-lg p-4"><div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Víctima #{i + 1}</span><button onClick={() => removeVic(v.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={12} /> Eliminar</button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm"><div><span className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</span><p className="mt-1 text-foreground">{v.tipo}</p></div><div><span className="text-xs text-muted-foreground uppercase tracking-wider">Nombre / Razón Social</span><p className="mt-1 text-foreground">{v.nombre}</p></div></div></div>)}
            </div>
          </div>
          <div className={tab === 3 ? "" : "hidden"}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[{ key: "arresto" as const, label: "Orden de Arresto", icon: Lock, color: "text-amber-600" }, { key: "roja" as const, label: "Alerta Roja (Interpol)", icon: AlertOctagon, color: "text-red-600" }, { key: "migratoria" as const, label: "Alerta Migratoria", icon: Globe, color: "text-indigo-600" }, { key: "policia" as const, label: "Subido a Policía Nacional", icon: Shield, color: "text-teal-600" }].map(({ key, label, icon: Icon, color }) => { const active = measures[key]; return <div key={key} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${active ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10" : "border-border bg-muted/20"}`}><div className="flex items-center gap-3"><Icon size={18} className={color} /><span className="text-sm font-medium text-foreground">{label}</span></div><button onClick={() => toggleMeasure(key)} className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${active ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"}`}>{active ? "ACTIVA" : "INACTIVA"}</button></div>; })}</div>
              <div className="border border-border rounded-lg p-4"><label className={labelCls}>Observaciones de medidas</label><textarea rows={3} value={measureObservation} onChange={e => setMeasureObservation(e.target.value)} className={`${inputCls} resize-none`} placeholder="Escriba observaciones sobre las medidas o alertas..." /></div>
            </div>
          </div>
          <div className={tab === 4 ? "" : "hidden"}><div className="space-y-4"><div className="border border-border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><div><label className={labelCls}>Provincia</label><select value={location.provincia} onChange={e => setLocation(prev => ({ ...prev, provincia: e.target.value, municipio: "", sector: "" }))} className={inputCls}><option value="">Seleccione una provincia</option><option value="N/A">N/A</option>{PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}</select></div><div><label className={labelCls}>Municipio</label><select value={location.municipio} onChange={e => setLocation(prev => ({ ...prev, municipio: e.target.value, sector: "" }))} className={inputCls}><option value="">Seleccione un municipio</option><option value="N/A">N/A</option>{municipios.map(m => <option key={m} value={m}>{m}</option>)}</select></div><div><label className={labelCls}>Sector</label><select value={location.sector} onChange={e => updateLocation("sector", e.target.value)} className={inputCls}><option value="">Seleccione un sector</option><option value="N/A">N/A</option>{sectores.filter(s => s !== "N/A").map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="sm:col-span-2 lg:col-span-3"><label className={labelCls}>Dirección Detallada</label><textarea rows={2} value={location.direccion} onChange={e => updateLocation("direccion", e.target.value)} className={`${inputCls} resize-none`} /></div><div><label className={labelCls}>Delito Principal</label><select value={location.delito} onChange={e => updateLocation("delito", e.target.value)} className={inputCls}><option value="">Seleccione un delito</option>{INFRACCIONES.map(inf => <option key={inf} value={inf}>{inf}</option>)}</select></div><div className="sm:col-span-2"><label className={labelCls}>Tipos Penales (texto libre)</label><input value={location.tiposPenales} onChange={e => updateLocation("tiposPenales", e.target.value)} className={inputCls} /></div></div></div></div>
          <div className={tab === 5 ? "" : "hidden"}><div className="space-y-4"><div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 hover:border-primary/40 transition-colors"><input id={newCaseFileInputId} type="file" multiple className="hidden" onChange={e => setNewCaseFiles(Array.from(e.target.files ?? []))} /><Upload size={24} className="text-muted-foreground" /><div className="text-center"><p className="text-sm font-medium text-foreground">Arrastre documentos aquí o haga clic para seleccionar</p><p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, JPG, PNG — Máx. 20MB por archivo</p></div><Btn variant="secondary" size="sm" onClick={() => document.getElementById(newCaseFileInputId)?.click()}>Seleccionar archivos</Btn></div>{newCaseFiles.length === 0 ? <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground border border-border rounded-lg"><FileText size={28} className="opacity-30" /><p className="text-sm">Todavía no hay documentos asociados a este expediente.</p></div> : <div className="border border-border rounded-lg overflow-hidden">{newCaseFiles.map(file => <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"><FileText size={16} className="text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground truncate">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><button className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600" onClick={() => setNewCaseFiles(prev => prev.filter(item => item !== file))}><Trash2 size={14} /></button></div>)}</div>}</div></div>
          <div className={tab === 6 ? "" : "hidden"}><div className="space-y-4"><div><label className={labelCls}>Observación general del caso</label><textarea value={observation} onChange={e => setObservation(e.target.value)} rows={5} className={`${inputCls} resize-none`} placeholder="Escriba una observación general del expediente..." /></div><div className="border border-border rounded-lg overflow-hidden"><div className="bg-muted/30 px-4 py-2.5 border-b border-border"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial de Cambios</p></div><div className="px-4 py-10 text-center text-sm text-muted-foreground">Aún no hay historial para este nuevo expediente.</div></div></div></div>
        </div>
      </div>

      <ActionDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        variant={dialog?.variant ?? "info"}
        confirmLabel={dialog?.confirmLabel ?? "Aceptar"}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />

      {showDefModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10"><h2 className="font-semibold text-foreground">Agregar Imputado</h2><button onClick={() => setShowDefModal(false)}><X size={16} className="text-muted-foreground" /></button></div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">{([["Tipo de Entidad", "tipo", "select", ["Persona Física", "Persona Jurídica"]],["Nombre completo *", "nombre", "text"],["Documento de Identidad *", "doc", "text"],["Edad", "edad", "number"],["Sexo", "sexo", "select", SEXOS],["Nacionalidad", "nac", "select", NACIONALIDADES],["Estatus del Imputado", "estadoImp", "select", ESTADOS_IMPUTADO],["Estatus Judicial", "estadoJud", "select", ESTADOS_JUDICIALES],["Centro Penitenciario", "centro", "select", ["N/A", ...CENTROS_PENITENCIARIOS]]] as [string, keyof Omit<DefEntry,"id">, string, string[]?][]).map(([lbl, fld, tp, opts]) => <div key={fld}><label className={labelCls}>{lbl}</label>{tp === "select" ? <select value={String(newDef[fld] ?? "")} onChange={e => setNewDef(p => ({ ...p, [fld]: e.target.value }))} className={inputCls}><option value="">Seleccione una opción</option>{(opts ?? []).map(o => <option key={o} value={o}>{o}</option>)}</select> : <input type={tp} value={String(newDef[fld] ?? "")} onChange={e => setNewDef(p => ({ ...p, [fld]: e.target.value }))} className={inputCls} />}</div>)}</div>
            <div className="flex gap-2 justify-end px-6 pb-5 sticky bottom-0 bg-card border-t border-border pt-4"><Btn variant="secondary" onClick={() => setShowDefModal(false)}>Cancelar</Btn><Btn icon={Plus} onClick={addDef}>Agregar Imputado</Btn></div>
          </div>
        </div>
      )}

      {showVicModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border"><h2 className="font-semibold text-foreground">Agregar Víctima</h2><button onClick={() => setShowVicModal(false)}><X size={16} className="text-muted-foreground" /></button></div>
            <div className="p-6 space-y-4"><div><label className={labelCls}>Tipo de Persona *</label><select value={newVic.tipo} onChange={e => setNewVic(p => ({ ...p, tipo: e.target.value }))} className={inputCls}><option>Persona Física</option><option>Persona Jurídica</option></select></div><div><label className={labelCls}>Nombre / Razón Social *</label><input value={newVic.nombre} onChange={e => setNewVic(p => ({ ...p, nombre: e.target.value }))} className={inputCls} /></div></div>
            <div className="flex gap-2 justify-end px-6 pb-5"><Btn variant="secondary" onClick={() => setShowVicModal(false)}>Cancelar</Btn><Btn icon={Plus} onClick={addVic}>Agregar Víctima</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analytics View ───────────────────────────────────────────────────────────

function AnalyticsView() {
  const [cases, setCases] = useState<typeof recentCases>([]);
  const [users, setUsers] = useState<Array<{ usuario: string; nombre: string }>>([]);
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterAnalista, setFilterAnalista] = useState("Todos");

  useEffect(() => {
    let active = true;

    supabase
      .from("expedientes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando analítica operativa:", error);
          setCases([]);
          return;
        }
        setCases((data ?? []).map(mapExpedienteRow));
      });

    supabase
      .from("usuarios")
      .select("usuario,nombre_completo")
      .eq("estatus", "Activo")
      .order("nombre_completo", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setUsers((data ?? []).map(row => ({
          usuario: firstText(row.usuario),
          nombre: firstText(row.nombre_completo, row.usuario),
        })));
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return cases.filter(c => {
      if (filterTipo !== "Todos" && c.tipo !== filterTipo) return false;
      if (filterAnalista !== "Todos" && c.asignado !== filterAnalista) return false;
      if (filterDesde || filterHasta) {
        const [d, m, y] = c.fecha.split("/");
        const date = new Date(`${y}-${m}-${d}`);
        if (filterDesde && date < new Date(filterDesde)) return false;
        if (filterHasta && date > new Date(filterHasta)) return false;
      }
      return true;
    });
  }, [cases, filterDesde, filterHasta, filterTipo, filterAnalista]);

  const analystStats = useMemo(() => {
    const grouped = new Map<string, { analista: string; total: number; verificados: number; revision: number; alertas: number; ultimo: string }>();
    filtered.forEach(c => {
      const analista = c.asignado || "Sin asignar";
      const current = grouped.get(analista) ?? { analista, total: 0, verificados: 0, revision: 0, alertas: 0, ultimo: c.fecha || "—" };
      current.total += 1;
      if (c.estReg === "Verificado") current.verificados += 1;
      if (c.estReg === "En Revisión") current.revision += 1;
      if (c.alerta && c.alerta !== "—") current.alertas += 1;
      current.ultimo = c.fecha || current.ultimo;
      grouped.set(analista, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const monthlyByAnalyst = useMemo(() => {
    const months = new Map<string, Record<string, string | number>>();
    filtered.forEach(c => {
      const [d, m, y] = c.fecha.split("/");
      const key = y && m ? `${m}/${y}` : "Sin fecha";
      const row = months.get(key) ?? { mes: key };
      const analyst = c.asignado || "Sin asignar";
      row[analyst] = Number(row[analyst] ?? 0) + 1;
      months.set(key, row);
    });
    return Array.from(months.values()).reverse().slice(-12);
  }, [filtered]);

  const topThree = analystStats.slice(0, 3);
  const totalRegistros = filtered.length;
  const activeAnalysts = analystStats.filter(a => a.total > 0).length;
  const avgByAnalyst = activeAnalysts > 0 ? Math.round(totalRegistros / activeAnalysts) : 0;
  const verifiedRate = totalRegistros > 0 ? Math.round((filtered.filter(c => c.estReg === "Verificado").length / totalRegistros) * 100) : 0;
  const analystNames = analystStats.map(a => a.analista);
  const lineColors = ["#1D4ED8", "#059669", "#D97706", "#B91C1C", "#7C3AED", "#0F766E"];

  return (
    <div className="p-6">
      <SectionHeader
        title="Analítica Operativa"
        sub="Productividad y trazabilidad de registros por usuario"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" icon={FileSpreadsheet} size="sm" onClick={() => downloadExcel(
              ["Analista", "Casos", "Verificados", "En Revisión", "Alertas", "Último Caso"],
              analystStats.map(a => [a.analista, a.total, a.verificados, a.revision, a.alertas, a.ultimo]),
              "analitica-operativa.xls"
            )}>Exportar Excel</Btn>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 mb-6 px-4 py-3 bg-card border border-border rounded-lg">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Desde</label>
          <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[145px]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Hasta</label>
          <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[145px]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tipo de Expediente</label>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[160px]">
            <option value="Todos">Todos</option>
            {TIPOS_EXPEDIENTE.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Analista</label>
          <select value={filterAnalista} onChange={e => setFilterAnalista(e.target.value)} className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[180px]">
            <option value="Todos">Todos</option>
            {Array.from(new Set([...users.map(u => u.nombre), ...cases.map(c => c.asignado).filter(Boolean)])).map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        {(filterDesde || filterHasta || filterTipo !== "Todos" || filterAnalista !== "Todos") && (
          <button onClick={() => { setFilterDesde(""); setFilterHasta(""); setFilterTipo("Todos"); setFilterAnalista("Todos"); }} className="self-end text-xs text-primary hover:underline flex items-center gap-1 px-2 py-1.5">
            <X size={10} /> Limpiar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard label="Registros filtrados" value={totalRegistros} icon={FolderOpen} bg="bg-blue-50 dark:bg-blue-900/20" fg="text-blue-700 dark:text-blue-400" />
        <KPICard label="Analistas activos" value={activeAnalysts} icon={Users} bg="bg-teal-50 dark:bg-teal-900/20" fg="text-teal-700 dark:text-teal-400" />
        <KPICard label="Promedio por analista" value={avgByAnalyst} icon={BarChart2} bg="bg-violet-50 dark:bg-violet-900/20" fg="text-violet-700 dark:text-violet-400" />
        <KPICard label="Tasa verificada" value={`${verifiedRate}%`} icon={CheckCircle} bg="bg-emerald-50 dark:bg-emerald-900/20" fg="text-emerald-700 dark:text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold text-foreground text-sm mb-1">Línea de tiempo mensual por analista</h3>
          <p className="text-xs text-muted-foreground mb-4">Registros realizados o asignados por mes</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthlyByAnalyst} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {analystNames.slice(0, 6).map((name, index) => (
                <Line key={name} type="monotone" dataKey={name} stroke={lineColors[index % lineColors.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold text-foreground text-sm mb-1">Top 3 analistas</h3>
          <p className="text-xs text-muted-foreground mb-4">Mayor volumen de registros filtrados</p>
          <div className="space-y-3">
            {topThree.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No hay registros para mostrar.</div>
            ) : topThree.map((item, index) => (
              <div key={item.analista} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{item.analista}</p>
                  <p className="text-xs text-muted-foreground">{item.verificados} verificados · {item.revision} en revisión</p>
                </div>
                <span className="font-mono text-lg font-semibold text-foreground">{item.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking analistas */}
      <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Rendimiento por Analista</h3>
        </div>
        <Table
          headers={["Analista", "Casos Asignados", "Verificados", "En Revisión", "Alertas Activas", "Último Caso"]}
          rows={analystStats.map(a => [
            a.analista,
            <span className="font-mono">{a.total}</span>,
            <span className="font-mono text-emerald-600">{a.verificados}</span>,
            <span className="font-mono text-amber-600">{a.revision}</span>,
            <span className="font-mono text-red-600">{a.alertas}</span>,
            a.ultimo,
          ])}
        />
      </div>
    </div>
  );
}

// ─── Users View ───────────────────────────────────────────────────────────────

function UsersView() {
  const roleColors: Record<string, string> = {
    "Administrador": "bg-purple-100 text-purple-800 dark:bg-purple-900/25 dark:text-purple-400",
    "Supervisor": "bg-blue-100 text-blue-800 dark:bg-blue-900/25 dark:text-blue-400",
    "Analista": "bg-sky-100 text-sky-800 dark:bg-sky-900/25 dark:text-sky-400",
    "Consultor": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  };
  const permissionRows = [
    { key: "dashboard.view", label: "Dashboard — Ver", defaults: { Administrador: true, Supervisor: true, Analista: true, Consultor: true } },
    { key: "cases.create", label: "Expedientes — Crear", defaults: { Administrador: true, Supervisor: true, Analista: true, Consultor: false } },
    { key: "cases.edit", label: "Expedientes — Editar", defaults: { Administrador: true, Supervisor: true, Analista: true, Consultor: false } },
    { key: "cases.delete", label: "Expedientes — Eliminar", defaults: { Administrador: true, Supervisor: false, Analista: false, Consultor: false } },
    { key: "cases.export", label: "Expedientes — Exportar", defaults: { Administrador: true, Supervisor: true, Analista: true, Consultor: true } },
    { key: "cases.verify", label: "Expedientes — Verificar", defaults: { Administrador: true, Supervisor: true, Analista: false, Consultor: false } },
    { key: "defendants.measures", label: "Imputados — Gestionar medidas", defaults: { Administrador: true, Supervisor: true, Analista: true, Consultor: false } },
    { key: "documents.upload", label: "Documentos — Subir", defaults: { Administrador: true, Supervisor: true, Analista: true, Consultor: false } },
    { key: "documents.download", label: "Documentos — Descargar", defaults: { Administrador: true, Supervisor: true, Analista: true, Consultor: true } },
    { key: "reports.export", label: "Reportes — Exportar PDF/Excel", defaults: { Administrador: true, Supervisor: true, Analista: true, Consultor: false } },
    { key: "users.manage", label: "Usuarios — Gestionar", defaults: { Administrador: true, Supervisor: false, Analista: false, Consultor: false } },
    { key: "catalogs.manage", label: "Catálogos — Administrar", defaults: { Administrador: true, Supervisor: false, Analista: false, Consultor: false } },
    { key: "audit.view", label: "Auditoría — Ver", defaults: { Administrador: true, Supervisor: true, Analista: false, Consultor: false } },
    { key: "settings.access", label: "Configuración — Acceder", defaults: { Administrador: true, Supervisor: false, Analista: false, Consultor: false } },
  ] as const;
  type RoleName = "Administrador" | "Supervisor" | "Analista" | "Consultor";
  type PermissionKey = typeof permissionRows[number]["key"];
  type UserPermissionMap = Record<string, Partial<Record<PermissionKey, boolean>>>;

  type UserEntry = typeof usersData[0];
  const adminUserEntry: UserEntry = {
    id: 1,
    nombre: ADMIN_USER.name,
    usuario: ADMIN_USER.username,
    rol: ADMIN_USER.role,
    estatus: "Activo",
    acceso: "Sesión actual",
    casos: 0,
    email: ADMIN_USER.email,
  };
  const [users, setUsers] = useState<UserEntry[]>([adminUserEntry]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "new" | "view" | "edit" | "reset" | "delete">(null);
  const [selected, setSelected] = useState<UserEntry | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserEntry>>({});
  const [newPwd, setNewPwd] = useState({ pwd: "", confirm: "" });
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState("");
  const [selectedPermissionUser, setSelectedPermissionUser] = useState("");
  const [userPermissions, setUserPermissions] = useState<UserPermissionMap>({});
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [permissionsMessage, setPermissionsMessage] = useState("");
  const [dialog, setDialog] = useState<null | {
    title: string;
    message: string;
    variant?: "info" | "danger";
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("usuarios")
      .select("*")
      .limit(1000)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando usuarios:", error);
          setUsers([adminUserEntry]);
          return;
        }
        const mappedUsers = (data ?? []).map(mapUsuarioRow);
        setUsers(mappedUsers.length > 0 ? mappedUsers : [adminUserEntry]);
        setSelectedPermissionUser((mappedUsers[0] ?? adminUserEntry).usuario);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    supabase
      .from("configuracion_sistema")
      .select("valor")
      .eq("clave", "permisos_usuarios")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando permisos personalizados:", error);
          return;
        }
        if (data?.valor && typeof data.valor === "object" && !Array.isArray(data.valor)) {
          setUserPermissions(data.valor as UserPermissionMap);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.nombre.toLowerCase().includes(q) || u.usuario.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const openModal = (m: typeof modal, u?: UserEntry) => {
    setSelected(u || null);
    setEditForm(u ? { ...u } : {});
    setNewPwd({ pwd: "", confirm: "" });
    setResetError("");
    setModal(m);
  };

  const handleCancelResetModal = () => {
    const hasTypedPassword = newPwd.pwd.trim() !== "" || newPwd.confirm.trim() !== "";

    if (!hasTypedPassword) {
      setNewPwd({ pwd: "", confirm: "" });
      setSearch("");
      setModal(null);
      return;
    }

    setDialog({
      title: "Cancelar reseteo de contraseña",
      message: "Si cancela esta acción, se perderán los datos digitados de la nueva contraseña.",
      variant: "danger",
      confirmLabel: "Sí, cancelar",
      cancelLabel: "Volver",
      onConfirm: () => {
        setDialog(null);
        setNewPwd({ pwd: "", confirm: "" });
        setSearch("");
        setModal(null);
      },
      onCancel: () => setDialog(null),
    });
  };

  const saveEdit = () => {
    if (selected) setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, ...editForm } as UserEntry : u));
    setModal(null);
  };

  const resetUserPassword = async () => {
    if (!selected) return;
    setResetError("");

    if (newPwd.pwd.length < 8) {
      setResetError("La contraseña debe tener mínimo 8 caracteres.");
      return;
    }

    if (newPwd.pwd !== newPwd.confirm) {
      setResetError("Las contraseñas no coinciden.");
      return;
    }

    setResetSaving(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setResetSaving(false);
      setResetError("No se pudo validar la sesión actual. Cierre sesión e ingrese nuevamente.");
      return;
    }

    try {
      const response = await fetch("/.netlify/functions/reset-user-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: selected.email, password: newPwd.pwd }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "No fue posible restablecer la contraseña.");
      }

      setResetSaving(false);
      setModal(null);
      setNewPwd({ pwd: "", confirm: "" });
      setDialog({
        title: "Contraseña restablecida",
        message: `La contraseña de ${selected.usuario} fue actualizada exitosamente.`,
        variant: "info",
        confirmLabel: "Aceptar",
        onConfirm: () => setDialog(null),
      });
    } catch (error) {
      setResetSaving(false);
      setResetError(error instanceof Error ? error.message : "No fue posible restablecer la contraseña.");
    }
  };

  const toggleStatus = (u: UserEntry) => {
    setUsers(prev => prev.map(p => p.id === u.id ? { ...p, estatus: p.estatus === "Activo" ? "Inactivo" : "Activo" } : p));
  };

  const deleteUser = () => {
    if (selected) setUsers(prev => prev.filter(u => u.id !== selected.id));
    setModal(null);
  };

  const selectedPermissionEntry = users.find(u => u.usuario === selectedPermissionUser) ?? users[0] ?? adminUserEntry;
  const getRolePermission = (role: string, key: PermissionKey) => {
    const row = permissionRows.find(item => item.key === key);
    return Boolean(row?.defaults[role as RoleName]);
  };
  const getUserPermission = (user: UserEntry, key: PermissionKey) => {
    const customValue = userPermissions[user.usuario]?.[key];
    return typeof customValue === "boolean" ? customValue : getRolePermission(user.rol, key);
  };
  const savePermissions = async (nextPermissions: UserPermissionMap) => {
    setPermissionsSaving(true);
    setPermissionsMessage("");
    const { error } = await supabase
      .from("configuracion_sistema")
      .upsert({
        clave: "permisos_usuarios",
        valor: nextPermissions,
        updated_at: new Date().toISOString(),
      });

    setPermissionsSaving(false);
    if (error) {
      console.error("Error guardando permisos:", error);
      setPermissionsMessage("No se pudieron guardar los permisos. Revise las políticas de Supabase para configuración.");
      return false;
    }

    setPermissionsMessage("Permisos actualizados correctamente.");
    return true;
  };
  const toggleUserPermission = async (key: PermissionKey) => {
    if (!selectedPermissionEntry) return;
    const current = getUserPermission(selectedPermissionEntry, key);
    const nextPermissions: UserPermissionMap = {
      ...userPermissions,
      [selectedPermissionEntry.usuario]: {
        ...(userPermissions[selectedPermissionEntry.usuario] ?? {}),
        [key]: !current,
      },
    };

    setUserPermissions(nextPermissions);
    const saved = await savePermissions(nextPermissions);
    if (!saved) setUserPermissions(userPermissions);
  };
  const resetUserPermissionOverrides = async () => {
    if (!selectedPermissionEntry) return;
    const nextPermissions = { ...userPermissions };
    delete nextPermissions[selectedPermissionEntry.usuario];
    setUserPermissions(nextPermissions);
    const saved = await savePermissions(nextPermissions);
    if (!saved) setUserPermissions(userPermissions);
  };

  const inp = "w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground";
  const lbl = "block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider";

  return (
    <div className="p-6">
      <SectionHeader
        title="Usuarios y Control de Acceso"
        sub="Gestión de cuentas, roles y permisos del sistema"
        action={<Btn icon={Plus} onClick={() => openModal("new")}>Nuevo Usuario</Btn>}
      />

      {/* Roles summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { rol: "Administrador", desc: "Acceso total al sistema" },
          { rol: "Supervisor", desc: "Verificación y supervisión" },
          { rol: "Analista", desc: "Gestión de expedientes" },
          { rol: "Consultor", desc: "Solo lectura" },
        ].map(({ rol, desc }) => (
          <div key={rol} className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold font-mono text-foreground">{users.filter(u => u.rol === rol && u.estatus === "Activo").length}</div>
            <Badge label={rol} colorClass={roleColors[rol]} />
            <p className="text-xs text-muted-foreground mt-2">{desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              name="usuarios-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/60 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/60"
              placeholder="Buscar por nombre, usuario, email…"
            />
          </div>
          <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadExcel(
            ["Usuario", "Nombre", "Email", "Rol", "Estado", "Último Acceso"],
            filtered.map(u => [u.usuario, u.nombre, u.email, u.rol, u.estatus, u.acceso]),
            "usuarios.xls"
          )}>Exportar</Btn>
        </div>
        <Table
          headers={["Usuario", "Nombre Completo", "Email", "Rol", "Estado", "Último Acceso", "Casos", "Acciones"]}
          rows={filtered.map(u => [
            <span className="font-mono text-xs text-primary">{u.usuario}</span>,
            <span className="text-sm font-medium">{u.nombre}</span>,
            <span className="text-xs text-muted-foreground">{u.email}</span>,
            <Badge label={u.rol} colorClass={roleColors[u.rol]} />,
            <Badge label={u.estatus} />,
            <span className="font-mono text-xs text-muted-foreground">{u.acceso}</span>,
            <span className="font-mono text-xs">{u.casos || "—"}</span>,
            <div className="flex gap-1">
              <button title="Ver perfil" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" onClick={() => openModal("view", u)}><Eye size={13} /></button>
              <button title="Editar usuario" className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 transition-colors" onClick={() => openModal("edit", u)}><Edit2 size={13} /></button>
              <button title="Resetear contraseña" className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-muted-foreground hover:text-amber-600 transition-colors" onClick={() => openModal("reset", u)}><Lock size={13} /></button>
              <button title={u.estatus === "Activo" ? "Desactivar usuario" : "Activar usuario"}
                className={`p-1 rounded transition-colors ${u.estatus === "Activo" ? "hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-muted-foreground hover:text-emerald-600"}`}
                onClick={() => toggleStatus(u)}>
                {u.estatus === "Activo" ? <UserX size={13} /> : <UserCheck size={13} />}
              </button>
              <button title="Eliminar usuario" className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors" onClick={() => openModal("delete", u)}><Trash2 size={13} /></button>
            </div>
          ])}
        />
        <div className="px-4 pb-4 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground font-mono">{filtered.length} usuario(s)</span>
        </div>
      </div>

      <ActionDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        variant={dialog?.variant ?? "info"}
        confirmLabel={dialog?.confirmLabel ?? "Aceptar"}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />

      {/* Permissions matrix */}
      <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Matriz de Roles y Permisos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Control de acceso por módulo, rol y usuario seleccionado</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPermissionEntry.usuario}
              onChange={event => {
                setSelectedPermissionUser(event.target.value);
                setPermissionsMessage("");
              }}
              className="px-3 py-2 text-xs bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground min-w-[220px]"
            >
              {users.map(user => <option key={user.usuario} value={user.usuario}>{user.nombre} — {user.rol}</option>)}
            </select>
            <Btn variant="secondary" size="sm" icon={RefreshCw} onClick={resetUserPermissionOverrides}>
              Restablecer por rol
            </Btn>
          </div>
          {permissionsMessage && (
            <div className={`lg:col-span-2 text-xs rounded-md px-3 py-2 ${permissionsMessage.includes("correctamente") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {permissionsMessage}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] min-w-[200px]">Módulo / Acción</th>
                {["Administrador", "Supervisor", "Analista", "Consultor"].map(r => (
                  <th key={r} className="text-center py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{r}</th>
                ))}
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] min-w-[180px]">
                  {selectedPermissionEntry.usuario}
                </th>
              </tr>
            </thead>
            <tbody>
              {permissionRows.map((permission) => (
                <tr key={permission.key} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-2.5 px-4 text-foreground">{permission.label}</td>
                  {(["Administrador", "Supervisor", "Analista", "Consultor"] as RoleName[]).map((role) => {
                    const value = permission.defaults[role];
                    return (
                    <td key={role} className="py-2.5 px-4 text-center">
                      {value ? <CheckCircle size={14} className="text-emerald-600 mx-auto" /> : <X size={14} className="text-red-400 mx-auto" />}
                    </td>
                    );
                  })}
                  <td className="py-2.5 px-4 text-center">
                    <button
                      type="button"
                      disabled={permissionsSaving}
                      onClick={() => toggleUserPermission(permission.key)}
                      className={`inline-flex items-center justify-center gap-1.5 min-w-[118px] px-3 py-1.5 rounded-md border text-[11px] font-medium transition-colors disabled:opacity-60 ${
                        getUserPermission(selectedPermissionEntry, permission.key)
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      {getUserPermission(selectedPermissionEntry, permission.key) ? <CheckCircle size={12} /> : <X size={12} />}
                      {getUserPermission(selectedPermissionEntry, permission.key) ? "Permitido" : "Bloqueado"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Ver perfil ── */}
      {modal === "view" && selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Perfil de Usuario</h2>
              <button onClick={() => setModal(null)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  {selected.nombre.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">{selected.nombre}</p>
                  <p className="text-sm text-muted-foreground font-mono">@{selected.usuario}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[["Email", selected.email], ["Rol", selected.rol], ["Estado", selected.estatus], ["Último acceso", selected.acceso], ["Casos asignados", String(selected.casos || 0)]].map(([l, v]) => (
                  <div key={l} className="bg-muted/40 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{l}</p>
                    <p className="font-medium text-foreground text-xs">{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cerrar</Btn>
              <Btn icon={Edit2} onClick={() => openModal("edit", selected)}>Editar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar usuario ── */}
      {modal === "edit" && selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Editar Usuario — {selected.usuario}</h2>
              <button onClick={() => setModal(null)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {([["Nombre completo", "nombre", "text"], ["Email", "email", "email"]] as [string, keyof UserEntry, string][]).map(([l, f, t]) => (
                <div key={f} className="col-span-1">
                  <label className={lbl}>{l}</label>
                  <input type={t} value={String(editForm[f] ?? "")} onChange={e => setEditForm(p => ({ ...p, [f]: e.target.value }))} className={inp} />
                </div>
              ))}
              <div>
                <label className={lbl}>Rol</label>
                <select value={String(editForm.rol ?? "")} onChange={e => setEditForm(p => ({ ...p, rol: e.target.value }))} className={inp}>
                  {["Analista", "Supervisor", "Consultor", "Administrador"].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Estado</label>
                <select value={String(editForm.estatus ?? "")} onChange={e => setEditForm(p => ({ ...p, estatus: e.target.value }))} className={inp}>
                  <option>Activo</option><option>Inactivo</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn icon={CheckCircle} onClick={saveEdit}>Guardar Cambios</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Resetear contraseña ── */}
      {modal === "reset" && selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Resetear Contraseña</h2>
              <button onClick={handleCancelResetModal}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-400">Se enviará un correo a <strong>{selected.email}</strong> con la nueva contraseña temporal.</p>
              </div>
              <div>
                <label className={lbl}>Nueva contraseña temporal</label>
                <input type="password" value={newPwd.pwd} onChange={e => setNewPwd(p => ({ ...p, pwd: e.target.value }))} className={inp} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              </div>
              <div>
                <label className={lbl}>Confirmar contraseña</label>
                <input type="password" value={newPwd.confirm} onChange={e => setNewPwd(p => ({ ...p, confirm: e.target.value }))} className={inp} placeholder="Repita la contraseña" autoComplete="new-password" />
              </div>
              {newPwd.pwd && newPwd.confirm && newPwd.pwd !== newPwd.confirm && (
                <p className="text-xs text-red-600">Las contraseñas no coinciden.</p>
              )}
              {resetError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {resetError}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={handleCancelResetModal}>Cancelar</Btn>
              <Btn icon={Lock} onClick={resetUserPassword} variant="primary">{resetSaving ? "Guardando..." : "Restablecer Contraseña"}</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nuevo usuario ── */}
      {modal === "new" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Nuevo Usuario</h2>
              <button onClick={() => setModal(null)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[["Nombre", "text"], ["Apellido", "text"], ["Usuario", "text"], ["Email", "email"], ["Contraseña temporal", "password"], ["Confirmar contraseña", "password"]].map(([l, t]) => (
                <div key={l}>
                  <label className={lbl}>{l}<span className="text-red-500">*</span></label>
                  <input type={t} className={inp} />
                </div>
              ))}
              <div className="col-span-2">
                <label className={lbl}>Rol<span className="text-red-500">*</span></label>
                <select className={inp}><option>Analista</option><option>Supervisor</option><option>Consultor</option><option>Administrador</option></select>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn icon={Plus} onClick={() => setModal(null)}>Crear Usuario</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Eliminar usuario ── */}
      {modal === "delete" && selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><Trash2 size={18} className="text-red-600" /></div>
              <div><h3 className="font-semibold text-foreground">Eliminar Usuario</h3><p className="text-xs text-muted-foreground">{selected.nombre}</p></div>
            </div>
            <p className="text-sm text-foreground mb-6">Esta acción eliminará permanentemente el usuario y todos sus accesos al sistema.</p>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="danger" icon={Trash2} onClick={deleteUser}>Eliminar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Audit View ───────────────────────────────────────────────────────────────

function AuditView() {
  const typeColors: Record<string, string> = {
    create: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    update: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    export: "text-violet-600 bg-violet-50 dark:bg-violet-900/20",
    security: "text-red-600 bg-red-50 dark:bg-red-900/20",
  };

  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todas");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [auditRows, setAuditRows] = useState<typeof auditData>([]);

  const tipoMap: Record<string, string> = {
    "Crear": "create", "Editar": "update", "Exportar": "export", "Seguridad": "security"
  };

  useEffect(() => {
    let active = true;

    supabase
      .from("auditoria")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando auditoría:", error);
          setAuditRows([]);
          return;
        }
        setAuditRows((data ?? []).map(mapAuditRow));
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => auditRows.filter(r => {
    if (filterTipo !== "Todas" && r.tipo !== tipoMap[filterTipo]) return false;
    if (filterDesde || filterHasta) {
      const date = new Date(r.fecha);
      if (!Number.isNaN(date.getTime())) {
        if (filterDesde && date < new Date(filterDesde)) return false;
        if (filterHasta && date > new Date(`${filterHasta}T23:59:59`)) return false;
      }
    }
    if (search) {
      const q = search.toLowerCase();
      if (!r.usuario.toLowerCase().includes(q) && !r.accion.toLowerCase().includes(q) && !r.entidad.toLowerCase().includes(q) && !r.detalle.toLowerCase().includes(q) && !r.modulo.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [auditRows, search, filterTipo, filterDesde, filterHasta]);

  return (
    <div className="p-6">
      <SectionHeader
        title="Registro de Auditoría"
        sub="Trazabilidad completa de todas las acciones críticas del sistema"
        action={
          <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadExcel(
            ["#", "Usuario", "Acción", "Módulo", "Entidad", "Detalle", "IP", "Fecha"],
            filtered.map(r => [r.id, r.usuario, r.accion, r.modulo, r.entidad, r.detalle, r.ip, r.fecha]),
            "auditoria-log.xls"
          )}>Exportar Log</Btn>
        }
      />

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/60 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/60" placeholder="Buscar por usuario, acción, entidad…" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Todas", "Crear", "Editar", "Exportar", "Seguridad"].map(f => (
              <ChipFilter key={f} label={f} active={filterTipo === f} onClick={() => setFilterTipo(f)} />
            ))}
          </div>
          <div className="flex gap-2 items-end ml-auto">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Desde</label>
              <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[130px]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Hasta</label>
              <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[130px]" />
            </div>
          </div>
        </div>
        {(search || filterTipo !== "Todas" || filterDesde || filterHasta) && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
            <button onClick={() => { setSearch(""); setFilterTipo("Todas"); setFilterDesde(""); setFilterHasta(""); }} className="text-xs text-primary hover:underline flex items-center gap-1"><X size={10} /> Limpiar</button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["#", "Usuario", "Acción", "Módulo", "Entidad", "Detalle", "IP", "Fecha / Hora"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">No se encontraron registros con los filtros aplicados.</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{row.id}</td>
                  <td className="py-3 px-4 font-mono text-xs text-primary">{row.usuario}</td>
                  <td className="py-3 px-4"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium leading-none ${typeColors[row.tipo] || ""}`}>{row.accion}</span></td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{row.modulo}</td>
                  <td className="py-3 px-4 font-mono text-xs text-foreground">{row.entidad}</td>
                  <td className="py-3 px-4 text-xs text-foreground max-w-[240px]">{row.detalle}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">{row.ip}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{row.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground font-mono">{filtered.length} resultado(s)</span>
        </div>
      </div>
    </div>
  );
}

// ─── Defendants View ──────────────────────────────────────────────────────────

function DefendantsView({
  setView,
  openAddImputado,
  openEditImputado,
  openCase,
}: {
  setView: (v: View) => void;
  openAddImputado: (caseId: string) => void;
  openEditImputado: (caseId: string) => void;
  openCase: (caseId: string, mode?: "detail" | "form") => void;
}) {
  const [defs, setDefs] = useState<DefEntry[]>([]);
  const [caseOptions, setCaseOptions] = useState<typeof recentCases>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showSelectCaseForDef, setShowSelectCaseForDef] = useState(false);
  const [caseSearch, setCaseSearch] = useState("");
  const [selectedCaseForDef, setSelectedCaseForDef] = useState("");
  const [dialog, setDialog] = useState<null | {
    title: string;
    message: string;
    variant?: "info" | "danger";
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("imputados")
      .select("*")
      .limit(1000)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando imputados:", error);
          setDefs([]);
          return;
        }
        setDefs((data ?? []).map(mapImputadoRow));
      });

    supabase
      .from("expedientes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando expedientes para imputados:", error);
          setCaseOptions([]);
          return;
        }
        setCaseOptions((data ?? []).map(mapExpedienteRow));
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => defs.filter(d => {
    if (filterStatus !== "Todos" && d.estatus !== filterStatus) return false;
    const q = search.toLowerCase();
    if (q && !d.nombre.toLowerCase().includes(q) && !d.doc.includes(q) && !d.exp.toLowerCase().includes(q)) return false;
    return true;
  }), [defs, search, filterStatus]);

  const selectableCases = useMemo(() => {
    const q = caseSearch.toLowerCase().trim();
    if (!q) return caseOptions;
    return caseOptions.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.sentencia.toLowerCase().includes(q) ||
      c.imputado.toLowerCase().includes(q)
    );
  }, [caseOptions, caseSearch]);

  const sentenceByCase = useMemo(() => {
    return new Map(caseOptions.map(c => [c.id, c.sentencia]));
  }, [caseOptions]);

  const handleOpenAddDefFlow = () => {
    setCaseSearch("");
    setSelectedCaseForDef("");
    setShowSelectCaseForDef(true);
  };

  const handleContinueAddDefFlow = () => {
    const caseId = selectedCaseForDef.trim();
    if (!caseId) {
      setDialog({
        title: "Expediente requerido",
        message: "Debe seleccionar o escribir un número de expediente para continuar.",
        variant: "info",
        confirmLabel: "Entendido",
        onConfirm: () => setDialog(null),
      });
      return;
    }
    setShowSelectCaseForDef(false);
    openAddImputado(caseId);
  };

  const deleteDefendant = async () => {
    if (deleteId === null) return;
    const target = defs.find(d => d.id === deleteId);
    if (!target) return;

    const { error } = await supabase
      .from("imputados")
      .delete()
      .eq("numero_expediente", target.exp)
      .eq("nombre_completo", target.nombre);

    if (error) {
      console.error("Error eliminando imputado:", error);
      return;
    }

    setDefs(prev => prev.filter(d => d.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div className="p-6">
      <SectionHeader
        title="Gestión de Imputados"
        sub={`${filtered.length} de ${defs.length} imputados mostrados`}
        action={<Btn icon={Plus} onClick={handleOpenAddDefFlow}>Agregar Imputado</Btn>}
      />
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/60 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/60"
              placeholder="Buscar por nombre, cédula, expediente…" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["Todos", "Prófugo", "Rebeldía", "Recluido", "Libertad"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
          <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadExcel(
              ["Expediente", "No. Sentencia / Resolución", "Nombre", "Documento", "Sexo", "Estatus", "Est. Judicial"],
              filtered.map(d => [d.exp, sentenceByCase.get(d.exp) || "—", d.nombre, d.doc, d.sexo, d.estatus, d.estJud]),
              "imputados.xls"
            )}>Exportar</Btn>
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table
          columnClasses={[
            "min-w-[150px]",
            "min-w-[170px]",
            "min-w-[220px]",
            "min-w-[180px]",
            "w-[80px]",
            "w-[130px]",
            "w-[120px]",
            "w-[140px]",
            "w-[80px]",
            "w-[90px]",
            "w-[80px]",
            "w-[70px]",
            "w-[110px]",
          ]}
          headers={["Expediente", "No. Sentencia / Resolución", "Nombre", "Documento", "Edad", "Sexo", "Estatus", "Est. Judicial", "Alerta R.", "Alert. Mig.", "Arresto", "PN", "Acciones"]}
          rows={filtered.map(d => {
            const Chk = ({ v, cls }: { v: boolean; cls: string }) => (
              <span className={`w-5 h-5 flex items-center justify-center rounded-full ${v ? cls : "bg-muted text-muted-foreground"}`}>{v ? <CheckSquare size={10} /> : <X size={10} />}</span>
            );
            return [
              <span className="font-mono text-xs text-primary cursor-pointer hover:underline" onClick={() => openCase(d.exp)}>{d.exp}</span>,
              <span className="font-mono text-xs text-muted-foreground">{sentenceByCase.get(d.exp) || "—"}</span>,
              <span className="font-medium text-foreground text-sm">{d.nombre}</span>,
              <span className="font-mono text-xs text-muted-foreground">{d.doc}</span>,
              <span className="font-mono text-xs">{d.edad || "N/A"}</span>,
              <span className="text-xs text-muted-foreground">{d.sexo}</span>,
              <Badge label={d.estatus} />,
              <Badge label={d.estJud} />,
              <Chk v={d.alertaRoja} cls="bg-red-100 text-red-600 dark:bg-red-900/25" />,
              <Chk v={d.alertaMig} cls="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/25" />,
              <Chk v={d.ordenArresto} cls="bg-amber-100 text-amber-600 dark:bg-amber-900/25" />,
              <Chk v={d.policia} cls="bg-teal-100 text-teal-600 dark:bg-teal-900/25" />,
              <div className="flex gap-1">
                <button title="Ver expediente" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" onClick={() => openCase(d.exp)}><Eye size={13} /></button>
                <button title="Editar imputado" className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 transition-colors" onClick={() => openEditImputado(d.exp)}><Edit2 size={13} /></button>
                <button title="Eliminar imputado" className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors" onClick={() => setDeleteId(d.id)}><Trash2 size={13} /></button>
              </div>
            ];
          })}
        />
        <div className="px-4 pb-4 border-t border-border pt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">{filtered.length} resultado(s)</span>
          <Pagination total={filtered.length} />
        </div>
      </div>

      {showSelectCaseForDef && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-foreground">Seleccionar expediente</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Seleccione un número de expediente existente o escríbalo manualmente para continuar a la ventana de agregar imputado.
                </p>
              </div>
              <button onClick={() => setShowSelectCaseForDef(false)}>
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Buscar expediente</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={caseSearch}
                      onChange={e => setCaseSearch(e.target.value)}
                      placeholder="Buscar por expediente, sentencia o imputado…"
                      className="w-full pl-8 pr-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Expediente seleccionado</label>
                  <input
                    value={selectedCaseForDef}
                    onChange={e => setSelectedCaseForDef(e.target.value)}
                    placeholder="Escriba el número de expediente"
                    className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground"
                  />
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expedientes disponibles</p>
                  <span className="text-[11px] text-muted-foreground font-mono">{selectableCases.length} resultado(s)</span>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {selectableCases.length > 0 ? selectableCases.map(c => {
                    const active = selectedCaseForDef === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCaseForDef(c.id)}
                        className={`w-full text-left px-4 py-3 transition-colors ${active ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-muted/30"}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className={`font-mono text-xs ${active ? "text-primary" : "text-foreground"}`}>{c.id}</p>
                            <p className="text-sm text-foreground truncate mt-1">{c.imputado}</p>
                            <p className="text-xs text-muted-foreground mt-1 truncate">{c.sentencia} · {c.delito}</p>
                          </div>
                          <Badge label={c.estatus} />
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No se encontraron expedientes con ese criterio de búsqueda.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end px-6 py-4 border-t border-border bg-card">
              <Btn variant="secondary" onClick={() => setShowSelectCaseForDef(false)}>
                Cancelar
              </Btn>
              <Btn icon={Plus} onClick={handleContinueAddDefFlow}>
                Continuar
              </Btn>
            </div>
          </div>
        </div>
      )}

      <ActionDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        variant={dialog?.variant ?? "info"}
        confirmLabel={dialog?.confirmLabel ?? "Aceptar"}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />

      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Eliminar Imputado</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{defs.find(d => d.id === deleteId)?.nombre}</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-6">¿Está seguro que desea eliminar este imputado? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Btn>
              <Btn variant="danger" icon={Trash2} onClick={deleteDefendant}>Eliminar</Btn>
            </div>
          </div>
        </div>
      )}

      <ActionDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        variant={dialog?.variant ?? "info"}
        confirmLabel={dialog?.confirmLabel ?? "Aceptar"}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />
    </div>
  );
}

// ─── Victims View ─────────────────────────────────────────────────────────────

const victimasData = [
  { id: 1, nombre: "Luis Alberto Fernández Méndez", tipo: "Persona Física", exp: "EXP-2024-1847", imputado: "Carlos A. Méndez Ríos", delito: "Lavado de Activos", fecha: "28/11/2024" },
  { id: 2, nombre: "BANCORP S.A.", tipo: "Persona Jurídica", exp: "EXP-2024-1847", imputado: "Carlos A. Méndez Ríos", delito: "Lavado de Activos", fecha: "28/11/2024" },
  { id: 3, nombre: "Ministerio de Hacienda", tipo: "Persona Jurídica", exp: "EXP-2024-1846", imputado: "INVERSALUD S.A.", delito: "Fraude Fiscal", fecha: "27/11/2024" },
  { id: 4, nombre: "Carmen Rosa Suárez Villanueva", tipo: "Persona Física", exp: "EXP-2024-1845", imputado: "Rafael J. Guerrero Díaz", delito: "Homicidio", fecha: "26/11/2024" },
  { id: 5, nombre: "Transporte Colectivo del Norte S.A.", tipo: "Persona Jurídica", exp: "EXP-2024-1843", imputado: "Wilkins B. Castillo Luna", delito: "Estafa", fecha: "24/11/2024" },
  { id: 6, nombre: "Pedro Antonio Melo Baez", tipo: "Persona Física", exp: "EXP-2024-1843", imputado: "Wilkins B. Castillo Luna", delito: "Estafa", fecha: "24/11/2024" },
  { id: 7, nombre: "Inversiones y Comercio del Este S.R.L.", tipo: "Persona Jurídica", exp: "EXP-2024-1842", imputado: "Danilo F. Rosario Ureña", delito: "Robo Agravado", fecha: "23/11/2024" },
];

function VictimsView({ setView, currentUser }: { setView: (v: View) => void; currentUser: SessionUser }) {
  type VicRow = typeof victimasData[0] & { dbId?: string };
  const [vics, setVics] = useState<VicRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [modal, setModal] = useState<null | "new" | "edit" | "delete">(null);
  const [selected, setSelected] = useState<VicRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<VicRow>>({});
  const [newVic, setNewVic] = useState({ exp: "", tipo: "Persona Física", nombre: "", imputado: "", delito: "" });

  useEffect(() => {
    let active = true;

    supabase
      .from("victimas")
      .select("*")
      .limit(1000)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando víctimas:", error);
          setVics([]);
          return;
        }
        setVics((data ?? []).map((row, idx) => ({
          id: firstId(idx + 1, row.id, row.victima_id),
          dbId: firstText(row.id, row.victima_id),
          nombre: firstText(row.nombre_completo, row.nombre, row.razon_social),
          tipo: firstText(row.tipo_persona, row.tipo, "Persona Física"),
          exp: firstText(row.numero_expediente, row.expediente, row.expediente_id),
          imputado: firstText(row.imputado, row.imputado_relacionado, row.nombre_imputado),
          delito: firstText(row.delito, row.infraccion),
          fecha: formatDate(row.fecha_registro, row.created_at, row.fecha),
        })));
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => vics.filter(v => {
    if (filterTipo !== "Todos" && v.tipo !== filterTipo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!v.nombre.toLowerCase().includes(q) && !v.exp.toLowerCase().includes(q) && !v.imputado.toLowerCase().includes(q) && !v.delito.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [vics, filterTipo, search]);

  const inp = "w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground";
  const lbl = "block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider";

  const addVic = async () => {
    if (!newVic.nombre.trim() || !newVic.exp.trim()) return;
    const { error } = await supabase.from("victimas").insert({
      numero_expediente: newVic.exp,
      tipo_persona: newVic.tipo,
      nombre_completo: newVic.nombre,
      imputado: newVic.imputado,
      delito: newVic.delito,
    });
    if (error) {
      console.error("Error registrando víctima:", error);
      return;
    }
    await logAuditEvent({
      usuario: currentUser.username,
      accion: "CREAR_VICTIMA",
      modulo: "Víctimas",
      entidad: newVic.exp,
      detalle: `Víctima ${newVic.nombre} registrada en el expediente ${newVic.exp}.`,
      tipo: "create",
    });
    setVics(p => [...p, { id: Date.now(), ...newVic, fecha: new Date().toLocaleDateString("es-DO") }]);
    setNewVic({ exp: "", tipo: "Persona Física", nombre: "", imputado: "", delito: "" });
    setModal(null);
  };
  const saveEdit = async () => {
    if (!selected) return;
    const changesDetail = describeFieldChanges([
      { campo: "Expediente", antes: selected.exp, despues: editForm.exp },
      { campo: "Tipo", antes: selected.tipo, despues: editForm.tipo },
      { campo: "Nombre", antes: selected.nombre, despues: editForm.nombre },
      { campo: "Imputado relacionado", antes: selected.imputado, despues: editForm.imputado },
      { campo: "Delito", antes: selected.delito, despues: editForm.delito },
    ]);

    let query = supabase
      .from("victimas")
      .update({
        numero_expediente: editForm.exp,
        tipo_persona: editForm.tipo,
        nombre_completo: editForm.nombre,
        imputado: editForm.imputado,
        delito: editForm.delito,
      });

    query = selected.dbId
      ? query.eq("id", selected.dbId)
      : query.eq("numero_expediente", selected.exp).eq("nombre_completo", selected.nombre);

    const { data: updatedRows, error } = await query.select();

    if (error) {
      console.error("Error actualizando víctima:", error);
      return;
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.error("No se actualizó ninguna víctima. Verifique el identificador del registro.");
      return;
    }

    await logAuditEvent({
      usuario: currentUser.username,
      accion: "EDITAR_VICTIMA",
      modulo: "Víctimas",
      entidad: selected.exp,
      detalle: changesDetail,
      tipo: "update",
    });

    setVics(p => p.map(v => v.id === selected.id ? { ...v, ...editForm } as VicRow : v));
    setModal(null);
  };

  const deleteVictim = async () => {
    if (!selected) return;
    let query = supabase.from("victimas").delete();
    query = selected.dbId
      ? query.eq("id", selected.dbId)
      : query.eq("numero_expediente", selected.exp).eq("nombre_completo", selected.nombre);
    const { error } = await query;

    if (error) {
      console.error("Error eliminando víctima:", error);
      return;
    }

    await logAuditEvent({
      usuario: currentUser.username,
      accion: "ELIMINAR_VICTIMA",
      modulo: "Víctimas",
      entidad: selected.exp,
      detalle: `Víctima ${selected.nombre} eliminada del expediente ${selected.exp}.`,
      tipo: "security",
    });

    setVics(p => p.filter(v => v.id !== selected.id));
    setModal(null);
  };

  return (
    <div className="p-6">
      <SectionHeader
        title="Gestión de Víctimas"
        sub={`${filtered.length} de ${vics.length} víctimas registradas`}
        action={<Btn icon={Plus} onClick={() => { setModal("new"); setNewVic({ exp: "", tipo: "Persona Física", nombre: "", imputado: "", delito: "" }); }}>Registrar Víctima</Btn>}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard label="Total Víctimas" value={vics.length} icon={Users} bg="bg-blue-50 dark:bg-blue-900/20" fg="text-blue-700 dark:text-blue-400" />
        <KPICard label="Personas Físicas" value={vics.filter(v => v.tipo === "Persona Física").length} icon={Users} bg="bg-violet-50 dark:bg-violet-900/20" fg="text-violet-700 dark:text-violet-400" />
        <KPICard label="Personas Jurídicas" value={vics.filter(v => v.tipo === "Persona Jurídica").length} icon={Building2} bg="bg-teal-50 dark:bg-teal-900/20" fg="text-teal-700 dark:text-teal-400" />
      </div>

      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/60 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/60" placeholder="Buscar por nombre, expediente, imputado…" />
          </div>
          <div className="flex gap-1.5">
            {["Todos", "Persona Física", "Persona Jurídica"].map(t => (
              <ChipFilter key={t} label={t} active={filterTipo === t} onClick={() => setFilterTipo(t)} />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadExcel(
              ["Nombre", "Tipo", "Expediente", "Imputado", "Delito", "Fecha"],
              filtered.map(v => [v.nombre, v.tipo, v.exp, v.imputado, v.delito, v.fecha]),
              "victimas.xls"
            )}>Exportar Excel</Btn>
          </div>
        </div>
        {(search || filterTipo !== "Todos") && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
            <button onClick={() => { setSearch(""); setFilterTipo("Todos"); }} className="text-xs text-primary hover:underline flex items-center gap-1"><X size={10} /> Limpiar</button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Users size={28} className="opacity-30" />
            <p className="text-sm">No se encontraron víctimas con los filtros aplicados.</p>
          </div>
        ) : (
          <Table
            columnClasses={[
              "w-[70px]",
              "min-w-[220px]",
              "min-w-[140px]",
              "min-w-[170px]",
              "min-w-[180px]",
              "min-w-[160px]",
              "w-[110px]",
              "w-[110px]",
            ]}
            headers={["#", "Nombre / Razón Social", "Tipo", "Expediente", "Imputado Relacionado", "Delito", "Fecha Reg.", "Acciones"]}
            rows={filtered.map(v => [
              <span className="font-mono text-xs text-muted-foreground">{v.id}</span>,
              <span className="font-medium text-foreground text-sm">{v.nombre}</span>,
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono ${v.tipo === "Persona Física" ? "bg-violet-100 text-violet-800 dark:bg-violet-900/25 dark:text-violet-400" : "bg-teal-100 text-teal-800 dark:bg-teal-900/25 dark:text-teal-400"}`}>{v.tipo}</span>,
              <span className="font-mono text-xs text-primary cursor-pointer hover:underline" onClick={() => setView("case-detail")}>{v.exp}</span>,
              <span className="text-xs text-muted-foreground">{v.imputado}</span>,
              <span className="text-xs text-muted-foreground">{v.delito}</span>,
              <span className="font-mono text-xs text-muted-foreground">{v.fecha}</span>,
              <div className="flex gap-1">
                <button title="Ver expediente" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => setView("case-detail")}><Eye size={13} /></button>
                <button title="Editar" className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600" onClick={() => { setSelected(v); setEditForm({ ...v }); setModal("edit"); }}><Edit2 size={13} /></button>
                <button title="Eliminar" className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600" onClick={() => { setSelected(v); setModal("delete"); }}><Trash2 size={13} /></button>
              </div>
            ])}
          />
        )}
        <div className="px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground font-mono">{filtered.length} resultado(s)</span>
        </div>
      </div>

      {/* Modal nueva víctima */}
      {modal === "new" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Registrar Víctima</h2>
              <button onClick={() => setModal(null)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={lbl}>Expediente<span className="text-red-500">*</span></label><input value={newVic.exp} onChange={e => setNewVic(p => ({ ...p, exp: e.target.value }))} className={inp} placeholder="Ej. EXP-2024-1847" /></div>
              <div><label className={lbl}>Tipo de Persona<span className="text-red-500">*</span></label>
                <select value={newVic.tipo} onChange={e => setNewVic(p => ({ ...p, tipo: e.target.value }))} className={inp}>
                  <option>Persona Física</option><option>Persona Jurídica</option>
                </select>
              </div>
              <div><label className={lbl}>Nombre / Razón Social<span className="text-red-500">*</span></label><input value={newVic.nombre} onChange={e => setNewVic(p => ({ ...p, nombre: e.target.value }))} className={inp} placeholder="Nombre completo o razón social" /></div>
              <div><label className={lbl}>Delito relacionado</label><input value={newVic.delito} onChange={e => setNewVic(p => ({ ...p, delito: e.target.value }))} className={inp} placeholder="Ej. Lavado de Activos" /></div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn icon={Plus} onClick={addVic}>Guardar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar víctima */}
      {modal === "edit" && selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Editar Víctima</h2>
              <button onClick={() => setModal(null)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className={lbl}>Expediente</label><input value={String(editForm.exp ?? "")} onChange={e => setEditForm(p => ({ ...p, exp: e.target.value }))} className={inp} /></div>
              <div><label className={lbl}>Tipo de Persona</label>
                <select value={String(editForm.tipo ?? "")} onChange={e => setEditForm(p => ({ ...p, tipo: e.target.value }))} className={inp}>
                  <option>Persona Física</option><option>Persona Jurídica</option>
                </select>
              </div>
              <div><label className={lbl}>Nombre / Razón Social</label><input value={String(editForm.nombre ?? "")} onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))} className={inp} /></div>
              <div><label className={lbl}>Delito</label><input value={String(editForm.delito ?? "")} onChange={e => setEditForm(p => ({ ...p, delito: e.target.value }))} className={inp} /></div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn icon={CheckCircle} onClick={saveEdit}>Guardar Cambios</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {modal === "delete" && selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><Trash2 size={18} className="text-red-600" /></div>
              <div><h3 className="font-semibold text-foreground">Eliminar Víctima</h3><p className="text-xs text-muted-foreground">{selected.nombre}</p></div>
            </div>
            <p className="text-sm text-foreground mb-6">¿Está seguro que desea eliminar este registro? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn variant="danger" icon={Trash2} onClick={deleteVictim}>Eliminar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Measures & Alerts View ───────────────────────────────────────────────────

const measuresData = [
  { id: 1, tipo: "Alerta Roja", imputado: "Carlos A. Méndez Ríos", exp: "EXP-2024-1847", delito: "Lavado de Activos", activadaPor: "arodriguez", fecha: "28/11/2024", activa: true, obs: "Coordinación con Interpol confirmada" },
  { id: 2, tipo: "Alerta Migratoria", imputado: "Carlos A. Méndez Ríos", exp: "EXP-2024-1847", delito: "Lavado de Activos", activadaPor: "arodriguez", fecha: "28/11/2024", activa: true, obs: "Notificado a DGM el 28/11/2024" },
  { id: 3, tipo: "Orden de Arresto", imputado: "Carlos A. Méndez Ríos", exp: "EXP-2024-1847", delito: "Lavado de Activos", activadaPor: "msantos", fecha: "28/11/2024", activa: true, obs: "Emitida por 3er Jdo. de Instrucción D.N." },
  { id: 4, tipo: "Subido a PN", imputado: "Carlos A. Méndez Ríos", exp: "EXP-2024-1847", delito: "Lavado de Activos", activadaPor: "arodriguez", fecha: "28/11/2024", activa: true, obs: "Ficha enviada a PN el 28/11/2024" },
  { id: 5, tipo: "Alerta Migratoria", imputado: "INVERSALUD S.A.", exp: "EXP-2024-1846", delito: "Fraude Fiscal", activadaPor: "lpena", fecha: "27/11/2024", activa: true, obs: "Representante legal incluido en alerta" },
  { id: 6, tipo: "Orden de Arresto", imputado: "INVERSALUD S.A.", exp: "EXP-2024-1846", delito: "Fraude Fiscal", activadaPor: "lpena", fecha: "27/11/2024", activa: true, obs: "Orden emitida vs. representante legal" },
  { id: 7, tipo: "Orden de Arresto", imputado: "José M. Paulino Marte", exp: "EXP-2024-1844", delito: "Tráfico de Drogas", activadaPor: "arodriguez", fecha: "25/11/2024", activa: true, obs: "" },
  { id: 8, tipo: "Alerta Roja", imputado: "José M. Paulino Marte", exp: "EXP-2024-1844", delito: "Tráfico de Drogas", activadaPor: "arodriguez", fecha: "25/11/2024", activa: true, obs: "Interpol notificada por vía DNCD" },
  { id: 9, tipo: "Alerta Migratoria", imputado: "José M. Paulino Marte", exp: "EXP-2024-1844", delito: "Tráfico de Drogas", activadaPor: "arodriguez", fecha: "25/11/2024", activa: true, obs: "" },
  { id: 10, tipo: "Orden de Arresto", imputado: "Wilkins B. Castillo Luna", exp: "EXP-2024-1843", delito: "Estafa", activadaPor: "palvarez", fecha: "24/11/2024", activa: true, obs: "Orden emitida 2do Jdo. Instrucción Santiago" },
  { id: 11, tipo: "Subido a PN", imputado: "Wilkins B. Castillo Luna", exp: "EXP-2024-1843", delito: "Estafa", activadaPor: "palvarez", fecha: "24/11/2024", activa: true, obs: "" },
  { id: 12, tipo: "Alerta Migratoria", imputado: "Constructora REYMA S.R.L.", exp: "EXP-2024-1841", delito: "Malversación", activadaPor: "msantos", fecha: "22/11/2024", activa: false, obs: "Desactivada por error en expediente" },
];

function MeasuresView({ setView, currentUser }: { setView: (v: View) => void; currentUser: SessionUser }) {
  type MeasureEntry = typeof measuresData[0];
  const EMPTY_MEASURE: Omit<MeasureEntry, "id"> = {
    tipo: "Alerta Roja",
    imputado: "",
    exp: "",
    delito: "",
    activadaPor: "",
    fecha: "",
    activa: true,
    obs: "",
  };

  const [measures, setMeasures] = useState<MeasureEntry[]>([]);
  const [caseOptions, setCaseOptions] = useState<typeof recentCases>([]);
  const [defendantOptions, setDefendantOptions] = useState<DefEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterActiva, setFilterActiva] = useState("Activas");
  const [modalMode, setModalMode] = useState<null | "new" | "edit">(null);
  const [measureForm, setMeasureForm] = useState<Omit<MeasureEntry, "id">>({ ...EMPTY_MEASURE });
  const [initialMeasureForm, setInitialMeasureForm] = useState<Omit<MeasureEntry, "id">>({ ...EMPTY_MEASURE });
  const [caseLookupSearch, setCaseLookupSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<null | {
    title: string;
    message: string;
    variant?: "info" | "danger";
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("medidas_alertas_expediente")
      .select("*")
      .limit(1000)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando medidas y alertas:", error);
          setMeasures([]);
          return;
        }
        setMeasures((data ?? []).map((row, idx) => ({
          id: firstId(idx + 1, row.id, row.medida_id),
          tipo: firstText(row.tipo_medida, row.tipo_alerta, row.tipo, "Alerta Roja"),
          imputado: firstText(row.imputado, row.nombre_imputado),
          exp: firstText(row.numero_expediente, row.expediente, row.expediente_id),
          delito: firstText(row.delito, row.infraccion),
          activadaPor: firstText(row.activada_por, row.usuario, row.created_by),
          fecha: formatDate(row.fecha_activacion, row.fecha, row.created_at),
          activa: row.activa === undefined && row.estado === undefined ? true : firstBool(row.activa, row.estado === "Activa", row.estado === "activo"),
          obs: firstText(row.observacion, row.observaciones, row.descripcion),
        })));
      });

    supabase
      .from("expedientes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (active) setCaseOptions((data ?? []).map(mapExpedienteRow));
      });

    supabase
      .from("imputados")
      .select("*")
      .limit(1000)
      .then(({ data }) => {
        if (active) setDefendantOptions((data ?? []).map(mapImputadoRow));
      });

    return () => {
      active = false;
    };
  }, []);

  const tipoColors: Record<string, string> = {
    "Alerta Roja": "bg-red-100 text-red-800 dark:bg-red-900/25 dark:text-red-400",
    "Alerta Migratoria": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/25 dark:text-indigo-400",
    "Orden de Arresto": "bg-amber-100 text-amber-800 dark:bg-amber-900/25 dark:text-amber-400",
    "Subido a PN": "bg-teal-100 text-teal-800 dark:bg-teal-900/25 dark:text-teal-400",
  };

  const tipoIcons: Record<string, any> = {
    "Alerta Roja": AlertOctagon,
    "Alerta Migratoria": Globe,
    "Orden de Arresto": Lock,
    "Subido a PN": Shield,
  };

  const inputCls = "w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider";

  const openMeasureModal = (mode: "new" | "edit", measure?: MeasureEntry) => {
    if (mode === "edit" && measure) {
      const nextForm = {
        tipo: measure.tipo,
        imputado: measure.imputado,
        exp: measure.exp,
        delito: measure.delito,
        activadaPor: measure.activadaPor,
        fecha: measure.fecha,
        activa: measure.activa,
        obs: measure.obs,
      };
      setMeasureForm(nextForm);
      setInitialMeasureForm(nextForm);
      setEditingId(measure.id);
      setCaseLookupSearch(measure.exp);
      setModalMode("edit");
      return;
    }

    const currentDate = new Date().toLocaleDateString("es-DO");
    const nextForm = {
      ...EMPTY_MEASURE,
      activadaPor: currentUser.username,
      fecha: currentDate,
    };
    setMeasureForm(nextForm);
    setInitialMeasureForm(nextForm);
    setEditingId(null);
    setCaseLookupSearch("");
    setModalMode("new");
  };

  const isMeasureFormDirty = () => JSON.stringify(measureForm) !== JSON.stringify(initialMeasureForm);

  const closeMeasureModal = () => {
    if (!isMeasureFormDirty()) {
      setModalMode(null);
      setEditingId(null);
      return;
    }

    setDialog({
      title: modalMode === "edit" ? "Cancelar edición de medida" : "Cancelar registro de medida",
      message: modalMode === "edit"
        ? "Si cancela esta acción, se perderán los cambios realizados en la medida / alerta."
        : "Si cancela esta acción, se perderán los datos digitados de la medida / alerta.",
      variant: "danger",
      confirmLabel: "Sí, cancelar",
      cancelLabel: "Volver",
      onConfirm: () => {
        setDialog(null);
        setModalMode(null);
        setEditingId(null);
      },
      onCancel: () => setDialog(null),
    });
  };

  const selectedCasePreview = caseOptions.find(c => c.id === measureForm.exp);
  const selectedCaseDefendants = defendantOptions.filter(d => d.exp === measureForm.exp);
  const filteredMeasureCases = useMemo(() => {
    const q = caseLookupSearch.trim().toLowerCase();
    if (!q) return caseOptions;
    return caseOptions.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.sentencia.toLowerCase().includes(q) ||
      c.imputado.toLowerCase().includes(q) ||
      c.delito.toLowerCase().includes(q)
    );
  }, [caseOptions, caseLookupSearch]);

  const saveMeasure = async () => {
    if (!measureForm.exp.trim() || !measureForm.imputado.trim() || !measureForm.delito.trim() || !measureForm.activadaPor.trim()) {
      setDialog({
        title: "Datos requeridos",
        message: "Debe completar expediente, imputado, delito y activada por antes de guardar la medida.",
        variant: "info",
        confirmLabel: "Entendido",
        onConfirm: () => setDialog(null),
      });
      return;
    }

    if (modalMode === "edit" && editingId !== null) {
      const target = measures.find(m => m.id === editingId);
      if (target) {
        const { error } = await supabase
          .from("medidas_alertas_expediente")
          .update({
            numero_expediente: measureForm.exp,
            tipo_medida: measureForm.tipo,
            imputado: measureForm.imputado,
            delito: measureForm.delito,
            activada_por: measureForm.activadaPor,
            activa: measureForm.activa,
            observacion: measureForm.obs,
          })
          .eq("numero_expediente", target.exp)
          .eq("tipo_medida", target.tipo)
          .eq("imputado", target.imputado);

        if (error) {
          console.error("Error actualizando medida:", error);
          return;
        }
      }
      await logAuditEvent({
        usuario: currentUser.username,
        accion: "EDITAR_MEDIDA_ALERTA",
        modulo: "Medidas y Alertas",
        entidad: measureForm.exp,
        detalle: `${measureForm.tipo} actualizada para ${measureForm.imputado}.`,
        tipo: "update",
      });
      setMeasures(prev => prev.map(m => m.id === editingId ? { ...m, ...measureForm } : m));
    } else {
      const { error } = await supabase.from("medidas_alertas_expediente").insert({
        numero_expediente: measureForm.exp,
        tipo_medida: measureForm.tipo,
        imputado: measureForm.imputado,
        delito: measureForm.delito,
        activada_por: measureForm.activadaPor,
        activa: measureForm.activa,
        observacion: measureForm.obs,
      });
      if (error) {
        console.error("Error registrando medida:", error);
        return;
      }
      await logAuditEvent({
        usuario: currentUser.username,
        accion: "CREAR_MEDIDA_ALERTA",
        modulo: "Medidas y Alertas",
        entidad: measureForm.exp,
        detalle: `${measureForm.tipo} registrada para ${measureForm.imputado}.`,
        tipo: "create",
      });
      setMeasures(prev => [...prev, { id: Date.now(), ...measureForm }]);
    }

    setModalMode(null);
    setEditingId(null);
  };

  const confirmDeleteMeasure = (measure: MeasureEntry) => {
    setDialog({
      title: "Eliminar medida / alerta",
      message: `Se eliminará el registro ${measure.tipo} asociado al expediente ${measure.exp}. Esta acción no se puede deshacer.`,
      variant: "danger",
      confirmLabel: "Eliminar",
      cancelLabel: "Volver",
      onConfirm: async () => {
        const { error } = await supabase
          .from("medidas_alertas_expediente")
          .delete()
          .eq("numero_expediente", measure.exp)
          .eq("tipo_medida", measure.tipo)
          .eq("imputado", measure.imputado);

        if (error) {
          console.error("Error eliminando medida:", error);
          return;
        }

        await logAuditEvent({
          usuario: currentUser.username,
          accion: "ELIMINAR_MEDIDA_ALERTA",
          modulo: "Medidas y Alertas",
          entidad: measure.exp,
          detalle: `${measure.tipo} eliminada para ${measure.imputado}.`,
          tipo: "security",
        });

        setDialog(null);
        setMeasures(prev => prev.filter(m => m.id !== measure.id));
      },
      onCancel: () => setDialog(null),
    });
  };

  const filtered = useMemo(() => measures.filter(m => {
    if (filterTipo !== "Todos" && m.tipo !== filterTipo) return false;
    if (filterActiva === "Activas" && !m.activa) return false;
    if (filterActiva === "Inactivas" && m.activa) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.imputado.toLowerCase().includes(q) && !m.exp.toLowerCase().includes(q) && !m.delito.toLowerCase().includes(q) && !m.activadaPor.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [measures, filterTipo, filterActiva, search]);

  const countByType = (tipo: string) => measures.filter(m => m.tipo === tipo && m.activa).length;

  return (
    <div className="p-6">
      <SectionHeader
        title="Medidas Judiciales y Alertas"
        sub="Control operativo de todas las medidas activas por imputado"
        action={<Btn icon={Plus} onClick={() => openMeasureModal("new")}>Registrar Medida</Btn>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Alertas Rojas Activas", value: countByType("Alerta Roja"), icon: AlertOctagon, bg: "bg-red-50 dark:bg-red-900/20", fg: "text-red-700 dark:text-red-400" },
          { label: "Alertas Migratorias", value: countByType("Alerta Migratoria"), icon: Globe, bg: "bg-indigo-50 dark:bg-indigo-900/20", fg: "text-indigo-700 dark:text-indigo-400" },
          { label: "Órdenes de Arresto", value: countByType("Orden de Arresto"), icon: Lock, bg: "bg-amber-50 dark:bg-amber-900/20", fg: "text-amber-700 dark:text-amber-400" },
          { label: "Subidos a PN", value: countByType("Subido a PN"), icon: Shield, bg: "bg-teal-50 dark:bg-teal-900/20", fg: "text-teal-700 dark:text-teal-400" },
        ].map(k => (
          <KPICard key={k.label} label={k.label} value={k.value} icon={k.icon} bg={k.bg} fg={k.fg} />
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/60 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/60" placeholder="Buscar por imputado, expediente, delito…" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["Todos", "Alerta Roja", "Alerta Migratoria", "Orden de Arresto", "Subido a PN"].map(t => (
              <ChipFilter key={t} label={t} active={filterTipo === t} onClick={() => setFilterTipo(t)} />
            ))}
          </div>
          <div className="flex gap-1.5 border-l border-border pl-3">
            {["Activas", "Inactivas", "Todas"].map(a => (
              <ChipFilter key={a} label={a} active={filterActiva === a} onClick={() => setFilterActiva(a)} />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadExcel(
              ["Tipo", "Imputado", "Expediente", "Delito", "Activada por", "Fecha", "Estado"],
              filtered.map(m => [m.tipo, m.imputado, m.exp, m.delito, m.activadaPor, m.fecha, m.activa ? "Activa" : "Inactiva"]),
              "medidas.xls"
            )}>Exportar</Btn>
          </div>
        </div>
        {(search || filterTipo !== "Todos" || filterActiva !== "Activas") && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
            <button onClick={() => { setSearch(""); setFilterTipo("Todos"); setFilterActiva("Activas"); }} className="text-xs text-primary hover:underline flex items-center gap-1"><X size={10} /> Limpiar</button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <AlertOctagon size={28} className="opacity-30" />
            <p className="text-sm">No se encontraron medidas con los filtros aplicados.</p>
          </div>
        ) : (
          <Table
            headers={["Tipo de Medida", "Imputado", "Expediente", "Delito", "Activada por", "Fecha", "Estado", "Observación", "Acciones"]}
            rows={filtered.map(m => {
              const Icon = tipoIcons[m.tipo] || AlertOctagon;
              return [
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium font-mono ${tipoColors[m.tipo] || ""}`}><Icon size={10} />{m.tipo}</span>,
                <span className="text-sm font-medium text-foreground">{m.imputado}</span>,
                <span className="font-mono text-xs text-primary cursor-pointer hover:underline" onClick={() => setView("case-detail")}>{m.exp}</span>,
                <span className="text-xs text-muted-foreground">{m.delito}</span>,
                <span className="font-mono text-xs text-muted-foreground">{m.activadaPor}</span>,
                <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{m.fecha}</span>,
                m.activa
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-400"><CheckCircle size={10} />Activa</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"><X size={10} />Inactiva</span>,
                <span className="text-xs text-muted-foreground max-w-[140px] truncate" title={m.obs}>{m.obs || "—"}</span>,
                <div className="flex gap-1">
                  <button title="Ver expediente" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => setView("case-detail")}><Eye size={13} /></button>
                  <button title="Editar medida" className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600" onClick={() => openMeasureModal("edit", m)}><Edit2 size={13} /></button>
                  <button title="Eliminar registro" className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600" onClick={() => confirmDeleteMeasure(m)}><X size={13} /></button>
                </div>
              ];
            })}
          />
        )}
        <div className="px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground font-mono">{filtered.length} resultado(s)</span>
        </div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Mapa Operativo por Imputado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Imputado", "Expediente", "Alerta Roja", "Alert. Migratoria", "Orden Arresto", "Subido PN"].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(new Map(filtered.map(m => [m.imputado + m.exp, m])).values()).map((row, i) => {
                const related = measures.filter(m => m.imputado === row.imputado && m.exp === row.exp && m.activa);
                const has = (tipo: string) => related.some(x => x.tipo === tipo);
                const Chk = ({ v }: { v: boolean }) => v
                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-400 font-mono"><CheckCircle size={10} />Sí</span>
                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500 font-mono"><X size={10} />No</span>;
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-foreground text-sm">{row.imputado}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-primary cursor-pointer hover:underline" onClick={() => setView("case-detail")}>{row.exp}</td>
                    <td className="py-2.5 px-4"><Chk v={has("Alerta Roja")} /></td>
                    <td className="py-2.5 px-4"><Chk v={has("Alerta Migratoria")} /></td>
                    <td className="py-2.5 px-4"><Chk v={has("Orden de Arresto")} /></td>
                    <td className="py-2.5 px-4"><Chk v={has("Subido a PN")} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ActionDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        variant={dialog?.variant ?? "info"}
        confirmLabel={dialog?.confirmLabel ?? "Aceptar"}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />

      {modalMode !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">{modalMode === "edit" ? "Editar Medida / Alerta" : "Registrar Medida / Alerta"}</h2>
              <button onClick={closeMeasureModal}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Expediente<span className="text-red-500">*</span></label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={caseLookupSearch}
                    onChange={e => setCaseLookupSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground"
                    placeholder="Buscar por expediente, sentencia, imputado o delito"
                  />
                </div>
                <select value={measureForm.exp} onChange={e => {
                  const selected = caseOptions.find(c => c.id === e.target.value);
                  setMeasureForm(p => ({ ...p, exp: e.target.value, delito: selected?.delito ?? p.delito, imputado: "" }));
                }} className={inputCls}>
                  <option value="">Seleccione un expediente</option>
                  {filteredMeasureCases.map(c => <option key={c.id} value={c.id}>{c.id} - {c.sentencia || c.imputado || c.delito || "Sin referencia"}</option>)}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">{filteredMeasureCases.length} expediente(s) encontrado(s)</p>
              </div>
              {selectedCasePreview && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 px-4 py-3 text-xs">
                  <div className="font-semibold text-blue-900 dark:text-blue-200">{selectedCasePreview.id}</div>
                  <div className="mt-1 text-blue-800 dark:text-blue-300">{selectedCasePreview.delito || "Sin delito registrado"} · {selectedCasePreview.estReg || "Sin estado"}</div>
                  <div className="mt-1 text-blue-700 dark:text-blue-400">{selectedCaseDefendants.length} imputado(s) asociado(s)</div>
                </div>
              )}
              <div>
                <label className={labelCls}>Imputado<span className="text-red-500">*</span></label>
                <select value={measureForm.imputado} onChange={e => setMeasureForm(p => ({ ...p, imputado: e.target.value }))} className={inputCls}>
                  <option value="">Seleccione un imputado</option>
                  {selectedCaseDefendants.map(d => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tipo de Medida<span className="text-red-500">*</span></label>
                  <select value={measureForm.tipo} onChange={e => setMeasureForm(p => ({ ...p, tipo: e.target.value }))} className={inputCls}>
                    {["Alerta Roja", "Alerta Migratoria", "Orden de Arresto", "Subido a PN"].map(x => <option key={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <select value={measureForm.activa ? "Activa" : "Inactiva"} onChange={e => setMeasureForm(p => ({ ...p, activa: e.target.value === "Activa" }))} className={inputCls}>
                    <option>Activa</option>
                    <option>Inactiva</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Delito<span className="text-red-500">*</span></label>
                  <input value={measureForm.delito} onChange={e => setMeasureForm(p => ({ ...p, delito: e.target.value }))} className={inputCls} placeholder="Delito asociado" />
                </div>
                <div>
                  <label className={labelCls}>Activada por<span className="text-red-500">*</span></label>
                  <input value={measureForm.activadaPor} readOnly className={`${inputCls} opacity-75 cursor-default`} placeholder="Usuario responsable" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Fecha</label>
                <input value={measureForm.fecha} onChange={e => setMeasureForm(p => ({ ...p, fecha: e.target.value }))} className={inputCls} placeholder="dd/mm/yyyy" />
              </div>
              <div>
                <label className={labelCls}>Observación</label>
                <textarea rows={3} value={measureForm.obs} onChange={e => setMeasureForm(p => ({ ...p, obs: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Detalles de la medida…" />
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={closeMeasureModal}>Cancelar</Btn>
              <Btn icon={CheckCircle} onClick={saveMeasure}>{modalMode === "edit" ? "Guardar Cambios" : "Activar Medida"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Documents View ───────────────────────────────────────────────────────────

const docsData = [
  { id: 1, nombre: "Sentencia_SCJ_0892_2024.pdf", tipo: "PDF", peso: "2.4 MB", exp: "EXP-2024-1847", imputado: "Carlos A. Méndez Ríos", descripcion: "Sentencia condenatoria SCJ", subidoPor: "arodriguez", fecha: "28/11/2024 09:44", version: 1 },
  { id: 2, nombre: "Orden_Arresto_JDO3_2024.pdf", tipo: "PDF", peso: "0.8 MB", exp: "EXP-2024-1847", imputado: "Carlos A. Méndez Ríos", descripcion: "Orden de arresto emitida", subidoPor: "msantos", fecha: "28/11/2024 10:12", version: 1 },
  { id: 3, nombre: "Informe_UIFE_Activos.docx", tipo: "DOCX", peso: "1.2 MB", exp: "EXP-2024-1847", imputado: "Carlos A. Méndez Ríos", descripcion: "Informe pericial económico UIFE", subidoPor: "arodriguez", fecha: "29/11/2024 08:30", version: 2 },
  { id: 4, nombre: "Sentencia_TC_0441_2024.pdf", tipo: "PDF", peso: "1.9 MB", exp: "EXP-2024-1846", imputado: "INVERSALUD S.A.", descripcion: "Sentencia condenatoria TC", subidoPor: "lpena", fecha: "27/11/2024 14:55", version: 1 },
  { id: 5, nombre: "Balance_INVERSALUD_2022.xlsx", tipo: "XLSX", peso: "3.1 MB", exp: "EXP-2024-1846", imputado: "INVERSALUD S.A.", descripcion: "Balance contable auditado", subidoPor: "lpena", fecha: "27/11/2024 15:20", version: 1 },
  { id: 6, nombre: "Autopsia_Guerrero_2024.pdf", tipo: "PDF", peso: "4.7 MB", exp: "EXP-2024-1845", imputado: "Rafael J. Guerrero Díaz", descripcion: "Informe médico forense", subidoPor: "msantos", fecha: "26/11/2024 11:05", version: 1 },
  { id: 7, nombre: "Sentencia_1JPEN_0211.pdf", tipo: "PDF", peso: "1.4 MB", exp: "EXP-2024-1845", imputado: "Rafael J. Guerrero Díaz", descripcion: "Sentencia penal de instancia", subidoPor: "msantos", fecha: "26/11/2024 10:40", version: 1 },
  { id: 8, nombre: "Acta_Decomiso_Castillo.pdf", tipo: "PDF", peso: "0.6 MB", exp: "EXP-2024-1843", imputado: "Wilkins B. Castillo Luna", descripcion: "Acta notarial de decomiso", subidoPor: "palvarez", fecha: "24/11/2024 17:10", version: 1 },
];

const tipoDocIcon = (tipo: string) => {
  if (tipo === "PDF") return "text-red-600 bg-red-50 dark:bg-red-900/20";
  if (tipo === "DOCX") return "text-blue-600 bg-blue-50 dark:bg-blue-900/20";
  if (tipo === "XLSX") return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20";
  return "text-slate-600 bg-slate-100";
};

function DocumentsView({ setView, currentUser }: { setView: (v: View) => void; currentUser: SessionUser }) {
  type DocRow = typeof docsData[0] & { ruta?: string };
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [caseOptions, setCaseOptions] = useState<typeof recentCases>([]);
  const [uploadForm, setUploadForm] = useState({ exp: "", descripcion: "", fileName: "" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaseSearch, setUploadCaseSearch] = useState("");
  const [uploadCasePickerOpen, setUploadCasePickerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; type: string } | null>(null);
  const [dialog, setDialog] = useState<null | {
    title: string;
    message: string;
    variant?: "info" | "danger";
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("documentos")
      .select("*")
      .limit(1000)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando documentos:", error);
          setDocs([]);
          return;
        }
        setDocs((data ?? []).map((row, idx) => ({
          id: firstId(idx + 1, row.id, row.documento_id),
          nombre: firstText(row.nombre_archivo, row.nombre, row.filename, row.titulo),
          tipo: firstText(row.tipo_archivo, row.tipo, row.extension).toUpperCase(),
          peso: firstText(row.peso, row.tamano, row.size),
          exp: firstText(row.numero_expediente, row.expediente, row.expediente_id),
          imputado: firstText(row.imputado, row.nombre_imputado),
          descripcion: firstText(row.descripcion, row.observacion),
          subidoPor: firstText(row.subido_por, row.usuario, row.created_by),
          fecha: formatDateTime(row.fecha_subida, row.fecha, row.created_at),
          version: firstId(1, row.version),
          ruta: firstText(row.ruta_storage, row.storage_path, row.path),
        })));
      });

    supabase
      .from("expedientes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (active) setCaseOptions((data ?? []).map(mapExpedienteRow));
      });

    return () => {
      active = false;
    };
  }, []);

  const uploadInputId = "ucaprec-document-file";

  const uploadCaseOptions = useMemo(() => {
    const q = uploadCaseSearch.trim().toLowerCase();
    if (!q) return caseOptions;
    return caseOptions.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.sentencia.toLowerCase().includes(q) ||
      c.imputado.toLowerCase().includes(q) ||
      c.delito.toLowerCase().includes(q)
    );
  }, [caseOptions, uploadCaseSearch]);

  const selectedUploadCase = useMemo(
    () => caseOptions.find(c => c.id === uploadForm.exp),
    [caseOptions, uploadForm.exp]
  );

  const showDocumentMessage = (title: string, message: string, variant: "info" | "danger" = "info") => {
    setDialog({
      title,
      message,
      variant,
      confirmLabel: "Aceptar",
      onConfirm: () => setDialog(null),
    });
  };

  const getDocumentUrl = async (doc: DocRow) => {
    if (!doc.ruta) {
      showDocumentMessage("Documento no disponible", "Este documento no tiene una ruta de archivo asociada en Storage.", "danger");
      return "";
    }

    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.ruta, 60 * 5);
    if (error || !data?.signedUrl) {
      console.error("Error generando enlace del documento:", error);
      showDocumentMessage("No se pudo abrir el documento", "No fue posible generar el enlace privado del archivo. Verifique que exista en Storage.", "danger");
      return "";
    }

    return data.signedUrl;
  };

  const previewDocument = async (doc: DocRow) => {
    const url = await getDocumentUrl(doc);
    if (url) setPreviewDoc({ url, name: doc.nombre, type: doc.tipo });
  };

  const downloadDocument = async (doc: DocRow) => {
    const url = await getDocumentUrl(doc);
    if (!url) return;
    const response = await fetch(url);
    if (!response.ok) {
      showDocumentMessage("No se pudo descargar", "El archivo no pudo descargarse desde Storage.", "danger");
      return;
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = doc.nombre;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const handleUploadDocument = async () => {
    if (!uploadForm.exp) {
      showDocumentMessage("Seleccione un expediente", "Debe seleccionar el expediente asociado antes de subir el documento.", "danger");
      return;
    }

    if (!uploadFile) {
      showDocumentMessage("Seleccione un archivo", "Debe seleccionar un archivo antes de subir el documento.", "danger");
      return;
    }

    const fileName = uploadFile.name;
    const normalizedName = fileName.trim().toLowerCase();
    const duplicateInView = docs.some(doc => doc.exp === uploadForm.exp && doc.nombre.trim().toLowerCase() === normalizedName);
    if (duplicateInView) {
      showDocumentMessage("Documento duplicado", "Ya existe un documento con esa misma nomenclatura para el expediente seleccionado.", "danger");
      return;
    }

    const { data: duplicateRows, error: duplicateError } = await supabase
      .from("documentos")
      .select("id")
      .eq("numero_expediente", uploadForm.exp)
      .eq("nombre_archivo", fileName)
      .limit(1);

    if (duplicateError) {
      console.error("Error validando documento duplicado:", duplicateError);
      showDocumentMessage("No se pudo validar el documento", "Intente nuevamente antes de subir el archivo.", "danger");
      return;
    }

    if ((duplicateRows ?? []).length > 0) {
      showDocumentMessage("Documento duplicado", "Ya existe un documento con esa misma nomenclatura para el expediente seleccionado.", "danger");
      return;
    }

    const ext = fileName.split(".").pop()?.toUpperCase() || "FILE";
    const selectedCase = caseOptions.find(c => c.id === uploadForm.exp);
    const storagePath = `${uploadForm.exp}/${Date.now()}-${fileName}`;
    const { error: storageError } = await supabase.storage.from("documentos").upload(storagePath, uploadFile, { upsert: false });
    if (storageError) {
      console.error("Error subiendo documento:", storageError);
      showDocumentMessage("No se pudo subir el archivo", storageError.message, "danger");
      return;
    }
    const { error } = await supabase.from("documentos").insert({
      numero_expediente: uploadForm.exp,
      nombre_archivo: fileName,
      tipo_archivo: ext,
      peso: `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB`,
      imputado: selectedCase?.imputado ?? "",
      descripcion: uploadForm.descripcion,
      subido_por: currentUser.username,
      version: 1,
      ruta_storage: storagePath,
    });
    if (error) {
      console.error("Error registrando documento:", error);
      await supabase.storage.from("documentos").remove([storagePath]);
      showDocumentMessage("No se pudo registrar el documento", error.message, "danger");
      return;
    }

    await logAuditEvent({
      usuario: currentUser.username,
      accion: "SUBIR_DOCUMENTO",
      modulo: "Documentos",
      entidad: uploadForm.exp,
      detalle: `Documento ${fileName} subido al expediente ${uploadForm.exp}.`,
      tipo: "create",
    });

    setDocs(prev => [{
      id: Date.now(),
      nombre: fileName,
      tipo: ext,
      peso: `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB`,
      exp: uploadForm.exp,
      imputado: selectedCase?.imputado ?? "",
      descripcion: uploadForm.descripcion,
      subidoPor: currentUser.username,
      fecha: new Date().toLocaleString("es-DO"),
      version: 1,
      ruta: storagePath,
    }, ...prev]);
    setShowUpload(false);
    setDragOver(false);
    setUploadForm({ exp: "", descripcion: "", fileName: "" });
    setUploadFile(null);
    setUploadCaseSearch("");
    setUploadCasePickerOpen(false);
  };

  const deleteDocument = async () => {
    if (deleteId === null) return;
    const target = docs.find(d => d.id === deleteId);
    if (!target) return;

    const { error } = await supabase
      .from("documentos")
      .delete()
      .eq("numero_expediente", target.exp)
      .eq("nombre_archivo", target.nombre);

    if (error) {
      console.error("Error eliminando documento:", error);
      showDocumentMessage("No se pudo eliminar", error.message, "danger");
      return;
    }

    if (target.ruta) {
      const { error: storageError } = await supabase.storage.from("documentos").remove([target.ruta]);
      if (storageError) console.error("Error eliminando archivo de Storage:", storageError);
    }

    await logAuditEvent({
      usuario: currentUser.username,
      accion: "ELIMINAR_DOCUMENTO",
      modulo: "Documentos",
      entidad: target.exp,
      detalle: `Documento ${target.nombre} eliminado del expediente ${target.exp}.`,
      tipo: "security",
    });

    setDocs(p => p.filter(d => d.id !== deleteId));
    setDeleteId(null);
  };

  const filtered = useMemo(() => docs.filter(d => {
    if (filterTipo !== "Todos" && d.tipo !== filterTipo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.nombre.toLowerCase().includes(q) && !d.descripcion.toLowerCase().includes(q) && !d.imputado.toLowerCase().includes(q) && !d.exp.toLowerCase().includes(q) && !d.subidoPor.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [docs, filterTipo, search]);

  return (
    <div className="p-6">
      <SectionHeader
        title="Gestión Documental"
        sub={`${filtered.length} de ${docs.length} documentos en el repositorio`}
        action={<Btn variant="secondary" icon={Upload} onClick={() => setShowUpload(true)}>Subir Documento</Btn>}
      />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Documentos", value: docs.length, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400", icon: FileText },
          { label: "Archivos PDF", value: docs.filter(d => d.tipo === "PDF").length, color: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400", icon: FileText },
          { label: "Archivos DOCX", value: docs.filter(d => d.tipo === "DOCX").length, color: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400", icon: FileText },
          { label: "Archivos XLSX", value: docs.filter(d => d.tipo === "XLSX").length, color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400", icon: FileSpreadsheet },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.color}`}><k.icon size={17} /></div>
            <div>
              <div className="text-xl font-bold font-mono text-foreground">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & view toggle */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/60 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/60" placeholder="Buscar por nombre, expediente, descripción…" />
          </div>
          <div className="flex gap-1.5">
            {["Todos", "PDF", "DOCX", "XLSX"].map(t => (
              <ChipFilter key={t} label={t} active={filterTipo === t} onClick={() => setFilterTipo(t)} />
            ))}
          </div>
          <div className="ml-auto flex gap-2 items-center">
            <Btn variant="secondary" icon={FileSpreadsheet} size="sm" onClick={() => downloadExcel(
              ["Documento", "Tipo", "Expediente", "Imputado", "Descripción", "Versión", "Subido por", "Fecha", "Tamaño"],
              filtered.map(doc => [doc.nombre, doc.tipo, doc.exp, doc.imputado, doc.descripcion, doc.version, doc.subidoPor, doc.fecha, doc.peso]),
              "documentos.xls"
            )}>Exportar Excel</Btn>
            <div className="flex border border-border rounded-md overflow-hidden">
              <button onClick={() => setViewMode("list")} className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Lista</button>
              <button onClick={() => setViewMode("grid")} className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Tarjetas</button>
            </div>
          </div>
        </div>
        {(search || filterTipo !== "Todos") && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
            <button onClick={() => { setSearch(""); setFilterTipo("Todos"); }} className="text-xs text-primary hover:underline flex items-center gap-1"><X size={10} /> Limpiar</button>
          </div>
        )}
      </div>

      {/* List view */}
      {viewMode === "list" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table
            headers={["Documento", "Tipo", "Expediente", "Imputado", "Descripción", "Versión", "Subido por", "Fecha", "Tamaño", "Acciones"]}
            rows={filtered.map(doc => [
              <span className="font-medium text-foreground text-sm flex items-center gap-2">
                <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${tipoDocIcon(doc.tipo)}`}>{doc.tipo}</span>
                <span className="truncate max-w-[160px]" title={doc.nombre}>{doc.nombre}</span>
              </span>,
              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${tipoDocIcon(doc.tipo)}`}>{doc.tipo}</span>,
              <span className="font-mono text-xs text-primary cursor-pointer hover:underline" onClick={() => setView("case-detail")}>{doc.exp}</span>,
              <span className="text-xs text-muted-foreground max-w-[100px] truncate">{doc.imputado}</span>,
              <span className="text-xs text-muted-foreground max-w-[140px] truncate" title={doc.descripcion}>{doc.descripcion}</span>,
              <span className="font-mono text-xs text-center text-muted-foreground">v{doc.version}</span>,
              <span className="font-mono text-xs text-muted-foreground">{doc.subidoPor}</span>,
              <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{doc.fecha}</span>,
              <span className="font-mono text-xs text-muted-foreground">{doc.peso}</span>,
              <div className="flex gap-1">
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Vista previa" onClick={() => previewDocument(doc)}><Eye size={13} /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Descargar" onClick={() => downloadDocument(doc)}><Download size={13} /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Nueva versión"><Upload size={13} /></button>
                <button className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600" title="Eliminar" onClick={() => setDeleteId(doc.id)}><Trash2 size={13} /></button>
              </div>
            ])}
          />
          <div className="px-4 pb-4"><Pagination total={filtered.length} /></div>
        </div>
      )}

      {/* Grid view */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(doc => (
            <div key={doc.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow group">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${tipoDocIcon(doc.tipo)}`}>
                <FileText size={22} />
              </div>
              <p className="text-sm font-medium text-foreground truncate" title={doc.nombre}>{doc.nombre}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.descripcion}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-mono text-[10px] text-muted-foreground">{doc.peso} · v{doc.version}</span>
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${tipoDocIcon(doc.tipo)}`}>{doc.tipo}</span>
              </div>
              <p className="font-mono text-[10px] text-primary mt-1.5 cursor-pointer hover:underline" onClick={() => setView("case-detail")}>{doc.exp}</p>
              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => previewDocument(doc)} className="flex-1 py-1 rounded text-xs bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"><Eye size={11} />Ver</button>
                <button onClick={() => downloadDocument(doc)} className="flex-1 py-1 rounded text-xs bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"><Download size={11} />Descargar</button>
                <button onClick={() => setDeleteId(doc.id)} className="w-8 py-1 rounded text-xs bg-muted text-muted-foreground hover:text-red-600 flex items-center justify-center"><Trash2 size={11} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Subir Documento</h2>
              <button onClick={() => { setShowUpload(false); setDragOver(false); setUploadCaseSearch(""); setUploadCasePickerOpen(false); }}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Expediente asociado<span className="text-red-500">*</span></label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={uploadCasePickerOpen ? uploadCaseSearch : selectedUploadCase ? `${selectedUploadCase.id} - ${selectedUploadCase.sentencia || selectedUploadCase.imputado || selectedUploadCase.delito || "Sin referencia"}` : uploadCaseSearch}
                    onChange={e => {
                      setUploadCaseSearch(e.target.value);
                      setUploadForm(p => ({ ...p, exp: "" }));
                      setUploadCasePickerOpen(true);
                    }}
                    onFocus={() => {
                      setUploadCasePickerOpen(true);
                      if (selectedUploadCase && !uploadCaseSearch) setUploadCaseSearch("");
                    }}
                    onBlur={() => window.setTimeout(() => setUploadCasePickerOpen(false), 150)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground"
                    placeholder="Buscar y seleccionar expediente"
                  />
                  {uploadCasePickerOpen && (
                    <div className="absolute z-[80] mt-1 w-full max-h-56 overflow-auto bg-card border border-border rounded-md shadow-lg">
                      {uploadCaseOptions.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted-foreground">No hay expedientes con esa coincidencia.</div>
                      ) : uploadCaseOptions.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={event => event.preventDefault()}
                          onClick={() => {
                            setUploadForm(p => ({ ...p, exp: c.id }));
                            setUploadCaseSearch("");
                            setUploadCasePickerOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                        >
                          <div className="text-sm font-mono text-primary">{c.id}</div>
                          <div className="text-xs text-muted-foreground truncate">{c.sentencia || c.imputado || c.delito || "Sin referencia"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{uploadCaseOptions.length} expediente(s) disponible(s){selectedUploadCase ? ` · seleccionado: ${selectedUploadCase.id}` : ""}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Descripción del documento</label>
                <input value={uploadForm.descripcion} onChange={e => setUploadForm(p => ({ ...p, descripcion: e.target.value }))} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" placeholder="Ej. Sentencia condenatoria en primera instancia" />
              </div>
              <input
                id={uploadInputId}
                type="file"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0] ?? null;
                  setUploadFile(file);
                  setUploadForm(p => ({ ...p, fileName: file?.name ?? "" }));
                }}
              />

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0] ?? null;
                  setUploadFile(file);
                  setUploadForm(p => ({ ...p, fileName: file?.name ?? "" }));
                }}
                className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer
                  ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
              >
                <Upload size={24} className={dragOver ? "text-primary" : "text-muted-foreground"} />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Arrastre el archivo aquí o haga clic para seleccionar</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, JPG, PNG — Máximo 20 MB por archivo</p>
                </div>
                {uploadForm.fileName && <p className="text-xs text-primary font-mono">{uploadForm.fileName}</p>}
                <Btn variant="secondary" size="sm" onClick={() => document.getElementById(uploadInputId)?.click()}>Seleccionar archivo</Btn>
              </div>

              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/30 rounded-lg">
                <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  Los archivos se almacenan de forma privada. El sistema renombra el archivo automáticamente y valida su tipo real antes de guardar.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => { setShowUpload(false); setDragOver(false); setUploadFile(null); setUploadForm({ exp: "", descripcion: "", fileName: "" }); setUploadCaseSearch(""); setUploadCasePickerOpen(false); }}>Cancelar</Btn>
              <Btn icon={Upload} onClick={handleUploadDocument}>Subir Documento</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><Trash2 size={18} className="text-red-600" /></div>
              <div>
                <h3 className="font-semibold text-foreground">Eliminar Documento</h3>
                <p className="text-xs text-muted-foreground">{docs.find(d => d.id === deleteId)?.nombre}</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-6">¿Está seguro que desea eliminar este documento? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Btn>
              <Btn variant="danger" icon={Trash2} onClick={deleteDocument}>Eliminar</Btn>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[86vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">{previewDoc.name}</h3>
                <p className="text-xs text-muted-foreground">Vista previa del documento</p>
              </div>
              <div className="flex items-center gap-2">
                <Btn variant="secondary" size="sm" icon={Download} onClick={async () => {
                  const response = await fetch(previewDoc.url);
                  if (!response.ok) return;
                  const blobUrl = URL.createObjectURL(await response.blob());
                  const link = document.createElement("a");
                  link.href = blobUrl;
                  link.download = previewDoc.name;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  URL.revokeObjectURL(blobUrl);
                }}>Descargar</Btn>
                <button onClick={() => setPreviewDoc(null)} className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><X size={16} /></button>
              </div>
            </div>
            {previewDoc.type === "PDF" ? (
              <iframe title={previewDoc.name} src={previewDoc.url} className="w-full flex-1 bg-white" />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                <FileText size={36} className="text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">La vista previa interna está disponible para PDF. Descargue el archivo para visualizar este formato.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ActionDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        variant={dialog?.variant ?? "info"}
        confirmLabel={dialog?.confirmLabel ?? "Aceptar"}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />
    </div>
  );
}

// ─── Reports View ─────────────────────────────────────────────────────────────

function ReportsView() {
  const [caseNumber, setCaseNumber] = useState("");
  const [status, setStatus] = useState("Todos");
  const [loading, setLoading] = useState(false);
  const [reportRows, setReportRows] = useState<DbRow[]>([]);
  const [error, setError] = useState("");
  const reportHeaders = useMemo(() => {
    if (reportRows.length === 0) return [];
    const rawHeaders = Array.from(new Set(reportRows.flatMap(row => Object.keys(row))));
    return ["ID UCAPREC", ...rawHeaders.filter(header => !["id", "codigo_estructurado"].includes(header))];
  }, [reportRows]);
  const reportCellValue = (row: DbRow, header: string) => {
    if (header === "ID UCAPREC") {
      return firstText(
        row.codigo_estructurado,
        buildStructuredCaseId(
          firstText(row.numero_sentencia, row.numero_expediente, "SIN-RESOLUCION"),
          new Date(firstText(row.created_at, row.fecha_recepcion))
        )
      );
    }
    const value = row[header];
    return typeof value === "object" && value !== null ? JSON.stringify(value) : value;
  };

  const loadFullCaseReport = async () => {
    setLoading(true);
    setError("");

    let query = supabase.from("expedientes").select("*").limit(5000);
    if (caseNumber.trim()) {
      query = query.or(`numero_expediente.ilike.%${caseNumber.trim()}%,numero_sentencia.ilike.%${caseNumber.trim()}%`);
    }
    if (status !== "Todos") {
      query = query.eq("estado_registro", status);
    }

    const { data, error: queryError } = await query;
    setLoading(false);

    if (queryError) {
      setReportRows([]);
      setError(queryError.message);
      return;
    }

    setReportRows(data ?? []);
  };

  const exportFullCaseReport = () => {
    const rows = reportRows;
    if (reportHeaders.length === 0) {
      setError("No hay datos para exportar. Genere el reporte primero.");
      return;
    }
    downloadExcel(
      reportHeaders,
      rows.map(row => reportHeaders.map(header => reportCellValue(row, header))),
      "reporte-expedientes-completo.xls"
    );
  };

  return (
    <div className="p-6">
      <SectionHeader
        title="Generador de Reportes"
        sub="Exportación completa de expedientes con todas las variables disponibles"
      />

      <div className="bg-card border border-border rounded-lg p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto_auto] gap-3 items-end">
          <div>
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Expediente o sentencia</label>
            <input value={caseNumber} onChange={e => setCaseNumber(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" placeholder="Buscar por expediente o sentencia" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Estado del registro</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground">
              <option>Todos</option>
              {ESTADOS_REGISTRO.map(item => <option key={item}>{item}</option>)}
            </select>
          </div>
          <Btn icon={RefreshCw} onClick={loadFullCaseReport}>{loading ? "Generando..." : "Generar"}</Btn>
          <Btn variant="secondary" icon={FileSpreadsheet} onClick={exportFullCaseReport}>Exportar Excel</Btn>
        </div>
        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Reporte de Expedientes Completos</h3>
            <p className="text-xs text-muted-foreground mt-1">{reportRows.length} expediente(s) en el reporte</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {reportRows.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">Genere un reporte para visualizar y exportar los datos.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {reportHeaders.map(header => (
                    <th key={header} className="text-left py-2.5 px-4 font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportRows.slice(0, 25).map((row, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                    {reportHeaders.map(header => (
                      <td key={header} className="py-2.5 px-4 text-foreground whitespace-nowrap max-w-[220px] truncate">
                        {String(reportCellValue(row, header) ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 pb-4"><Pagination total={reportRows.length} pageSize={25} /></div>
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────

function SettingsView({ dark, setDark }: { dark: boolean; setDark: (b: boolean) => void }) {
  const DEFAULT_SETTINGS = {
    sessionTimeout: "30",
    maxLoginAttempts: "5",
    mfaRole: "Administrador y Supervisor",
    maxFileSize: "20 MB",
    allowedTypes: "PDF, DOCX, XLSX, JPG, PNG",
    systemName: "UCAPREC",
    institution: "Ministerio Público",
  };

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [dialog, setDialog] = useState<null | {
    title: string;
    message: string;
    variant?: "info" | "danger";
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ucaprec_settings");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setSettings(prev => ({ ...prev, ...parsed }));
      if (typeof parsed.darkMode === "boolean") setDark(parsed.darkMode);
    } catch {
      // Ignorar configuración corrupta y conservar valores por defecto
    }
  }, [setDark]);

  const updateSetting = (key: keyof typeof settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    try {
      localStorage.setItem("ucaprec_settings", JSON.stringify({
        ...settings,
        darkMode: dark,
      }));

      setDialog({
        title: "Configuración guardada",
        message: "Los parámetros del sistema fueron guardados correctamente.",
        variant: "info",
        confirmLabel: "Aceptar",
        onConfirm: () => setDialog(null),
      });
    } catch {
      setDialog({
        title: "No se pudo guardar",
        message: "Ocurrió un problema al guardar la configuración. Intente nuevamente.",
        variant: "danger",
        confirmLabel: "Aceptar",
        onConfirm: () => setDialog(null),
      });
    }
  };

  const handleResetDefaults = () => {
    setDialog({
      title: "Restablecer configuración",
      message: "Se restaurarán los valores por defecto del sistema. Esta acción sobrescribirá la configuración actual.",
      variant: "danger",
      confirmLabel: "Sí, restablecer",
      cancelLabel: "Volver",
      onConfirm: () => {
        setDialog(null);
        setSettings(DEFAULT_SETTINGS);
        setDark(false);
        localStorage.removeItem("ucaprec_settings");
      },
      onCancel: () => setDialog(null),
    });
  };

  return (
    <div className="p-6">
      <SectionHeader title="Configuración del Sistema" sub="Parámetros globales y preferencias de la aplicación" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          {
            title: "Apariencia", icon: Sun, items: [
              {
                label: "Tema de la interfaz",
                comp: (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDark(false)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${!dark ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      Claro
                    </button>
                    <button
                      onClick={() => setDark(true)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${dark ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      Oscuro
                    </button>
                  </div>
                )
              }
            ]
          },
          {
            title: "Seguridad", icon: Lock, items: [
              {
                label: "Tiempo de sesión (minutos)",
                comp: (
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={e => updateSetting("sessionTimeout", e.target.value)}
                    className="w-24 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none text-foreground"
                  />
                )
              },
              {
                label: "Intentos máximos de login",
                comp: (
                  <input
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={e => updateSetting("maxLoginAttempts", e.target.value)}
                    className="w-24 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none text-foreground"
                  />
                )
              },
              {
                label: "MFA obligatorio por rol",
                comp: (
                  <select
                    value={settings.mfaRole}
                    onChange={e => updateSetting("mfaRole", e.target.value)}
                    className="text-sm bg-input-background border border-border rounded-md px-2 py-1.5 outline-none text-foreground"
                  >
                    <option>Administrador y Supervisor</option>
                    <option>Solo Administrador</option>
                    <option>Todos los roles</option>
                    <option>No requerido</option>
                  </select>
                )
              },
            ]
          },
          {
            title: "Archivos Adjuntos", icon: FileText, items: [
              {
                label: "Tamaño máximo por archivo",
                comp: (
                  <select
                    value={settings.maxFileSize}
                    onChange={e => updateSetting("maxFileSize", e.target.value)}
                    className="text-sm bg-input-background border border-border rounded-md px-2 py-1.5 outline-none text-foreground"
                  >
                    <option>20 MB</option>
                    <option>10 MB</option>
                    <option>50 MB</option>
                  </select>
                )
              },
              {
                label: "Tipos permitidos",
                comp: (
                  <input
                    value={settings.allowedTypes}
                    onChange={e => updateSetting("allowedTypes", e.target.value)}
                    className="w-64 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none text-foreground"
                  />
                )
              },
            ]
          },
          {
            title: "Sistema", icon: Database, items: [
              {
                label: "Nombre del sistema",
                comp: (
                  <input
                    value={settings.systemName}
                    onChange={e => updateSetting("systemName", e.target.value)}
                    className="w-40 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none text-foreground"
                  />
                )
              },
              {
                label: "Institución",
                comp: (
                  <input
                    value={settings.institution}
                    onChange={e => updateSetting("institution", e.target.value)}
                    className="w-64 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none text-foreground"
                  />
                )
              },
              { label: "Versión del sistema", comp: <span className="font-mono text-xs text-muted-foreground">v1.0.0-beta</span> },
            ]
          },
        ].map(({ title, icon: Icon, items }) => (
          <div key={title} className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Icon size={16} className="text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">{title}</h3>
            </div>
            <div className="p-5 space-y-4">
              {items.map(({ label, comp }) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <label className="text-sm text-foreground">{label}</label>
                  {comp}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Btn variant="secondary" onClick={handleResetDefaults}>Restablecer valores por defecto</Btn>
        <Btn icon={CheckCircle} onClick={handleSaveSettings}>Guardar Configuración</Btn>
      </div>

      <ActionDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        variant={dialog?.variant ?? "info"}
        confirmLabel={dialog?.confirmLabel ?? "Aceptar"}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />
    </div>
  );
}

// ─── Profile View ────────────────────────────────────────────────────────────

function ProfileView({ currentUser }: { currentUser: SessionUser }) {
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<null | {
    title: string;
    message: string;
    variant?: "info" | "danger";
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>(null);

  const hasChanges = useMemo(() => (
    passwordForm.current.trim() !== "" ||
    passwordForm.next.trim() !== "" ||
    passwordForm.confirm.trim() !== ""
  ), [passwordForm]);

  const resetForm = useCallback(() => {
    setPasswordForm({ current: "", next: "", confirm: "" });
    setShowCurrent(false);
    setShowNext(false);
    setShowConfirm(false);
    setError("");
  }, []);

  const requestCancel = useCallback(() => {
    if (!hasChanges) {
      resetForm();
      return;
    }

    setDialog({
      title: "Cancelar cambios",
      message: "Si sales ahora, se perderán los datos que ya digitaste para el cambio de contraseña.",
      variant: "danger",
      confirmLabel: "Sí, cancelar",
      cancelLabel: "Volver",
      onConfirm: () => {
        setDialog(null);
        resetForm();
      },
      onCancel: () => setDialog(null),
    });
  }, [hasChanges, resetForm]);

  const confirmPasswordChange = useCallback(() => {
    setError("");

    if (passwordForm.current.trim().length < 1) {
      setError("Debes colocar tu contraseña actual para confirmar el cambio.");
      return;
    }

    if (passwordForm.next.length < 8) {
      setError("La nueva contraseña debe tener mínimo 8 caracteres.");
      return;
    }

    if (passwordForm.next !== passwordForm.confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setDialog({
      title: "Confirmar cambio de contraseña",
      message: "Se actualizará la contraseña de tu cuenta institucional. Asegúrate de haber guardado la nueva clave en un lugar seguro.",
      variant: "info",
      confirmLabel: "Sí, actualizar",
      cancelLabel: "Cancelar",
      onConfirm: async () => {
        setDialog(null);
        setSaving(true);
        setError("");

        try {
          const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: passwordForm.current,
          });

          if (verifyError) {
            throw new Error("La contraseña actual no coincide.");
          }

          const { error: updateError } = await supabase.auth.updateUser({ password: passwordForm.next });
          if (updateError) {
            throw new Error(updateError.message || "No fue posible actualizar la contraseña.");
          }

          resetForm();
          setDialog({
            title: "Contraseña actualizada",
            message: "Tu contraseña fue actualizada correctamente.",
            variant: "info",
            confirmLabel: "Aceptar",
            onConfirm: () => setDialog(null),
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "No fue posible actualizar la contraseña.");
        } finally {
          setSaving(false);
        }
      },
      onCancel: () => setDialog(null),
    });
  }, [currentUser.email, passwordForm.confirm, passwordForm.current, passwordForm.next, resetForm]);

  const inputCls = "w-full px-3 py-2.5 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/60";
  const labelCls = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="p-6">
      <SectionHeader
        title="Perfil"
        sub="Datos básicos de la sesión actual y cambio seguro de contraseña."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shadow-sm">
              {currentUser.initials}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground truncate">{currentUser.name}</p>
              <p className="text-sm text-muted-foreground truncate">{currentUser.role}</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className={labelCls}>Correo institucional</p>
              <p className="text-foreground mt-1 break-all">{currentUser.email}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className={labelCls}>Nombre del usuario</p>
              <p className="text-foreground mt-1">{currentUser.name}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className={labelCls}>Usuario</p>
              <p className="text-foreground mt-1 font-mono">{currentUser.username}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className={labelCls}>ID del usuario</p>
              <p className="text-foreground mt-1 font-mono text-xs break-all">{currentUser.id}</p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 bg-card border border-border rounded-lg p-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Cambiar contraseña</h3>
              <p className="text-sm text-muted-foreground mt-1">Usa una clave segura y confirma antes de guardar.</p>
            </div>
            <Btn variant="secondary" onClick={requestCancel}>Limpiar</Btn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Contraseña actual</label>
              <div className="relative mt-1">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={passwordForm.current}
                  onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                  className={inputCls}
                  placeholder="Ingrese su clave actual"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Nueva contraseña</label>
              <div className="relative mt-1">
                <input
                  type={showNext ? "text" : "password"}
                  value={passwordForm.next}
                  onChange={e => setPasswordForm(p => ({ ...p, next: e.target.value }))}
                  className={inputCls}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNext(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNext ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Confirmar contraseña</label>
              <div className="relative mt-1">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                  className={inputCls}
                  placeholder="Repita la contraseña"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-end mt-6">
            <Btn variant="secondary" onClick={requestCancel}>Cancelar</Btn>
            <Btn onClick={confirmPasswordChange}>{saving ? "Actualizando..." : "Actualizar contraseña"}</Btn>
          </div>
        </div>
      </div>

      <ActionDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        variant={dialog?.variant ?? "info"}
        confirmLabel={dialog?.confirmLabel ?? "Aceptar"}
        cancelLabel={dialog?.cancelLabel}
        onConfirm={dialog?.onConfirm ?? (() => setDialog(null))}
        onCancel={dialog?.onCancel}
      />
    </div>
  );
}

// ─── Catalogs View ────────────────────────────────────────────────────────────

function CatalogsView() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [catSearch, setCatSearch] = useState("");
  const [editingItem, setEditingItem] = useState<{ idx: number; val: string } | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [deleteItemIdx, setDeleteItemIdx] = useState<number | null>(null);

  const baseData: Record<string, string[]> = {
    provincias: PROVINCIAS,
    infracciones: INFRACCIONES,
    centros: CENTROS_PENITENCIARIOS,
    jurisdicciones: JURISDICCIONES,
    nacionalidades: NACIONALIDADES,
    tipos_exp: TIPOS_EXPEDIENTE,
    decisiones: DECISIONES,
  };

  const [catalogItems, setCatalogItems] = useState<Record<string, string[]>>({ ...baseData });

  const active = CATALOG_META.find(c => c.key === activeKey);
  const currentItems = activeKey ? (catalogItems[activeKey] ?? []) : [];
  const filteredItems = catSearch ? currentItems.filter(i => i.toLowerCase().includes(catSearch.toLowerCase())) : currentItems;

  const saveEdit = () => {
    if (!activeKey || editingItem === null) return;
    setCatalogItems(prev => {
      const copy = [...(prev[activeKey] ?? [])];
      copy[editingItem.idx] = editingItem.val;
      return { ...prev, [activeKey]: copy };
    });
    setEditingItem(null);
  };

  const deleteItem = () => {
    if (!activeKey || deleteItemIdx === null) return;
    setCatalogItems(prev => {
      const copy = [...(prev[activeKey] ?? [])];
      copy.splice(deleteItemIdx, 1);
      return { ...prev, [activeKey]: copy };
    });
    setDeleteItemIdx(null);
  };

  const addItem = () => {
    if (!activeKey || !newItem.trim()) return;
    setCatalogItems(prev => ({ ...prev, [activeKey]: [...(prev[activeKey] ?? []), newItem.trim()] }));
    setNewItem("");
    setShowAddItem(false);
  };

  const openCatalog = (key: string) => {
    setActiveKey(activeKey === key ? null : key);
    setCatSearch(""); setEditingItem(null); setShowAddItem(false); setNewItem("");
  };

  return (
    <div className="p-6">
      <SectionHeader
        title="Administración de Catálogos"
        sub="Catálogos cargados desde archivos CSV oficiales — fuente única de verdad"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" icon={Upload}>Importar CSV/Excel</Btn>
            <Btn variant="secondary" icon={Download} onClick={() => activeKey && downloadCSV(["Item"], (catalogItems[activeKey] ?? []).map(i => [i]), `${activeKey}.csv`)}>Exportar</Btn>
          </div>
        }
      />

      <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-900/30 rounded-lg text-xs text-blue-800 dark:text-blue-400">
        <Info size={13} className="flex-shrink-0" />
        <span>Catálogos precargados desde CSV oficiales. Los cambios en producción requieren aprobación del Administrador.</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATALOG_META.map(c => {
          const count = (catalogItems[c.key] ?? []).length;
          return (
            <div key={c.key}
              className={`bg-card border rounded-lg p-4 hover:shadow-sm transition-all cursor-pointer ${activeKey === c.key ? "border-primary ring-1 ring-primary/20" : "border-border"}`}
              onClick={() => openCatalog(c.key)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><BookOpen size={15} className="text-muted-foreground" /></div>
                <span className="font-mono text-lg font-bold text-foreground">{count}</span>
              </div>
              <p className="font-semibold text-foreground text-sm">{c.nombre}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">Fuente: {c.ultima}</p>
              <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                <Btn variant="secondary" size="sm" icon={Eye} onClick={() => openCatalog(c.key)}>
                  {activeKey === c.key ? "Cerrar" : "Ver items"}
                </Btn>
                <Btn variant="secondary" size="sm" icon={Download} onClick={() => downloadCSV(["Item"], (catalogItems[c.key] ?? []).map(i => [i]), `${c.key}.csv`)}>Exportar</Btn>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline preview panel with edit/delete */}
      {activeKey && active && (
        <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div>
              <h3 className="font-semibold text-foreground text-sm">{active.nombre}</h3>
              <p className="text-xs text-muted-foreground">{filteredItems.length} de {currentItems.length} registros</p>
            </div>
            <div className="flex gap-2">
              <Btn variant="secondary" icon={Plus} size="sm" onClick={() => { setShowAddItem(true); setNewItem(""); }}>Agregar</Btn>
              <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadCSV(["Item"], currentItems.map(i => [i]), `${activeKey}.csv`)}>Exportar</Btn>
              <button onClick={() => setActiveKey(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={14} /></button>
            </div>
          </div>
          <div className="p-4">
            {showAddItem && (
              <div className="flex gap-2 mb-3 p-3 bg-muted/30 rounded-lg border border-border">
                <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()}
                  className="flex-1 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground"
                  placeholder="Nuevo item…" autoFocus />
                <Btn size="sm" icon={CheckCircle} onClick={addItem}>Agregar</Btn>
                <Btn variant="secondary" size="sm" onClick={() => setShowAddItem(false)}>Cancelar</Btn>
              </div>
            )}
            <div className="mb-3">
              <div className="relative max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={catSearch} onChange={e => setCatSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/50" placeholder="Filtrar…" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {filteredItems.map((item, i) => {
                const realIdx = currentItems.indexOf(item);
                const isEditing = editingItem?.idx === realIdx;
                return (
                  <div key={`${activeKey}-${i}`} className="flex items-center justify-between group px-3 py-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full">
                        <input value={editingItem.val} onChange={e => setEditingItem({ idx: realIdx, val: e.target.value })} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingItem(null); }}
                          className="flex-1 min-w-0 px-2 py-0.5 text-xs bg-input-background border border-border rounded outline-none focus:ring-1 focus:ring-ring text-foreground" autoFocus />
                        <button onClick={saveEdit} className="p-0.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded flex-shrink-0"><CheckCircle size={12} /></button>
                        <button onClick={() => setEditingItem(null)} className="p-0.5 text-muted-foreground hover:bg-muted rounded flex-shrink-0"><X size={12} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-foreground truncate flex-1" title={item}>{item}</span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
                          <button title="Editar" className="p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600" onClick={() => setEditingItem({ idx: realIdx, val: item })}><Edit2 size={11} /></button>
                          <button title="Eliminar" className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600" onClick={() => setDeleteItemIdx(realIdx)}><Trash2 size={11} /></button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete item confirmation */}
      {deleteItemIdx !== null && activeKey && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><Trash2 size={18} className="text-red-600" /></div>
              <div>
                <h3 className="font-semibold text-foreground">Eliminar del Catálogo</h3>
                <p className="text-xs text-muted-foreground font-mono">{currentItems[deleteItemIdx]}</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-2">¿Eliminar este ítem del catálogo?</p>
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/30 rounded-lg mb-4">
              <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-400">Los expedientes existentes con este valor no se verán afectados (integridad histórica).</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setDeleteItemIdx(null)}>Cancelar</Btn>
              <Btn variant="danger" icon={Trash2} onClick={deleteItem}>Eliminar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Views map ────────────────────────────────────────────────────────────────

const VIEW_TITLES: Record<View, string> = {
  dashboard: "Dashboard", cases: "Expedientes", "case-detail": "Detalle del Expediente",
  "case-form": "Editar Expediente", "case-new": "Nuevo Expediente", defendants: "Imputados", victims: "Víctimas",
  measures: "Medidas y Alertas", documents: "Documentos", reports: "Reportes",
  analytics: "Analítica", notifications: "Notificaciones", users: "Usuarios y Roles", audit: "Auditoría",
  catalogs: "Catálogos", settings: "Configuración", profile: "Perfil",
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [caseFormStartTab, setCaseFormStartTab] = useState(0);
  const [autoOpenAddDefModal, setAutoOpenAddDefModal] = useState(false);
  const [caseFormReturnView, setCaseFormReturnView] = useState<View>("cases");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedDefendantCaseId, setSelectedDefendantCaseId] = useState("");
  const [selectedNotificationCaseId, setSelectedNotificationCaseId] = useState("");
  const [reviewCaseCount, setReviewCaseCount] = useState(0);
  const [permissionConfig, setPermissionConfig] = useState<Record<string, Record<string, boolean>>>({});
  const canAccessAdmin = currentUser ? isAdminRole(currentUser.role) : false;
  const rolePermissionDefault = useCallback((key: string) => {
    const role = currentUser?.role ?? "";
    if (key === "cases.delete") return role === "Administrador";
    if (key === "cases.create" || key === "cases.edit") return ["Administrador", "Supervisor", "Analista"].includes(role);
    return role === "Administrador";
  }, [currentUser?.role]);
  const canUsePermission = useCallback((key: string) => {
    if (!currentUser) return false;
    const custom = permissionConfig[currentUser.username]?.[key];
    return typeof custom === "boolean" ? custom : rolePermissionDefault(key);
  }, [currentUser, permissionConfig, rolePermissionDefault]);
  const canCreateCases = canUsePermission("cases.create");
  const canEditCases = canUsePermission("cases.edit");
  const canDeleteCases = canUsePermission("cases.delete");

  // ── Navigation history ──
  const [navHist, setNavHist] = useState<View[]>(["dashboard"]);
  const [histIdx, setHistIdx] = useState(0);

  const navigate = useCallback((v: View) => {
    setView(v);
    setNavHist(prev => {
      const trimmed = prev.slice(0, histIdx + 1);
      return [...trimmed, v];
    });
    setHistIdx(prev => prev + 1);
  }, [histIdx]);

  // Module navigation resets breadcrumb (called from sidebar)
  const navigateModule = useCallback((v: View) => {
    setView(v);
    setNavHist([v]);
    setHistIdx(0);
  }, []);

  const goBack = useCallback(() => {
    if (histIdx > 0) {
      const newIdx = histIdx - 1;
      setHistIdx(newIdx);
      setNavHist(prev => { setView(prev[newIdx]); return prev; });
    }
  }, [histIdx]);

  const canGoBack = histIdx > 0;
  const breadcrumb = navHist.slice(0, histIdx + 1);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setCurrentUser(data.session?.user ? sessionUserFromAuthUser(data.session.user) : null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ? sessionUserFromAuthUser(session.user) : null);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    supabase
      .from("configuracion_sistema")
      .select("valor")
      .eq("clave", "permisos_usuarios")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando permisos de sesión:", error);
          return;
        }
        if (data?.valor && typeof data.valor === "object" && !Array.isArray(data.valor)) {
          setPermissionConfig(data.valor as Record<string, Record<string, boolean>>);
        }
      });
    return () => {
      active = false;
    };
  }, [currentUser?.username]);

  useEffect(() => {
    let active = true;
    supabase
      .from("expedientes")
      .select("id", { count: "exact", head: true })
      .eq("estado_registro", "En Revisión")
      .then(({ count }) => {
        if (active) setReviewCaseCount(count ?? 0);
      });
    return () => {
      active = false;
    };
  }, [view]);

  const handleLogin = useCallback((sessionUser: SessionUser, remember: boolean) => {
    void remember;
    setCurrentUser(sessionUser);
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setView("dashboard");
    setNavHist(["dashboard"]);
    setHistIdx(0);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const timeoutMs = 30 * 60 * 1000;
    let timer: ReturnType<typeof window.setTimeout>;
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void handleLogout();
      }, timeoutMs);
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      window.clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser, handleLogout]);

  const openAddImputadoFromDefendants = useCallback((caseId: string) => {
    setSelectedCaseId("");
    setSelectedNotificationCaseId("");
    setSelectedDefendantCaseId(caseId);
    setCaseFormStartTab(1);
    setAutoOpenAddDefModal(true);
    setCaseFormReturnView("defendants");
    navigate("case-form");
  }, [navigate]);

  const openEditImputadoFromDefendants = useCallback((caseId: string) => {
    setSelectedCaseId("");
    setSelectedNotificationCaseId("");
    setSelectedDefendantCaseId(caseId);
    setCaseFormStartTab(1);
    setAutoOpenAddDefModal(false);
    setCaseFormReturnView("defendants");
    navigate("case-form");
  }, [navigate]);

  const openCaseFromList = useCallback((caseId: string, mode: "detail" | "form" = "detail") => {
    setSelectedCaseId(caseId);
    setSelectedDefendantCaseId("");
    setSelectedNotificationCaseId("");
    setCaseFormStartTab(0);
    setAutoOpenAddDefModal(false);
    setCaseFormReturnView("cases");
    navigate(mode === "form" ? "case-form" : "case-detail");
  }, [navigate]);

  const openCaseFromNotification = useCallback((caseId: string) => {
    setSelectedCaseId("");
    setSelectedDefendantCaseId("");
    setSelectedNotificationCaseId(caseId);
    setCaseFormStartTab(0);
    setAutoOpenAddDefModal(false);
    setCaseFormReturnView("notifications");
    navigate("case-form");
  }, [navigate]);

  const openNotificationsCenter = useCallback(() => {
    navigate("notifications");
  }, [navigate]);

  const renderView = () => {
    if (ADMIN_ONLY_VIEWS.includes(view) && !canAccessAdmin) {
      return <DashboardView setView={navigate} />;
    }

    switch (view) {
      case "dashboard": return <DashboardView setView={navigate} />;
      case "cases": return <CasesView setView={navigate} openCase={openCaseFromList} currentUser={currentUser} canCreateCases={canCreateCases} canEditCases={canEditCases} canDeleteCases={canDeleteCases} />;
      case "case-detail": return <CaseDetailView setView={navigate} mode="detail" selectedCaseId={selectedCaseId} currentUser={currentUser} canEditCases={canEditCases} />;
      case "case-form": return (
        <CaseDetailView
          setView={navigate}
          mode="form"
          currentUser={currentUser}
          canEditCases={canEditCases}
          returnToView={caseFormReturnView}
          initialTab={caseFormStartTab}
          autoOpenAddDefModal={autoOpenAddDefModal}
          selectedCaseId={selectedNotificationCaseId || selectedDefendantCaseId || selectedCaseId}
          onConsumedAutoOpenAddDefModal={() => setAutoOpenAddDefModal(false)}
        />
      );
      case "case-new": return canCreateCases ? <NewCaseView setView={navigate} currentUser={currentUser} /> : <DashboardView setView={navigate} />;
      case "defendants": return <DefendantsView setView={navigate} openCase={openCaseFromList} openAddImputado={openAddImputadoFromDefendants} openEditImputado={openEditImputadoFromDefendants} />;
      case "victims": return <VictimsView setView={navigate} currentUser={currentUser} />;
      case "measures": return <MeasuresView setView={navigate} currentUser={currentUser} />;
      case "documents": return <DocumentsView setView={navigate} currentUser={currentUser} />;
      case "notifications": return <NotificationsView openCaseFromNotification={openCaseFromNotification} />;
      case "reports": return <ReportsView />;
      case "analytics": return <AnalyticsView />;
      case "profile": return currentUser ? <ProfileView currentUser={currentUser} /> : <DashboardView setView={navigate} />;
      case "users": return <UsersView />;
      case "audit": return <AuditView />;
      case "catalogs": return <CatalogsView />;
      case "settings": return <SettingsView dark={dark} setDark={setDark} />;
      default: return <DashboardView setView={navigate} />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center text-sm text-slate-500">
        Validando sesión institucional...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar
        view={view}
        setView={navigate}
        navigateModule={navigateModule}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        currentUser={currentUser}
        onLogout={handleLogout}
        canAccessAdmin={canAccessAdmin}
        reviewCount={reviewCaseCount}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title={VIEW_TITLES[view]}
          dark={dark}
          setDark={setDark}
          setView={navigate}
          navigateModule={navigateModule}
          goBack={goBack}
          canGoBack={canGoBack}
          breadcrumb={breadcrumb}
          openCaseFromNotification={openCaseFromNotification}
          openNotificationsCenter={openNotificationsCenter}
          canAccessAdmin={canAccessAdmin}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
