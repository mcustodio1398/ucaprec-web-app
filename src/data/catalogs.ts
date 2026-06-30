// ─── Catálogos UCAPREC ────────────────────────────────────────────────────────
// Generados desde los archivos CSV oficiales del sistema

// Sectores base compartidos por todos los municipios hasta cargar el catálogo oficial completo.
const S = ["N/A", "Centro", "Los Jardines", "Villa Progreso", "Las Flores", "El Millón", "San Carlos", "Villa María", "Zona Urbana", "Zona Rural", "Ensanche", "Barrio Nuevo", "Los Prados", "La Esperanza"];

// ─── Geografía: Provincia → Municipio → Sectores ────────────────────────────

export const GEO: Record<string, Record<string, string[]>> = {
  "Distrito Nacional": {
    "Distrito Nacional": S,
  },
  "Santo Domingo": {
    "Santo Domingo Este": S,
    "Santo Domingo Norte": S,
    "Santo Domingo Oeste": S,
    "Boca Chica": S,
    "Los Alcarrizos": S,
    "Pedro Brand": S,
  },
  "Santiago": {
    "Santiago de los Caballeros": S,
    "Tamboril": S,
    "Villa González": S,
    "Licey al Medio": S,
  },
  "La Vega": {
    "La Vega": S,
    "Constanza": S,
    "Jarabacoa": S,
    "Jima Abajo": S,
  },
  "San Cristóbal": {
    "San Cristóbal": S,
    "Bajos de Haina": S,
    "Villa Altagracia": S,
  },
  "Puerto Plata": {
    "Puerto Plata": S,
    "Sosúa": S,
    "Cabarete": S,
    "Imbert": S,
  },
  "Duarte": {
    "San Francisco de Macorís": S,
    "Arenoso": S,
    "Castillo": S,
    "Villa Riva": S,
  },
  "La Romana": {
    "La Romana": S,
    "Guaymate": S,
    "Villa Hermosa": S,
  },
  "San Pedro de Macorís": {
    "San Pedro de Macorís": S,
    "Quisqueya": S,
    "Consuelo": S,
  },
  "Azua": {
    "Azua de Compostela": S,
    "Estebanía": S,
    "Las Charcas": S,
  },
  "Barahona": {
    "Barahona": S,
    "Cabral": S,
    "Enriquillo": S,
  },
  "Monseñor Nouel": {
    "Bonao": S,
    "Maimón": S,
    "Piedra Blanca": S,
  },
  "Espaillat": {
    "Moca": S,
    "Gaspar Hernández": S,
    "Jamao al Norte": S,
  },
  "Peravia": {
    "Baní": S,
    "Nizao": S,
    "Matanzas": S,
  },
  "San Juan": {
    "San Juan de la Maguana": S,
    "Las Matas de Farfán": S,
    "El Cercado": S,
  },
  "Monte Plata": {
    "Monte Plata": S,
    "Sabana Grande de Boyá": S,
    "Peralvillo": S,
  },
  "Hermanas Mirabal": {
    "Salcedo": S,
    "Tenares": S,
    "Villa Tapia": S,
  },
  "El Seibo": {
    "El Seibo": S,
    "Miches": S,
  },
  "Hato Mayor": {
    "Hato Mayor del Rey": S,
    "Sabana de la Mar": S,
    "El Valle": S,
  },
  "Sánchez Ramírez": {
    "Cotuí": S,
    "Cevicos": S,
    "Fantino": S,
  },
  "Valverde": {
    "Mao": S,
    "Esperanza": S,
    "Laguna Salada": S,
  },
  "Montecristi": {
    "Montecristi": S,
    "Manzanillo": S,
    "Villa Vásquez": S,
  },
  "Dajabón": {
    "Dajabón": S,
    "Loma de Cabrera": S,
    "Restauración": S,
  },
};

export const PROVINCIAS = Object.keys(GEO).sort();

export function getMunicipios(provincia: string): string[] {
  return Object.keys(GEO[provincia] ?? {});
}

export function getSectores(provincia: string, municipio: string): string[] {
  return GEO[provincia]?.[municipio] ?? [];
}

// ─── Infracciones / Delitos ──────────────────────────────────────────────────

export const INFRACCIONES = [
  "Abuso de Autoridad y Falsedad",
  "Abuso de Confianza",
  "Abuso Físico",
  "Abuso Infantil",
  "Abuso Psicológico",
  "Abuso Psicológico contra menor",
  "Abuso Sexual",
  "Abuso Sexual contra menor",
  "Acoso Sexual",
  "Agresión Física",
  "Agresión Sexual",
  "Agresión Sexual contra menor",
  "Amenaza",
  "Asociación de Malhechores",
  "Chantaje",
  "Conducción Temeraria",
  "Contrabando",
  "Corrupción Administrativa",
  "Crímenes y Delitos de Alta Tecnología",
  "Delito contra la propiedad industrial",
  "Delito contra la propiedad privada",
  "Delito Sexual",
  "Delitos Tributarios",
  "Difamación e Injuria",
  "Estafa",
  "Explotación Sexual",
  "Extorsión",
  "Falsificación",
  "Golpes y Heridas",
  "Golpes y Heridas contra menor",
  "Homicidio",
  "Incendio",
  "Incesto",
  "Incumplimiento de pensión alimentaria",
  "Indeterminado",
  "Injuria",
  "Lavado de activos",
  "Maltrato Infantil",
  "Narcotráfico",
  "Otros",
  "Parricidio",
  "Perjuicio",
  "Perjurio contra menor",
  "Porte ilegal de armas",
  "Robo",
  "Secuestro",
  "Seducción",
  "Seducción contra menor",
  "Soborno",
  "Sustracción de menor",
  "Tentativa de Homicidio",
  "Tentativa de Robo",
  "Tortura y Actos de Barbarie",
  "Trabajo Pagado y no Realizado",
  "Trabajo Realizado y no Pagado",
  "Trata de persona",
  "Violación a la Ley Cheques",
  "Violación a la Ley de Armas",
  "Violación a la Ley de Electricidad",
  "Violación a la Ley de Tránsito",
  "Violación a Ley General de Salud",
  "Violación al Código de Trabajo",
  "Violación Sexual",
  "Violación sexual contra menor",
  "Violencia",
  "Violencia de Género",
  "Violencia Intrafamiliar",
  "Violencia Psicológica",
  "Violencia Verbal",
  "Vulneración de derechos de menor",
];

// ─── Centros Penitenciarios ──────────────────────────────────────────────────

export const CENTROS_PENITENCIARIOS = [
  "Penitenciaría Nacional de La Victoria (Santo Domingo Norte)",
  "Cárcel de Najayo Hombres (San Cristóbal)",
  "Cárcel de Najayo Mujeres (San Cristóbal)",
  "Cárcel de Rafey (Santiago)",
  "Cárcel Pública de Santiago Rodríguez",
  "Cárcel Pública de Dajabón",
  "Cárcel Pública de Montecristi",
  "Cárcel Pública de Mao (Valverde)",
  "Cárcel Pública de Puerto Plata",
  "Cárcel Pública de Espaillat (Moca)",
  "Cárcel Pública de La Vega",
  "Cárcel Pública de Bonao (Monseñor Nouel)",
  "Cárcel Pública de Cotuí (Sánchez Ramírez)",
  "Cárcel Pública de San Francisco de Macorís (Duarte)",
  "Cárcel Pública de Nagua (María Trinidad Sánchez)",
  "Cárcel Pública de Samaná",
  "Cárcel Pública de El Seibo",
  "Cárcel Pública de Hato Mayor",
  "Cárcel Pública de La Romana",
  "Cárcel Pública de San Pedro de Macorís (Fortaleza Pedro Santana)",
  "Cárcel Pública de Higüey (La Altagracia)",
  "Cárcel Pública de Monte Plata",
  "Cárcel Pública de Azua",
  "Cárcel Pública de San Juan de la Maguana",
  "Cárcel Pública de Elías Piña (Comendador)",
  "Cárcel Pública de Barahona",
  "Cárcel Pública de Neiba (Bahoruco)",
  "Cárcel Pública de Jimaní (Independencia)",
  "Cárcel Pública de Pedernales",
  "Cárcel de Baní (Peravia)",
  "CCR Najayo (Hombres)",
  "CCR Najayo Mujeres",
  "CCR Rafey Hombres",
  "CCR Rafey Mujeres",
  "CCR Vista al Valle (San Francisco de Macorís)",
  "CCR Cucama (La Romana)",
  "CCR Anamuya (Higüey)",
  "CCR El Pinito (La Vega)",
  "CCR San Felipe (Puerto Plata)",
  "CCR Mao (Valverde)",
  "CCR Monte Plata",
  "CCR Baní Mujeres",
  "CCR Pedro Corto (San Juan)",
  "CCR Azua",
  "CCR Barahona",
  "CCR El Seibo",
  "CCR Hato Mayor",
  "CCR Montecristi",
  "CCR Dajabón",
  "CCR Cotuí",
  "CCR Bonao",
  "CCR Las Parras",
  "Centros de Atención a Privados de Libertad Provisional (CAPLIP)",
];

// ─── Jurisdicciones ──────────────────────────────────────────────────────────

export const JURISDICCIONES = [
  "Azua",
  "Baní",
  "Barahona",
  "Bonao",
  "Constanza",
  "Cotuí",
  "Dajabón",
  "Distrito Nacional",
  "El Seibo",
  "Elías Piña",
  "Hato Mayor",
  "Higüey",
  "Jarabacoa",
  "Jimaní",
  "La Romana",
  "La Vega",
  "Las Matas De Farfán",
  "Mao",
  "Moca",
  "Monte Cristi",
  "Monte Plata",
  "Nagua",
  "Neiba",
  "Pedernales",
  "Puerto Plata",
  "Salcedo",
  "Samaná",
  "San Cristóbal",
  "San Francisco De Macorís",
  "San José De Ocoa",
  "San Juan",
  "San Pedro De Macorís",
  "Santiago",
  "Santiago Rodríguez",
  "Santo Domingo Este",
  "Santo Domingo Oeste",
  "Villa Altagracia",
  "Veron - Punta Cana",
];

// ─── Nacionalidades ──────────────────────────────────────────────────────────

export const NACIONALIDADES = [
  "Dominicano/a",
  "Haitiano/a",
  "Estadounidense",
  "Argentino/a",
  "Boliviano/a",
  "Chileno/a",
  "Colombiano/a",
  "Costarricense",
  "Cubano/a",
  "Ecuatoriano/a",
  "Salvadoreño/a",
  "Guatemalteco/a",
  "Hondureño/a",
  "Mexicano/a",
  "Nicaragüense",
  "Panameño/a",
  "Paraguayo/a",
  "Peruano/a",
  "Puertorriqueño/a",
  "Uruguayo/a",
  "Venezolano/a",
];

// ─── Catálogos fijos del sistema ─────────────────────────────────────────────

export const TIPOS_EXPEDIENTE = ["Resolución", "Sentencia", "Recurso de Casación"];

export const DECISIONES = [
  "Acoge Recurso de Casación",
  "Rechaza Recurso de Casación",
  "Acoge Parcialmente el Recurso de Casación",
  "Inadmisibilidad del Recurso de Casación",
];

export const QUIEN_INTERPONE = ["Imputado", "Víctima"];

export const ESTADOS_REGISTRO = ["Verificado", "En Revisión"];

export const ESTADOS_IMPUTADO = ["Recluido", "Prófugo", "Rebeldía", "Libertad"];

export const ESTADOS_JUDICIALES = ["Condenado", "Absuelto"];

export const TIPOS_ENTIDAD = ["Persona Física", "Persona Jurídica"];

export const SEXOS = ["Hombre", "Mujer", "Persona Jurídica"];

// ─── Metadatos para el módulo de catálogos ──────────────────────────────────

export const CATALOG_META = [
  { nombre: "Provincias",            key: "provincias",      count: PROVINCIAS.length,                          ultima: "CSV oficial" },
  { nombre: "Municipios",            key: "municipios",      count: Object.values(GEO).flatMap(Object.keys).length, ultima: "CSV oficial" },
  { nombre: "Sectores",              key: "sectores",        count: S.length,                                   ultima: "CSV oficial" },
  { nombre: "Infracciones / Delitos",key: "infracciones",   count: INFRACCIONES.length,                        ultima: "CSV oficial" },
  { nombre: "Centros Penitenciarios",key: "centros",        count: CENTROS_PENITENCIARIOS.length,               ultima: "CSV oficial" },
  { nombre: "Jurisdicciones",        key: "jurisdicciones", count: JURISDICCIONES.length,                       ultima: "CSV oficial" },
  { nombre: "Nacionalidades",        key: "nacionalidades", count: NACIONALIDADES.length,                       ultima: "CSV oficial" },
  { nombre: "Tipos de Expediente",   key: "tipos_exp",      count: TIPOS_EXPEDIENTE.length,                    ultima: "Sistema" },
  { nombre: "Decisiones Judiciales", key: "decisiones",     count: DECISIONES.length,                          ultima: "Sistema" },
];
