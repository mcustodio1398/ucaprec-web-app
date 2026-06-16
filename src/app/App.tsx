import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PROVINCIAS, getMunicipios, getSectores,
  INFRACCIONES, CENTROS_PENITENCIARIOS, JURISDICCIONES, NACIONALIDADES,
  TIPOS_EXPEDIENTE, DECISIONES, QUIEN_INTERPONE, ESTADOS_REGISTRO,
  ESTADOS_IMPUTADO, ESTADOS_JUDICIALES, SEXOS, CATALOG_META,
} from "../data/catalogs";
import {
  LayoutDashboard, FolderOpen, Users, UserX, Shield, FileText,
  BarChart2, Settings, LogOut, Bell, Search, Moon, Sun,
  AlertTriangle, CheckCircle, Clock, Eye, Edit2, Trash2, Plus,
  Download, Filter, ChevronRight, ChevronLeft, X, MapPin, AlertOctagon,
  BookOpen, Activity, Database, TrendingUp, ArrowUpRight,
  ArrowDownRight, Scale, Gavel, Building2, Globe, ChevronDown,
  Upload, Lock, RefreshCw, Menu, UserCheck, FileSearch, Layers,
  CheckSquare, AlertCircle, Info, Printer, FileSpreadsheet, ArrowLeft
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, LabelList
} from "recharts";
import mpLogo from "../imports/Logo_-_Ministerio_Publico_-_Horizontal.png";

// ─── Types ─────────────────────────────────────────────────────────────────

type View =
  | "dashboard" | "cases" | "case-detail" | "case-form"
  | "defendants" | "victims" | "measures" | "documents"
  | "reports" | "analytics" | "users" | "audit" | "catalogs" | "settings";

interface NavItem { id: View; label: string; icon: any; badge?: number }
interface NavGroup { label: string; items: NavItem[] }

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

const evolutionData = [
  { mes: "Ene", casos: 38 }, { mes: "Feb", casos: 45 }, { mes: "Mar", casos: 42 },
  { mes: "Abr", casos: 51 }, { mes: "May", casos: 47 }, { mes: "Jun", casos: 53 },
  { mes: "Jul", casos: 61 }, { mes: "Ago", casos: 58 }, { mes: "Sep", casos: 49 },
  { mes: "Oct", casos: 67 }, { mes: "Nov", casos: 71 }, { mes: "Dic", casos: 47 },
];

const statusPieData = [
  { name: "Prófugo", value: 342, color: "#B91C1C" },
  { name: "Rebeldía", value: 218, color: "#D97706" },
  { name: "Recluido", value: 891, color: "#059669" },
  { name: "Absuelto", value: 396, color: "#94A3B8" },
];

const districtData = [
  { name: "D. Nacional", casos: 412 }, { name: "Santiago", casos: 287 },
  { name: "San Cristóbal", casos: 198 }, { name: "La Vega", casos: 143 },
  { name: "Puerto Plata", casos: 112 }, { name: "San Pedro", casos: 98 },
  { name: "Barahona", casos: 67 }, { name: "Otros", casos: 530 },
];

const byTypeData = [
  { name: "Sentencia", value: 1124, fill: "#1D4ED8" },
  { name: "Resolución", value: 548, fill: "#059669" },
  { name: "Casación", value: 175, fill: "#D97706" },
];

const alertsByMonthData = [
  { mes: "Jul", roja: 12, migratoria: 24, arresto: 31 },
  { mes: "Ago", roja: 15, migratoria: 28, arresto: 36 },
  { mes: "Sep", roja: 11, migratoria: 21, arresto: 29 },
  { mes: "Oct", roja: 18, migratoria: 32, arresto: 41 },
  { mes: "Nov", roja: 22, migratoria: 35, arresto: 48 },
  { mes: "Dic", roja: 14, migratoria: 27, arresto: 38 },
];

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

const systemAlerts = [
  { type: "danger", msg: "Alerta roja activada — EXP-2024-1847: Carlos Méndez Ríos (Lavado de Activos)", time: "hace 2h" },
  { type: "warning", msg: "Alerta migratoria actualizada — EXP-2024-1846: INVERSALUD S.A.", time: "hace 5h" },
  { type: "info", msg: "EXP-2024-1839 asignado a Ana Rodríguez por supervisor", time: "hace 8h" },
  { type: "success", msg: "Documento Sentencia_0881.pdf subido correctamente en EXP-2024-1844", time: "hace 10h" },
  { type: "warning", msg: "EXP-2024-1821 pendiente de verificación — 14 días sin actualizar", time: "hace 1d" },
];

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

function triggerPrint() { window.print(); }

// ─── Shared defendant / victim types ─────────────────────────────────────────

interface DefEntry {
  id: number; tipo: string; nombre: string; doc: string; edad: string;
  sexo: string; nac: string; estadoImp: string; estadoJud: string; centro: string;
  penaImp: string; penaPriv: string; penaSusp: string;
  indemnizacion: string; garantia: string; multa: string; decomiso: string;
  subidoPN: boolean; arresto: boolean; alertaRoja: boolean; alertaMig: boolean;
}

interface VicEntry { id: number; tipo: string; nombre: string; }

const EMPTY_DEF: Omit<DefEntry, "id"> = {
  tipo: "Persona Física", nombre: "", doc: "", edad: "", sexo: "Hombre",
  nac: "Dominicano/a", estadoImp: "Prófugo", estadoJud: "Condenado",
  centro: "N/A (Prófugo)", penaImp: "", penaPriv: "", penaSusp: "",
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
      { id: "cases", label: "Expedientes", icon: FolderOpen, badge: 93 },
      { id: "defendants", label: "Imputados", icon: UserX },
      { id: "victims", label: "Víctimas", icon: Users },
      { id: "measures", label: "Medidas y Alertas", icon: AlertOctagon, badge: 156 },
      { id: "documents", label: "Documentos", icon: FileText },
    ]
  },
  {
    label: "Análisis",
    items: [
      { id: "reports", label: "Reportes", icon: BarChart2 },
      { id: "analytics", label: "Analítica", icon: Activity },
    ]
  },
  {
    label: "Administración",
    items: [
      { id: "users", label: "Usuarios y Roles", icon: Shield },
      { id: "audit", label: "Auditoría", icon: Database },
      { id: "catalogs", label: "Catálogos", icon: BookOpen },
      { id: "settings", label: "Configuración", icon: Settings },
    ]
  }
];

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
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
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
      <div>
        <div className="text-[26px] font-bold font-mono text-foreground leading-none">{value.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground mt-1.5">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono">{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex-1 min-w-0 pr-4">
        <h1 className="text-2xl font-bold text-foreground leading-tight" style={{ fontFamily: "'Crimson Pro', serif" }}>{title}</h1>
        {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

function Btn({ children, variant = "primary", size = "md", onClick, icon: Icon }: {
  children?: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger";
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

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {headers.map(h => (
              <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="py-3 px-3 text-foreground">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination() {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <span className="text-xs text-muted-foreground font-mono">Mostrando 1–7 de 1,847 registros</span>
      <div className="flex items-center gap-1">
        {["«", "‹", "1", "2", "3", "...", "263", "›", "»"].map((p, i) => (
          <button key={i} className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${p === "1" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
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

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ view, setView, navigateModule, collapsed, setCollapsed }: {
  view: View; setView: (v: View) => void; navigateModule: (v: View) => void;
  collapsed: boolean; setCollapsed: (b: boolean) => void;
}) {
  return (
    <aside className={`flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 ${collapsed ? "w-[60px]" : "w-[220px]"} flex-shrink-0`}>
      {/* Logo */}
      <div className={`flex items-center border-b border-sidebar-border ${collapsed ? "justify-center px-3 py-3" : "px-4 py-3"}`}>
        {collapsed ? (
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center flex-shrink-0">
            <Scale size={15} className="text-white" />
          </div>
        ) : (
          //Nombre de UCAPREC debajo del logo, con tracking amplio y color azul claro
          <div className="flex flex-col gap-1.5 min-w-0">
            <img src={mpLogo} alt="Ministerio Público" className="h-25 w-auto object-contain object-left" />
            <div className="text-[12
            px] text-blue-300/60 tracking-[0.2em] uppercase font-semibold pl-0.5">UCAPREC</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <div className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-1">{group.label}</div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateModule(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors relative group
                      ${active
                        ? "bg-white/10 text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                      } ${collapsed ? "justify-center" : ""}`}
                  >
                    <item.icon size={16} className="flex-shrink-0" />
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
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sidebar-foreground/50 hover:text-white hover:bg-sidebar-accent transition-colors text-xs"
        >
          <Menu size={14} />
          {!collapsed && <span>Colapsar menú</span>}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-md">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">RH</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">Roberto Herrera</div>
              <div className="text-[10px] text-sidebar-foreground/50">Administrador</div>
            </div>
            <LogOut size={13} className="text-sidebar-foreground/40 hover:text-white cursor-pointer flex-shrink-0" />
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ title, dark, setDark, setView, goBack, canGoBack, breadcrumb }: {
  title: string; dark: boolean; setDark: (b: boolean) => void; setView: (v: View) => void;
  goBack: () => void; canGoBack: boolean; breadcrumb: View[];
}) {
  const [notifOpen, setNotifOpen] = useState(false);

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

      {/* Right: search, notifications, dark mode */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60" />
          <input
            className="pl-8 pr-3 py-1.5 text-sm bg-white/10 border border-white/15 rounded-md outline-none focus:ring-1 focus:ring-white/30 w-52 text-white placeholder:text-blue-200/50"
            placeholder="Búsqueda rápida…"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-8 h-8 flex items-center justify-center rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">Notificaciones</span>
                <button onClick={() => setNotifOpen(false)}><X size={14} className="text-muted-foreground" /></button>
              </div>
              <div className="divide-y divide-border max-h-72 overflow-y-auto">
                {systemAlerts.map((a, i) => {
                  const colors = { danger: "text-red-600", warning: "text-amber-600", info: "text-blue-600", success: "text-emerald-600" };
                  const icons = { danger: AlertOctagon, warning: AlertTriangle, info: Info, success: CheckCircle };
                  const Icon = icons[a.type as keyof typeof icons];
                  return (
                    <div key={i} className="flex gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer">
                      <Icon size={14} className={`mt-0.5 flex-shrink-0 ${colors[a.type as keyof typeof colors]}`} />
                      <div>
                        <p className="text-xs text-foreground leading-snug">{a.msg}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">{a.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2 border-t border-border">
                <button className="text-xs text-primary hover:underline w-full text-center">Ver todas las notificaciones</button>
              </div>
            </div>
          )}
        </div>

        {/* Dark mode */}
        <button
          onClick={() => setDark(!dark)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
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
  return (
    <div className="p-6 space-y-6">
      <SectionHeader
        title="Estadísticas Sobre la Unidad de Captura de Prófugos, Rebeldes y Condenados (UCAPREC)"
        sub="Resumen operativo actualizado al 28 de noviembre de 2024"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" icon={RefreshCw} size="sm" onClick={() => window.location.reload()}>Actualizar</Btn>
            <Btn variant="secondary" icon={Printer} size="sm" onClick={exportDashboardPDF}>Exportar PDF</Btn>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard label="Expedientes Totales" value={KPI.total} delta="+47 este mes"
          icon={FolderOpen} bg="bg-blue-50 dark:bg-blue-900/20" fg="text-blue-700 dark:text-blue-400" sub="Desde 1990 a la fecha" />
        <KPICard label="Prófugos Activos" value={KPI.profugos} delta="+8 este mes"
          icon={UserX} bg="bg-red-50 dark:bg-red-900/20" fg="text-red-700 dark:text-red-400" />
        <KPICard label="En Rebeldía" value={KPI.rebeldes} delta="-3 este mes"
          icon={Gavel} bg="bg-amber-50 dark:bg-amber-900/20" fg="text-amber-700 dark:text-amber-400" />
        <KPICard label="Pendiente Revisión" value={KPI.pendReview}
          icon={Clock} bg="bg-orange-50 dark:bg-orange-900/20" fg="text-orange-700 dark:text-orange-400" sub="Sin verificar >7 días" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard label="Alertas Rojas" value={KPI.alertaRoja} delta="+22 este mes"
          icon={AlertOctagon} bg="bg-red-50 dark:bg-red-900/20" fg="text-red-700 dark:text-red-400" />
        <KPICard label="Alertas Migratorias" value={KPI.alertaMig} delta="+35 este mes"
          icon={Globe} bg="bg-indigo-50 dark:bg-indigo-900/20" fg="text-indigo-700 dark:text-indigo-400" />
        <KPICard label="Órdenes de Arresto" value={KPI.ordenArresto} delta="+48 este mes"
          icon={Lock} bg="bg-violet-50 dark:bg-violet-900/20" fg="text-violet-700 dark:text-violet-400" />
        <KPICard label="Subidos a PN" value={284} delta="+31 este mes"
          icon={UserCheck} bg="bg-teal-50 dark:bg-teal-900/20" fg="text-teal-700 dark:text-teal-400" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Recepción de Casos — 2024</h3>
              <p className="text-xs text-muted-foreground">Nuevos expedientes por mes</p>
            </div>
            <TrendingUp size={16} className="text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={evolutionData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
              <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {statusPieData.map((entry) => <Cell key={`status-${entry.name}`} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {statusPieData.map((item, i) => (
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
            <BarChart data={districtData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
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
            <h3 className="font-semibold text-foreground text-sm">Alertas por Tipo — Últimos 6 Meses</h3>
            <p className="text-xs text-muted-foreground">Evolución de alertas activas</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={alertsByMonthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
                {recentCases.slice(0, 5).map((c, i) => (
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
            {systemAlerts.map((a, i) => {
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

function CasesView({ setView }: { setView: (v: View) => void }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterDelito, setFilterDelito] = useState("Todos");
  const [filterAnalista, setFilterAnalista] = useState("Todos");
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [cases, setCases] = useState(recentCases);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return cases.filter(c => {
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
  }, [cases, search, filterStatus, filterTipo, filterDelito, filterAnalista, filterDesde, filterHasta]);

  const confirmDelete = (id: string) => setDeleteId(id);
  const doDelete = () => {
    if (deleteId) { setCases(prev => prev.filter(c => c.id !== deleteId)); setDeleteId(null); }
  };

  const selectCls = "text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="p-6">
      <SectionHeader
        title="Gestión de Expedientes"
        sub={`${filtered.length} de ${cases.length} expedientes mostrados`}
        action={<Btn icon={Plus} onClick={() => setView("case-form")}>Nuevo Expediente</Btn>}
      />

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
          {/* Status chips */}
          <div className="flex gap-1.5 flex-wrap">
            {["Todos", "Prófugo", "Rebeldía", "Recluido", "Absuelto"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadCSV(
              ["Expediente", "No. Sentencia", "Imputado", "Delito", "Estatus", "Alerta", "Estado Reg.", "Asignado", "Fecha"],
              filtered.map(c => [c.id, c.sentencia, c.imputado, c.delito, c.estatus, c.alerta, c.estReg, c.asignado, c.fecha]),
              "expedientes.csv"
            )}>Exportar Excel</Btn>
            <Btn variant="secondary" icon={Printer} size="sm" onClick={triggerPrint}>Imprimir</Btn>
          </div>
        </div>

        {/* Advanced filters */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border items-end">
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
            <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)}
              className={`${selectCls} min-w-[140px]`} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Fecha hasta</label>
            <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)}
              className={`${selectCls} min-w-[140px]`} />
          </div>
          {(search || filterStatus !== "Todos" || filterTipo !== "Todos" || filterDelito !== "Todos" || filterAnalista !== "Todos" || filterDesde || filterHasta) && (
            <button onClick={() => { setSearch(""); setFilterStatus("Todos"); setFilterTipo("Todos"); setFilterDelito("Todos"); setFilterAnalista("Todos"); setFilterDesde(""); setFilterHasta(""); }}
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
            <button onClick={() => { setSearch(""); setFilterStatus("Todos"); setFilterTipo("Todos"); setFilterDelito("Todos"); setFilterAnalista("Todos"); setFilterDesde(""); setFilterHasta(""); }}
              className="text-xs text-primary hover:underline">Limpiar filtros</button>
          </div>
        ) : (
          <Table
            headers={["Expediente", "No. Sentencia", "Imputado Principal", "Delito", "Estatus", "Alerta", "Estado Reg.", "Asignado", "Fecha", "Acciones"]}
            rows={filtered.map(c => [
              <span className="font-mono text-xs text-primary cursor-pointer hover:underline" onClick={() => setView("case-detail")}>{c.id}</span>,
              <span className="font-mono text-xs text-muted-foreground">{c.sentencia}</span>,
              <span className="text-sm">{c.imputado}</span>,
              <span className="text-xs text-muted-foreground">{c.delito}</span>,
              <Badge label={c.estatus} />,
              <AlertBadge type={c.alerta} />,
              <Badge label={c.estReg} />,
              <span className="text-xs text-muted-foreground">{c.asignado}</span>,
              <span className="font-mono text-xs text-muted-foreground">{c.fecha}</span>,
              <div className="flex gap-1">
                <button title="Ver detalle" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" onClick={() => setView("case-detail")}><Eye size={13} /></button>
                <button title="Editar expediente" className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 transition-colors" onClick={() => setView("case-form")}><Edit2 size={13} /></button>
                <button title="Eliminar expediente" className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors" onClick={() => confirmDelete(c.id)}><Trash2 size={13} /></button>
              </div>
            ])}
          />
        )}
        <div className="px-4 pb-4 border-t border-border">
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-muted-foreground font-mono">{filtered.length} resultado(s)</span>
            <Pagination />
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
  const [sector, setSector] = useState("Centro");
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
            onChange={e => { setProvincia(e.target.value); setMunicipio(getMunicipios(e.target.value)[0] ?? ""); setSector("Centro"); }}
            className={inputCls}
          >
            {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        {/* Municipio — depende de provincia */}
        <div>
          <label className={labelCls}>Municipio</label>
          <select
            disabled={!isEdit}
            value={municipio}
            onChange={e => { setMunicipio(e.target.value); setSector("Centro"); }}
            className={inputCls}
          >
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
            {sectores.map(s => <option key={s}>{s}</option>)}
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

function CaseDetailView({ setView, mode }: { setView: (v: View) => void; mode: "detail" | "form" }) {
  const isEdit = mode === "form";
  const [tab, setTab] = useState(0);

  // ── Defendants state ──
  const [defs, setDefs] = useState<DefEntry[]>([{
    id: 1, tipo: "Persona Física", nombre: "Carlos Armando Méndez Ríos",
    doc: "001-1182044-3", edad: "47", sexo: "Hombre", nac: "Dominicano/a",
    estadoImp: "Prófugo", estadoJud: "Condenado", centro: "N/A (Prófugo)",
    penaImp: "15", penaPriv: "15", penaSusp: "0",
    indemnizacion: "2,500,000", garantia: "0", multa: "500,000", decomiso: "2 vehículos, 1 embarcación",
    subidoPN: true, arresto: true, alertaRoja: true, alertaMig: true,
  }]);
  const [showDefModal, setShowDefModal] = useState(false);
  const [newDef, setNewDef] = useState<Omit<DefEntry, "id">>({ ...EMPTY_DEF });

  const addDef = () => {
    if (!newDef.nombre.trim()) return;
    setDefs(prev => [...prev, { ...newDef, id: Date.now() }]);
    setNewDef({ ...EMPTY_DEF });
    setShowDefModal(false);
  };
  const removeDef = (id: number) => setDefs(prev => prev.filter(d => d.id !== id));

  // ── Victims state ──
  const [vics, setVics] = useState<VicEntry[]>([
    { id: 1, tipo: "Persona Física", nombre: "Luis Alberto Fernández Méndez" },
    { id: 2, tipo: "Persona Jurídica", nombre: "BANCORP S.A." },
  ]);
  const [showVicModal, setShowVicModal] = useState(false);
  const [newVic, setNewVic] = useState({ tipo: "Persona Física", nombre: "" });

  const addVic = () => {
    if (!newVic.nombre.trim()) return;
    setVics(prev => [...prev, { id: Date.now(), ...newVic }]);
    setNewVic({ tipo: "Persona Física", nombre: "" });
    setShowVicModal(false);
  };
  const removeVic = (id: number) => setVics(prev => prev.filter(v => v.id !== id));

  // ── Measures state ──
  const [measures, setMeasures] = useState({ arresto: true, roja: true, migratoria: true, policia: true });
  const toggleMeasure = (k: keyof typeof measures) => setMeasures(m => ({ ...m, [k]: !m[k] }));

  const tabs = ["Datos Generales", "Imputados", "Víctimas", "Medidas / Alertas", "Localización", "Documentos", "Observaciones"];
  const inputCls = `w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/50 ${!isEdit ? "opacity-75 cursor-default" : ""}`;
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider";

  const Field = ({ label, value, type = "text", required = false }: { label: string; value?: string; type?: string; required?: boolean }) => (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {type === "textarea"
        ? <textarea readOnly={!isEdit} defaultValue={value} rows={3} className={`${inputCls} resize-none`} />
        : <input readOnly={!isEdit} type={type} defaultValue={value} className={inputCls} />
      }
    </div>
  );
  const Sel = ({ label, value, options, required = false }: { label: string; value?: string; options: string[]; required?: boolean }) => (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select disabled={!isEdit} defaultValue={value} className={inputCls}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  const BoolBadge = ({ v }: { v: boolean }) => (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium ${v ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"}`}>
      {v ? <CheckSquare size={10} /> : <X size={10} />}{v ? "Sí" : "No"}
    </div>
  );

  // Export helpers for this case
  const exportCaseCSV = () => {
    downloadCSV(
      ["Expediente", "Sentencia", "Imputado", "Documento", "Estado", "Pena", "Alerta Roja", "Alert. Migratoria", "Orden Arresto"],
      defs.map(d => ["EXP-2024-1847", "SCJ-PEN-2024-0892", d.nombre, d.doc, d.estadoImp, d.penaImp + " años", d.alertaRoja ? "Sí" : "No", d.alertaMig ? "Sí" : "No", d.arresto ? "Sí" : "No"]),
      "EXP-2024-1847.csv"
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
            <span className="text-xs font-mono text-primary">EXP-2024-1847</span>
          </div>
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "'Crimson Pro', serif" }}>
            {isEdit ? "Editar Expediente" : "Detalle del Expediente"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">No. Sentencia SCJ-PEN-2024-0892 — Lavado de Activos</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {!isEdit && (
            <>
              <Btn variant="secondary" icon={Printer} size="sm" onClick={triggerPrint}>Imprimir</Btn>
              <Btn variant="secondary" icon={FileSpreadsheet} size="sm" onClick={exportCaseCSV}>Exportar Excel</Btn>
              <Btn icon={Edit2} size="sm" onClick={() => setView("case-form")}>Editar</Btn>
            </>
          )}
          {isEdit && (
            <>
              <Btn variant="secondary" size="sm" onClick={() => setView("case-detail")}>Cancelar</Btn>
              <Btn size="sm" icon={CheckCircle} onClick={() => setView("case-detail")}>Guardar Cambios</Btn>
            </>
          )}
        </div>
      </div>

      {/* Status strip */}
      {!isEdit && (
        <div className="flex flex-wrap gap-3 mb-6 px-4 py-3 bg-card border border-border rounded-lg text-xs">
          {([["Estado Registro", <Badge label="Verificado" />], ["Imputado Principal", <Badge label="Prófugo" />],
            ["Alerta Roja", <BoolBadge v={measures.roja} />], ["Alert. Migratoria", <BoolBadge v={measures.migratoria} />],
            ["Orden Arresto", <BoolBadge v={measures.arresto} />], ["Subido a PN", <BoolBadge v={measures.policia} />],
            ["Asignado a", <span className="font-mono">A. Rodríguez</span>], ["Última mod.", <span className="font-mono">28/11/2024 09:42</span>]
          ] as [string, React.ReactNode][]).map(([l, v], i) => (
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
              <Field label="Fecha de recepción" value="2024-11-28" type="date" required />
              <Field label="No. Sentencia / Resolución" value="SCJ-PEN-2024-0892" required />
              <Sel label="Tipo de Expediente" value="Sentencia" options={TIPOS_EXPEDIENTE} required />
              <Field label="Jurisdicción" value="Primera Instancia Penal — Distrito Nacional" required />
              <Sel label="Localidad de Jurisdicción" value="Distrito Nacional" options={JURISDICCIONES} />
              <Field label="Fecha de la Decisión" value="2024-11-15" type="date" required />
              <Sel label="Decisión" value="Acoge Recurso de Casación" options={DECISIONES} />
              <Sel label="Quién Interpone el Recurso" value="Imputado" options={QUIEN_INTERPONE} />
              <Sel label="Estado del Registro" value="Verificado" options={ESTADOS_REGISTRO} />
              <Sel label="Asignado a" value="Ana Rodríguez" options={["Ana Rodríguez", "Luis Peña", "María Santos", "Pedro Álvarez"]} />
              <Field label="Creado por" value="arodriguez" />
              <Field label="Fecha de Creación" value="28/11/2024 09:42:11" />
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
                    <Sel label="Tipo de Entidad" value={d.tipo} options={["Persona Física", "Persona Jurídica"]} />
                    <Field label="Nombre completo" value={d.nombre} required />
                    <Field label="Documento de Identidad" value={d.doc} required />
                    <Field label="Edad" value={d.edad} type="number" />
                    <Sel label="Sexo" value={d.sexo} options={SEXOS} />
                    <Sel label="Nacionalidad" value={d.nac} options={NACIONALIDADES} />
                    <Sel label="Estatus del Imputado" value={d.estadoImp} options={ESTADOS_IMPUTADO} />
                    <Sel label="Estatus Judicial" value={d.estadoJud} options={ESTADOS_JUDICIALES} />
                    <Sel label="Centro Penitenciario" value={d.centro} options={["N/A (Prófugo)", ...CENTROS_PENITENCIARIOS]} />
                    <Field label="Pena Impuesta (años)" value={d.penaImp} type="number" />
                    <Field label="Pena Privativa (años)" value={d.penaPriv} type="number" />
                    <Field label="Pena Suspendida (años)" value={d.penaSusp} type="number" />
                    <Field label="Indemnización (RD$)" value={d.indemnizacion} />
                    <Field label="Garantía Económica (RD$)" value={d.garantia} />
                    <Field label="Multa (RD$)" value={d.multa} />
                    <div className="sm:col-span-2 lg:col-span-3"><Field label="Decomiso" value={d.decomiso} /></div>
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
                    <Sel label="Tipo de Persona" value={v.tipo} options={["Persona Física", "Persona Jurídica"]} />
                    <Field label="Nombre / Razón Social" value={v.nombre} required />
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
                <Field label="Observaciones de medidas" type="textarea" value="28/11/2024 — Alerta Roja activada por coordinación con Interpol (arodriguez). Orden de arresto emitida por el Juzgado 3ro de Instrucción del Distrito Nacional." />
              </div>
            </div>
          )}

          {/* Tab 4: Location */}
          {tab === 4 && <LocationTab isEdit={isEdit} />}

          {/* Tab 5: Documents */}
          {tab === 5 && (
            <div className="space-y-4">
              {isEdit && (
                <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 hover:border-primary/40 transition-colors">
                  <Upload size={24} className="text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Arrastre documentos aquí o haga clic para seleccionar</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, JPG, PNG — Máx. 20MB por archivo</p>
                  </div>
                  <Btn variant="secondary" size="sm">Seleccionar archivos</Btn>
                </div>
              )}
              <div className="space-y-2">
                {[
                  { nombre: "Sentencia_SCJ_0892_2024.pdf", tipo: "PDF", peso: "2.4 MB", subido: "28/11/2024 09:44", subidoPor: "arodriguez", desc: "Sentencia condenatoria SCJ" },
                  { nombre: "Orden_Arresto_JDO3_2024.pdf", tipo: "PDF", peso: "0.8 MB", subido: "28/11/2024 10:12", subidoPor: "msantos", desc: "Orden de arresto emitida" },
                  { nombre: "Informe_UIFE_Activos.docx", tipo: "DOCX", peso: "1.2 MB", subido: "29/11/2024 08:30", subidoPor: "arodriguez", desc: "Informe pericial económico" },
                ].map((doc, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border border-border rounded-lg hover:bg-muted/20 transition-colors">
                    <div className="w-9 h-9 rounded-md bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.nombre}</p>
                      <p className="text-xs text-muted-foreground">{doc.desc} · {doc.peso} · Subido por {doc.subidoPor} el {doc.subido}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Eye size={14} /></button>
                      <button className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Download size={14} /></button>
                      {isEdit && <button className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 size={14} /></button>}
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
                value="El imputado Carlos Méndez Ríos fugó del país previo a la lectura de sentencia. Se coordinó con Interpol para emisión de alerta roja el 15/11/2024. Se notificó a la Dirección General de Migración para alerta migratoria. El caso se encuentra en seguimiento activo por la UCAPREC. Patrimonio investigado estimado en RD$42 millones vinculados a actividades de lavado."
              />
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial de Cambios</p>
                </div>
                {[
                  { u: "msantos", a: "Verificó el expediente", t: "28/11/2024 10:05" },
                  { u: "arodriguez", a: `Subió documento Sentencia_SCJ_0892_2024.pdf`, t: "28/11/2024 09:44" },
                  { u: "arodriguez", a: `Creó el expediente con ${defs.length} imputado(s) y ${vics.length} víctima(s)`, t: "28/11/2024 09:42" },
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

      {/* ── Modal: Agregar Imputado ── */}
      {showDefModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-foreground">Agregar Imputado</h2>
              <button onClick={() => setShowDefModal(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ["Tipo de Entidad", "tipo", "select", ["Persona Física", "Persona Jurídica"]],
                ["Nombre completo *", "nombre", "text"],
                ["Documento de Identidad *", "doc", "text"],
                ["Edad", "edad", "number"],
                ["Sexo", "sexo", "select", SEXOS],
                ["Nacionalidad", "nac", "select", NACIONALIDADES],
                ["Estatus del Imputado", "estadoImp", "select", ESTADOS_IMPUTADO],
                ["Estatus Judicial", "estadoJud", "select", ESTADOS_JUDICIALES],
                ["Centro Penitenciario", "centro", "select", ["N/A (Prófugo)", ...CENTROS_PENITENCIARIOS]],
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
              <Btn variant="secondary" onClick={() => setShowDefModal(false)}>Cancelar</Btn>
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

// ─── Analytics View ───────────────────────────────────────────────────────────

function AnalyticsView() {
  return (
    <div className="p-6">
      <SectionHeader
        title="Analítica Operativa"
        sub="Métricas avanzadas y tendencias del sistema UCAPREC"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" icon={Printer} size="sm" onClick={triggerPrint}>Imprimir</Btn>
            <Btn variant="secondary" icon={FileSpreadsheet} size="sm" onClick={() => downloadCSV(
              ["Mes", "Casos"], evolutionData.map(d => [d.mes, d.casos]), "evolucion-casos.csv"
            )}>Exportar Excel</Btn>
          </div>
        }
      />

      {/* Filter strip with real catalogs */}
      <div className="flex flex-wrap gap-3 mb-6 px-4 py-3 bg-card border border-border rounded-lg">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Período</label>
          <select className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[160px]">
            {["2024 (Año completo)", "2023", "2022", "2021", "Último trimestre", "Último mes"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Jurisdicción</label>
          <select className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[160px]">
            <option>Todas</option>
            {JURISDICCIONES.map(j => <option key={j}>{j}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tipo de Expediente</label>
          <select className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[160px]">
            <option>Todos</option>
            {TIPOS_EXPEDIENTE.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Analista</label>
          <select className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[140px]">
            <option>Todos</option>
            {["Ana Rodríguez", "Luis Peña", "María Santos", "Pedro Álvarez"].map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold text-foreground text-sm mb-1">Evolución Anual de Casos</h3>
          <p className="text-xs text-muted-foreground mb-4">Nuevos expedientes registrados por mes</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={evolutionData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Area type="monotone" dataKey="casos" stroke="#1D4ED8" strokeWidth={2} fill="url(#gradA)" dot={{ r: 3, fill: "#1D4ED8" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold text-foreground text-sm mb-1">Alertas por Tipo — Mensual</h3>
          <p className="text-xs text-muted-foreground mb-4">Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={alertsByMonthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar key="ana-roja" dataKey="roja" name="Alerta Roja" fill="#B91C1C" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="roja" position="top" style={{ fontSize: 9, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
              <Bar key="ana-migratoria" dataKey="migratoria" name="Migratoria" fill="#4F46E5" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="migratoria" position="top" style={{ fontSize: 9, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
              <Bar key="ana-arresto" dataKey="arresto" name="Arresto" fill="#D97706" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="arresto" position="top" style={{ fontSize: 9, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold text-foreground text-sm mb-1">Distribución por Tipo de Expediente</h3>
          <p className="text-xs text-muted-foreground mb-4">Total de registros</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={byTypeData} cx="50%" cy="50%" outerRadius={65} dataKey="value">
                {byTypeData.map((entry) => <Cell key={`type-${entry.name}`} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {byTypeData.map((item, i) => {
              const total = byTypeData.reduce((s, d) => s + d.value, 0);
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: item.fill }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-foreground">{item.value.toLocaleString()}</span>
                    <span className="text-muted-foreground/60 font-mono">({Math.round(item.value / total * 100)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-semibold text-foreground text-sm mb-1">Casos por Jurisdicción</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribución geográfica</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={districtData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Bar key="ana-casos" dataKey="casos" fill="#059669" radius={[0, 3, 3, 0]} barSize={12}>
                <LabelList dataKey="casos" position="right" style={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "monospace" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking analistas */}
      <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Rendimiento por Analista</h3>
        </div>
        <Table
          headers={["Analista", "Casos Asignados", "Verificados", "En Revisión", "Alertas Activas", "Último Caso"]}
          rows={[
            ["Ana Rodríguez", <span className="font-mono">47</span>, <span className="font-mono text-emerald-600">38</span>, <span className="font-mono text-amber-600">9</span>, <span className="font-mono text-red-600">14</span>, "28/11/2024"],
            ["Luis Peña", <span className="font-mono">31</span>, <span className="font-mono text-emerald-600">27</span>, <span className="font-mono text-amber-600">4</span>, <span className="font-mono text-red-600">8</span>, "27/11/2024"],
            ["Pedro Álvarez", <span className="font-mono">28</span>, <span className="font-mono text-emerald-600">22</span>, <span className="font-mono text-amber-600">6</span>, <span className="font-mono text-red-600">6</span>, "24/11/2024"],
          ]}
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

  type UserEntry = typeof usersData[0];
  const [users, setUsers] = useState<UserEntry[]>(usersData);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "new" | "view" | "edit" | "reset" | "delete">(null);
  const [selected, setSelected] = useState<UserEntry | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserEntry>>({});
  const [newPwd, setNewPwd] = useState({ pwd: "", confirm: "" });

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.nombre.toLowerCase().includes(q) || u.usuario.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const openModal = (m: typeof modal, u?: UserEntry) => {
    setSelected(u || null);
    setEditForm(u ? { ...u } : {});
    setNewPwd({ pwd: "", confirm: "" });
    setModal(m);
  };

  const saveEdit = () => {
    if (selected) setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, ...editForm } as UserEntry : u));
    setModal(null);
  };

  const toggleStatus = (u: UserEntry) => {
    setUsers(prev => prev.map(p => p.id === u.id ? { ...p, estatus: p.estatus === "Activo" ? "Inactivo" : "Activo" } : p));
  };

  const deleteUser = () => {
    if (selected) setUsers(prev => prev.filter(u => u.id !== selected.id));
    setModal(null);
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
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/60 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/60"
              placeholder="Buscar por nombre, usuario, email…" />
          </div>
          <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadCSV(
            ["Usuario", "Nombre", "Email", "Rol", "Estado", "Último Acceso"],
            filtered.map(u => [u.usuario, u.nombre, u.email, u.rol, u.estatus, u.acceso]),
            "usuarios.csv"
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

      {/* Permissions matrix */}
      <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Matriz de Roles y Permisos</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Control de acceso por módulo y acción</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px] min-w-[200px]">Módulo / Acción</th>
                {["Administrador", "Supervisor", "Analista", "Consultor"].map(r => (
                  <th key={r} className="text-center py-3 px-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ["Dashboard — Ver", true, true, true, true],
                ["Expedientes — Crear", true, true, true, false],
                ["Expedientes — Editar", true, true, true, false],
                ["Expedientes — Eliminar", true, false, false, false],
                ["Expedientes — Exportar", true, true, true, true],
                ["Expedientes — Verificar", true, true, false, false],
                ["Imputados — Gestionar medidas", true, true, true, false],
                ["Documentos — Subir", true, true, true, false],
                ["Documentos — Descargar", true, true, true, true],
                ["Reportes — Exportar PDF/Excel", true, true, true, false],
                ["Usuarios — Gestionar", true, false, false, false],
                ["Catálogos — Administrar", true, false, false, false],
                ["Auditoría — Ver", true, true, false, false],
                ["Configuración — Acceder", true, false, false, false],
              ] as [string, boolean, boolean, boolean, boolean][]).map(([label, a, s, an, c], i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-2.5 px-4 text-foreground">{label}</td>
                  {[a, s, an, c].map((v, j) => (
                    <td key={j} className="py-2.5 px-4 text-center">
                      {v ? <CheckCircle size={14} className="text-emerald-600 mx-auto" /> : <X size={14} className="text-red-400 mx-auto" />}
                    </td>
                  ))}
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
              <button onClick={() => setModal(null)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-400">Se enviará un correo a <strong>{selected.email}</strong> con la nueva contraseña temporal.</p>
              </div>
              <div>
                <label className={lbl}>Nueva contraseña temporal</label>
                <input type="password" value={newPwd.pwd} onChange={e => setNewPwd(p => ({ ...p, pwd: e.target.value }))} className={inp} placeholder="Mínimo 8 caracteres" />
              </div>
              <div>
                <label className={lbl}>Confirmar contraseña</label>
                <input type="password" value={newPwd.confirm} onChange={e => setNewPwd(p => ({ ...p, confirm: e.target.value }))} className={inp} placeholder="Repita la contraseña" />
              </div>
              {newPwd.pwd && newPwd.confirm && newPwd.pwd !== newPwd.confirm && (
                <p className="text-xs text-red-600">Las contraseñas no coinciden.</p>
              )}
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn icon={Lock} onClick={() => setModal(null)} variant="primary">Restablecer Contraseña</Btn>
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

  const tipoMap: Record<string, string> = {
    "Crear": "create", "Editar": "update", "Exportar": "export", "Seguridad": "security"
  };

  const filtered = useMemo(() => auditData.filter(r => {
    if (filterTipo !== "Todas" && r.tipo !== tipoMap[filterTipo]) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.usuario.includes(q) && !r.accion.toLowerCase().includes(q) && !r.entidad.toLowerCase().includes(q) && !r.detalle.toLowerCase().includes(q) && !r.modulo.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [search, filterTipo]);

  return (
    <div className="p-6">
      <SectionHeader
        title="Registro de Auditoría"
        sub="Trazabilidad completa de todas las acciones críticas del sistema"
        action={
          <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadCSV(
            ["#", "Usuario", "Acción", "Módulo", "Entidad", "Detalle", "IP", "Fecha"],
            filtered.map(r => [r.id, r.usuario, r.accion, r.modulo, r.entidad, r.detalle, r.ip, r.fecha]),
            "auditoria-log.csv"
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

function DefendantsView({ setView }: { setView: (v: View) => void }) {
  const [defs, setDefs] = useState(defendants);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = useMemo(() => defs.filter(d => {
    if (filterStatus !== "Todos" && d.estatus !== filterStatus) return false;
    const q = search.toLowerCase();
    if (q && !d.nombre.toLowerCase().includes(q) && !d.doc.includes(q) && !d.exp.toLowerCase().includes(q)) return false;
    return true;
  }), [defs, search, filterStatus]);

  return (
    <div className="p-6">
      <SectionHeader
        title="Gestión de Imputados"
        sub={`${filtered.length} de ${defs.length} imputados mostrados`}
        action={<Btn icon={Plus} onClick={() => setView("case-form")}>Agregar Imputado</Btn>}
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
            {["Todos", "Prófugo", "Rebeldía", "Recluido", "Absuelto"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadCSV(
              ["Nombre", "Documento", "Estatus", "Est. Judicial", "Expediente"],
              filtered.map(d => [d.nombre, d.doc, d.estatus, d.estJud, d.exp]),
              "imputados.csv"
            )}>Exportar</Btn>
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table
          headers={["Nombre", "Documento", "Edad", "Sexo", "Estatus", "Est. Judicial", "Alerta R.", "Alert. Mig.", "Arresto", "PN", "Expediente", "Acciones"]}
          rows={filtered.map(d => {
            const Chk = ({ v, cls }: { v: boolean; cls: string }) => (
              <span className={`w-5 h-5 flex items-center justify-center rounded-full ${v ? cls : "bg-muted text-muted-foreground"}`}>{v ? <CheckSquare size={10} /> : <X size={10} />}</span>
            );
            return [
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
              <span className="font-mono text-xs text-primary cursor-pointer hover:underline" onClick={() => setView("case-detail")}>{d.exp}</span>,
              <div className="flex gap-1">
                <button title="Ver expediente" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => setView("case-detail")}><Eye size={13} /></button>
                <button title="Editar imputado" className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600" onClick={() => setView("case-form")}><Edit2 size={13} /></button>
                <button title="Eliminar" className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600" onClick={() => setDeleteId(d.id)}><Trash2 size={13} /></button>
              </div>
            ];
          })}
        />
        <div className="px-4 pb-4 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground font-mono">{filtered.length} resultado(s)</span>
        </div>
      </div>

      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Eliminar Imputado</h3>
                <p className="text-xs text-muted-foreground">{defs.find(d => d.id === deleteId)?.nombre}</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-6">¿Está seguro que desea eliminar este registro? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Btn>
              <Btn variant="danger" icon={Trash2} onClick={() => { setDefs(p => p.filter(d => d.id !== deleteId)); setDeleteId(null); }}>Eliminar</Btn>
            </div>
          </div>
        </div>
      )}
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

function VictimsView({ setView }: { setView: (v: View) => void }) {
  type VicRow = typeof victimasData[0];
  const [vics, setVics] = useState<VicRow[]>(victimasData);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [modal, setModal] = useState<null | "new" | "edit" | "delete">(null);
  const [selected, setSelected] = useState<VicRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<VicRow>>({});
  const [newVic, setNewVic] = useState({ exp: "", tipo: "Persona Física", nombre: "", imputado: "", delito: "" });

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

  const addVic = () => {
    if (!newVic.nombre.trim() || !newVic.exp.trim()) return;
    setVics(p => [...p, { id: Date.now(), ...newVic, fecha: new Date().toLocaleDateString("es-DO") }]);
    setNewVic({ exp: "", tipo: "Persona Física", nombre: "", imputado: "", delito: "" });
    setModal(null);
  };
  const saveEdit = () => {
    if (selected) setVics(p => p.map(v => v.id === selected.id ? { ...v, ...editForm } as VicRow : v));
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
            <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadCSV(
              ["Nombre", "Tipo", "Expediente", "Imputado", "Delito", "Fecha"],
              filtered.map(v => [v.nombre, v.tipo, v.exp, v.imputado, v.delito, v.fecha]),
              "victimas.csv"
            )}>Exportar Excel</Btn>
            <Btn variant="secondary" icon={Printer} size="sm" onClick={triggerPrint}>Imprimir</Btn>
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
              <Btn variant="danger" icon={Trash2} onClick={() => { setVics(p => p.filter(v => v.id !== selected.id)); setModal(null); }}>Eliminar</Btn>
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

function MeasuresView({ setView }: { setView: (v: View) => void }) {
  const [measures, setMeasures] = useState(measuresData);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterActiva, setFilterActiva] = useState("Activas");
  const [showModal, setShowModal] = useState(false);

  const tipoColors: Record<string, string> = {
    "Alerta Roja": "bg-red-100 text-red-800 dark:bg-red-900/25 dark:text-red-400",
    "Alerta Migratoria": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/25 dark:text-indigo-400",
    "Orden de Arresto": "bg-amber-100 text-amber-800 dark:bg-amber-900/25 dark:text-amber-400",
    "Subido a PN": "bg-teal-100 text-teal-800 dark:bg-teal-900/25 dark:text-teal-400",
  };

  const tipoIcons: Record<string, any> = {
    "Alerta Roja": AlertOctagon, "Alerta Migratoria": Globe, "Orden de Arresto": Lock, "Subido a PN": Shield,
  };

  const toggleMedida = (id: number) => setMeasures(p => p.map(m => m.id === id ? { ...m, activa: !m.activa } : m));

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
        action={<Btn icon={Plus} onClick={() => setShowModal(true)}>Registrar Medida</Btn>}
      />

      {/* KPI por tipo */}
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

      {/* Filters */}
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
            <Btn variant="secondary" icon={Download} size="sm" onClick={() => downloadCSV(
              ["Tipo", "Imputado", "Expediente", "Delito", "Activada por", "Fecha", "Estado"],
              filtered.map(m => [m.tipo, m.imputado, m.exp, m.delito, m.activadaPor, m.fecha, m.activa ? "Activa" : "Inactiva"]),
              "medidas.csv"
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
                  <button title="Editar medida" className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600"><Edit2 size={13} /></button>
                  <button title={m.activa ? "Desactivar" : "Reactivar"}
                    className={`p-1 rounded transition-colors ${m.activa ? "hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 text-muted-foreground" : "hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 text-muted-foreground"}`}
                    onClick={() => toggleMedida(m.id)}>
                    {m.activa ? <X size={13} /> : <CheckCircle size={13} />}
                  </button>
                </div>
              ];
            })}
          />
        )}
        <div className="px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground font-mono">{filtered.length} resultado(s)</span>
        </div>
      </div>

      {/* Mapa operativo por imputado */}
      <div className="mt-6 bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Resumen de Medidas por Imputado</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Vista consolidada de medidas activas por persona</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Imputado", "Expediente", "Alerta Roja", "Alert. Migratoria", "Orden Arresto", "Subido PN"].map(h => (
                  <th key={h} className="text-left py-2.5 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { nombre: "Carlos A. Méndez Ríos", exp: "EXP-2024-1847", roja: true, mig: true, arresto: true, pn: true },
                { nombre: "INVERSALUD S.A.", exp: "EXP-2024-1846", roja: false, mig: true, arresto: true, pn: false },
                { nombre: "José M. Paulino Marte", exp: "EXP-2024-1844", roja: true, mig: true, arresto: true, pn: false },
                { nombre: "Wilkins B. Castillo Luna", exp: "EXP-2024-1843", roja: false, mig: false, arresto: true, pn: true },
                { nombre: "Constructora REYMA S.R.L.", exp: "EXP-2024-1841", roja: false, mig: false, arresto: false, pn: false },
              ].map((row, i) => {
                const Chk = ({ v }: { v: boolean }) => (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium ${v ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"}`}>
                    {v ? <CheckCircle size={9} /> : <X size={9} />}{v ? "Sí" : "No"}
                  </span>
                );
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-foreground text-sm">{row.nombre}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-primary cursor-pointer hover:underline" onClick={() => setView("case-detail")}>{row.exp}</td>
                    <td className="py-2.5 px-4"><Chk v={row.roja} /></td>
                    <td className="py-2.5 px-4"><Chk v={row.mig} /></td>
                    <td className="py-2.5 px-4"><Chk v={row.arresto} /></td>
                    <td className="py-2.5 px-4"><Chk v={row.pn} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal registrar medida */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Registrar Medida / Alerta</h2>
              <button onClick={() => setShowModal(false)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Expediente<span className="text-red-500">*</span></label>
                <input className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" placeholder="Ej. EXP-2024-1847" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Imputado<span className="text-red-500">*</span></label>
                <select className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground">
                  <option>Seleccionar imputado del expediente…</option>
                  <option>Carlos A. Méndez Ríos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Tipo de Medida<span className="text-red-500">*</span></label>
                <select className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground">
                  <option>Alerta Roja</option>
                  <option>Alerta Migratoria</option>
                  <option>Orden de Arresto</option>
                  <option>Subido a Policía Nacional</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Observación</label>
                <textarea rows={3} className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground resize-none" placeholder="Detalles de la medida…" />
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Btn>
              <Btn icon={CheckCircle} onClick={() => setShowModal(false)}>Activar Medida</Btn>
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

function DocumentsView({ setView }: { setView: (v: View) => void }) {
  type DocRow = typeof docsData[0];
  const [docs, setDocs] = useState<DocRow[]>(docsData);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterExp, setFilterExp] = useState("");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filtered = useMemo(() => docs.filter(d => {
    if (filterTipo !== "Todos" && d.tipo !== filterTipo) return false;
    if (filterExp && !d.exp.toLowerCase().includes(filterExp.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.nombre.toLowerCase().includes(q) && !d.descripcion.toLowerCase().includes(q) && !d.imputado.toLowerCase().includes(q) && !d.exp.toLowerCase().includes(q) && !d.subidoPor.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [docs, filterTipo, filterExp, search]);

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
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Expediente</label>
            <input value={filterExp} onChange={e => setFilterExp(e.target.value)} placeholder="EXP-2024-..." className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[130px]" />
          </div>
          <div className="ml-auto flex gap-2 items-center">
            <div className="flex border border-border rounded-md overflow-hidden">
              <button onClick={() => setViewMode("list")} className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Lista</button>
              <button onClick={() => setViewMode("grid")} className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Tarjetas</button>
            </div>
          </div>
        </div>
        {(search || filterTipo !== "Todos" || filterExp) && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
            <button onClick={() => { setSearch(""); setFilterTipo("Todos"); setFilterExp(""); }} className="text-xs text-primary hover:underline flex items-center gap-1"><X size={10} /> Limpiar</button>
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
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Vista previa"><Eye size={13} /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Descargar" onClick={() => downloadCSV(["Documento", "Expediente", "Imputado", "Descripción", "Tamaño", "Subido por", "Fecha"], [[doc.nombre, doc.exp, doc.imputado, doc.descripcion, doc.peso, doc.subidoPor, doc.fecha]], doc.nombre.replace(/\.[^.]+$/, "") + ".csv")}><Download size={13} /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Nueva versión"><Upload size={13} /></button>
                <button className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600" title="Eliminar" onClick={() => setDeleteId(doc.id)}><Trash2 size={13} /></button>
              </div>
            ])}
          />
          <div className="px-4 pb-4"><Pagination /></div>
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
                <button className="flex-1 py-1 rounded text-xs bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"><Eye size={11} />Ver</button>
                <button className="flex-1 py-1 rounded text-xs bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"><Download size={11} />Descargar</button>
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
              <button onClick={() => { setShowUpload(false); setDragOver(false); }}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Expediente asociado<span className="text-red-500">*</span></label>
                <input className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" placeholder="Ej. EXP-2024-1847" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Descripción del documento</label>
                <input className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md outline-none focus:ring-1 focus:ring-ring text-foreground" placeholder="Ej. Sentencia condenatoria en primera instancia" />
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); }}
                className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer
                  ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
              >
                <Upload size={24} className={dragOver ? "text-primary" : "text-muted-foreground"} />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Arrastre el archivo aquí o haga clic para seleccionar</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, JPG, PNG — Máximo 20 MB por archivo</p>
                </div>
                <Btn variant="secondary" size="sm">Seleccionar archivo</Btn>
              </div>

              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-900/30 rounded-lg">
                <AlertTriangle size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  Los archivos se almacenan de forma privada. El sistema renombra el archivo automáticamente y valida su tipo real antes de guardar.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-6 pb-5">
              <Btn variant="secondary" onClick={() => { setShowUpload(false); setDragOver(false); }}>Cancelar</Btn>
              <Btn icon={Upload} onClick={() => { setShowUpload(false); setDragOver(false); }}>Subir Documento</Btn>
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
              <Btn variant="danger" icon={Trash2} onClick={() => { setDocs(p => p.filter(d => d.id !== deleteId)); setDeleteId(null); }}>Eliminar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Reports View ─────────────────────────────────────────────────────────────

function ReportsView() {
  const reports = [
    { name: "Expedientes por Estatus", desc: "Lista completa de expedientes agrupados por estado del imputado", icon: FolderOpen, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
    { name: "Prófugos y Rebeldes Activos", desc: "Reporte operativo de imputados en fuga o rebeldía con alertas vigentes", icon: UserX, color: "text-red-600 bg-red-50 dark:bg-red-900/20" },
    { name: "Alertas Activas por Tipo", desc: "Consolidado de alertas rojas, migratorias y órdenes de arresto vigentes", icon: AlertOctagon, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
    { name: "Casos por Jurisdicción", desc: "Distribución geográfica de expedientes por provincia y municipio", icon: MapPin, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
    { name: "Casos por Analista", desc: "Carga de trabajo y rendimiento de analistas asignados", icon: Users, color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20" },
    { name: "Evolución Temporal", desc: "Tendencia de recepción e ingreso de casos en el tiempo", icon: TrendingUp, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" },
    { name: "Sanciones Económicas", desc: "Reporte de multas, decomisos, indemnizaciones y garantías económicas", icon: Scale, color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20" },
    { name: "Auditoría de Usuarios", desc: "Actividad de usuarios: accesos, modificaciones y exportaciones", icon: Database, color: "text-slate-600 bg-slate-50 dark:bg-slate-900/20" },
  ];
  return (
    <div className="p-6">
      <SectionHeader
        title="Reportes y Exportaciones"
        sub="Generación de reportes con identidad institucional en PDF y Excel"
      />
      <div className="flex flex-wrap gap-3 mb-6 px-4 py-3 bg-card border border-border rounded-lg">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Período</label>
          <select className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[160px]">
            {["Nov 2024", "Oct 2024", "2024 (completo)", "2023", "Personalizado"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Jurisdicción</label>
          <select className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[160px]">
            <option>Todas</option>
            {JURISDICCIONES.map(j => <option key={j}>{j}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Analista</label>
          <select className="text-xs bg-muted/50 border border-border rounded-md px-2 py-1.5 text-foreground outline-none min-w-[140px]">
            <option>Todos</option>
            {["Ana Rodríguez", "Luis Peña", "María Santos", "Pedro Álvarez"].map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map(r => (
          <div key={r.name} className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${r.color}`}>
              <r.icon size={17} />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">{r.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{r.desc}</p>
            </div>
            <div className="flex gap-2 mt-auto">
              <Btn variant="secondary" size="sm" icon={Printer} onClick={triggerPrint}>PDF</Btn>
              <Btn variant="secondary" size="sm" icon={FileSpreadsheet} onClick={() => downloadCSV(["Reporte"], [[r.name]], `${r.name.replace(/ /g,"-")}.csv`)}>Excel</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────────────────────────

function SettingsView({ dark, setDark }: { dark: boolean; setDark: (b: boolean) => void }) {
  return (
    <div className="p-6">
      <SectionHeader title="Configuración del Sistema" sub="Parámetros globales y preferencias de la aplicación" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          {
            title: "Apariencia", icon: Sun, items: [
              { label: "Tema de la interfaz", comp: <div className="flex gap-2">
                <button onClick={() => setDark(false)} className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${!dark ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>Claro</button>
                <button onClick={() => setDark(true)} className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${dark ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>Oscuro</button>
              </div>}
            ]
          },
          {
            title: "Seguridad", icon: Lock, items: [
              { label: "Tiempo de sesión (minutos)", comp: <input type="number" defaultValue="30" className="w-24 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none text-foreground" /> },
              { label: "Intentos máximos de login", comp: <input type="number" defaultValue="5" className="w-24 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none text-foreground" /> },
              { label: "MFA obligatorio por rol", comp: <select className="text-sm bg-input-background border border-border rounded-md px-2 py-1.5 outline-none text-foreground"><option>Administrador y Supervisor</option></select> },
            ]
          },
          {
            title: "Archivos Adjuntos", icon: FileText, items: [
              { label: "Tamaño máximo por archivo", comp: <select className="text-sm bg-input-background border border-border rounded-md px-2 py-1.5 outline-none text-foreground"><option>20 MB</option><option>10 MB</option><option>50 MB</option></select> },
              { label: "Tipos permitidos", comp: <input defaultValue="PDF, DOCX, XLSX, JPG, PNG" className="w-64 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none text-foreground" /> },
            ]
          },
          {
            title: "Sistema", icon: Database, items: [
              { label: "Nombre del sistema", comp: <input defaultValue="UCAPREC" className="w-40 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none text-foreground" /> },
              { label: "Institución", comp: <input defaultValue="Ministerio Público" className="w-64 px-3 py-1.5 text-sm bg-input-background border border-border rounded-md outline-none text-foreground" /> },
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
                <div key={label} className="flex items-center justify-between">
                  <label className="text-sm text-foreground">{label}</label>
                  {comp}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Btn variant="secondary">Restablecer valores por defecto</Btn>
        <Btn icon={CheckCircle}>Guardar Configuración</Btn>
      </div>
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
  "case-form": "Editar Expediente", defendants: "Imputados", victims: "Víctimas",
  measures: "Medidas y Alertas", documents: "Documentos", reports: "Reportes",
  analytics: "Analítica", users: "Usuarios y Roles", audit: "Auditoría",
  catalogs: "Catálogos", settings: "Configuración",
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  const renderView = () => {
    switch (view) {
      case "dashboard": return <DashboardView setView={navigate} />;
      case "cases": return <CasesView setView={navigate} />;
      case "case-detail": return <CaseDetailView setView={navigate} mode="detail" />;
      case "case-form": return <CaseDetailView setView={navigate} mode="form" />;
      case "defendants": return <DefendantsView setView={navigate} />;
      case "victims": return <VictimsView setView={navigate} />;
      case "measures": return <MeasuresView setView={navigate} />;
      case "documents": return <DocumentsView setView={navigate} />;
      case "reports": return <ReportsView />;
      case "analytics": return <AnalyticsView />;
      case "users": return <UsersView />;
      case "audit": return <AuditView />;
      case "catalogs": return <CatalogsView />;
      case "settings": return <SettingsView dark={dark} setDark={setDark} />;
      default: return <DashboardView setView={navigate} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Sidebar view={view} setView={navigate} navigateModule={navigateModule} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          title={VIEW_TITLES[view]}
          dark={dark}
          setDark={setDark}
          setView={navigate}
          goBack={goBack}
          canGoBack={canGoBack}
          breadcrumb={breadcrumb}
        />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
