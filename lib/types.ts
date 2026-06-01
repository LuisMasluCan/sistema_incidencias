// Types for the Disciplinary Control System

export interface Empleado {
  id: string;
  nombreCompleto: string;
  dni: string;
  // cargo kept for legacy keys; use `cargoId` for dynamic cargos
  cargo: string;
  cargoId?: string;
  fechaIngreso: string;
  estado: 'activo' | 'inactivo';
}

export interface Incidencia {
  id: string;
  empleadoId: string;
  fecha: string;
  tipoFalta: 'leve' | 'grave';
  categoria: string;
  descripcion: string;
  medidaAplicada: string;
  evidencia: string;
  negativaFirmar: boolean;
  testigos: string;
  memorandumId?: string;
}

export interface Memorandum {
  id: string;
  empleadoId: string;
  incidenciaId?: string;
  fecha: string;
  asunto: string;
  descripcion: string;
  baseNormativa: string[];
  montoBonoAfectado: number;
  negativaFirmar: boolean;
  testigos: string;
}

export interface ReglaDescuento {
  id: string;
  nombre: string;
  tipo: 'tardanza' | 'falta_leve' | 'falta_grave' | 'amonestacion' | 'memorandum';
  porcentajeDescuento: number;
  activa: boolean;
}

export interface BonoEmpleado {
  empleadoId: string;
  mes: string; // Format: YYYY-MM
  bonoBruto: number;
  deducciones: {
    concepto: string;
    monto: number;
    cantidad: number;
  }[];
  bonoLiquido: number;
  perdidaTotal: boolean;
  razonPerdida?: string;
}

// New types to support configurable bonos and cargos
export interface TipoBono {
  id: string;
  nombre: string; // e.g. "Bono Disciplina"
  monto_base: number;
  activo: boolean;
  periodicidad: 'mensual' | 'quincenal' | 'semanal' | 'unico';
  reglas?: string[]; // optional reference to regla ids
}

export interface Cargo {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export const CARGOS: Record<string, string> = {
  tecnico: 'Técnico',
  ayudante: 'Ayudante',
  asesor: 'Asesor',
  administrativo: 'Administrativo',
  lavado: 'Personal de Lavado',
  supervisor: 'Supervisor'
};

export const FALTAS_LEVES = [
  'Tardanza injustificada',
  'Mala presentación personal',
  'Uso excesivo del celular',
  'Desorden en área de trabajo',
  'Conversaciones excesivas',
  'Incumplimiento de horarios de descanso',
  'No portar uniforme correctamente',
  'Descuido en limpieza del área',
  'Uso inadecuado de herramientas',
  'Falta de comunicación con supervisores'
];

export const FALTAS_GRAVES = [
  'Desobediencia directa a superiores',
  'Faltas de respeto a compañeros',
  'Agresión verbal o física',
  'Daños por negligencia',
  'Robo o hurto',
  'Abandono del puesto de trabajo',
  'Falsificación de documentos',
  'Inasistencia injustificada',
  'Consumo de alcohol o sustancias',
  'Divulgación de información confidencial',
  'Acoso laboral',
  'Reincidencia en faltas leves (3+ en 30 días)'
];

export const MEDIDAS_DISCIPLINARIAS = [
  'Conversación verbal',
  'Registro de incidencia',
  'Amonestación escrita',
  'Memorándum formal',
  'Suspensión de bonos',
  'Suspensión temporal',
  'Otras medidas conforme a ley'
];

export const ARTICULOS_REGLAMENTO = [
  'Art. 5 - Obligaciones del trabajador',
  'Art. 10 - Puntualidad y asistencia',
  'Art. 15 - Uso de equipos y herramientas',
  'Art. 20 - Conducta y comportamiento',
  'Art. 25 - Confidencialidad',
  'Art. 26 - Sanciones disciplinarias',
  'Art. 30 - Faltas leves y sus consecuencias',
  'Art. 35 - Faltas graves y sus consecuencias',
  'Art. 40 - Procedimiento disciplinario',
  'Art. 45 - Derecho a defensa del trabajador'
];

// DEPRECATION NOTE: BONO_BASE is kept as fallback for older code.
export const BONO_BASE = 150;
