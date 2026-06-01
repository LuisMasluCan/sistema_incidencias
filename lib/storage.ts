import { v4 as uuidv4 } from 'uuid';
import type { BonoEmpleado, Cargo, Empleado, Incidencia, Memorandum, ReglaDescuento, TipoBono } from './types';
import { BONO_BASE } from './types';
import {
  getActiveTipoBono as businessGetActiveTipoBono,
  checkAcumulacionFaltas as businessCheckAcumulacionFaltas,
  getBonosDelMes as businessGetBonosDelMes,
  getDashboardStats as businessGetDashboardStats
} from './business';

const API_ROOT = '/api';

// Storage keys
const KEYS = {
  empleados: 'rgr_empleados',
  incidencias: 'rgr_incidencias',
  memorandums: 'rgr_memorandums',
  reglas: 'rgr_reglas_descuento',
  bonos: 'rgr_bonos',
  cargos: 'rgr_cargos',
  tiposBono: 'rgr_tipos_bono'
};

// Generate UUID
export function generateId(): string {
  return uuidv4();
}

// Date utilities
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('es-PE', { year: 'numeric', month: 'long' });
}

function getFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (typeof window === 'undefined') {
    throw new Error('API calls must be made from the browser.');
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined)
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function getConfiguracion() {
  try {
    return await apiFetch<{ cargos: Cargo[]; tiposBono: TipoBono[]; reglas: ReglaDescuento[] }>(`${API_ROOT}/configuracion`);
  } catch {
    return {
      cargos: getFromStorage<Cargo[]>(KEYS.cargos) || [],
      tiposBono: getFromStorage<TipoBono[]>(KEYS.tiposBono) || [],
      reglas: getFromStorage<ReglaDescuento[]>(KEYS.reglas) || []
    };
  }
}

async function saveConfiguracion(payload: { cargos: Cargo[]; tiposBono: TipoBono[]; reglas: ReglaDescuento[] }) {
  await apiFetch(`${API_ROOT}/configuracion`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function cleanupLocalStorage(): void {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach((key) => window.localStorage.removeItem(key));
}

function getConfiguracionFromStorage() {
  return {
    cargos: getFromStorage<Cargo[]>(KEYS.cargos) || [],
    tiposBono: getFromStorage<TipoBono[]>(KEYS.tiposBono) || [],
    reglas: getFromStorage<ReglaDescuento[]>(KEYS.reglas) || []
  };
}

function saveConfiguracionToStorage(payload: { cargos: Cargo[]; tiposBono: TipoBono[]; reglas: ReglaDescuento[] }) {
  saveToStorage(KEYS.cargos, payload.cargos);
  saveToStorage(KEYS.tiposBono, payload.tiposBono);
  saveToStorage(KEYS.reglas, payload.reglas);
}

function getEmpleadosFromStorage(): Empleado[] {
  return getFromStorage<Empleado[]>(KEYS.empleados) || [];
}

function saveEmpleadosToStorage(empleados: Empleado[]): void {
  saveToStorage(KEYS.empleados, empleados);
}

function getIncidenciasFromStorage(): Incidencia[] {
  return getFromStorage<Incidencia[]>(KEYS.incidencias) || [];
}

function saveIncidenciasToStorage(incidencias: Incidencia[]): void {
  saveToStorage(KEYS.incidencias, incidencias);
}

function getMemorandumsFromStorage(): Memorandum[] {
  return getFromStorage<Memorandum[]>(KEYS.memorandums) || [];
}

function saveMemorandumsToStorage(memorandums: Memorandum[]): void {
  saveToStorage(KEYS.memorandums, memorandums);
}

export function getEmpleados(): Empleado[] {
  return getEmpleadosFromStorage();
}

export async function getEmpleadosApi(): Promise<Empleado[]> {
  return apiFetch<Empleado[]>(`${API_ROOT}/empleados`);
}

export function getEmpleadoById(id: string): Empleado | null {
  return getEmpleadosFromStorage().find(e => e.id === id) || null;
}

export async function getEmpleadoByIdApi(id: string): Promise<Empleado | null> {
  return apiFetch<Empleado | null>(`${API_ROOT}/empleados?id=${encodeURIComponent(id)}`);
}

export function saveEmpleado(empleado: Empleado): void {
  const empleados = getEmpleadosFromStorage();
  const index = empleados.findIndex(e => e.id === empleado.id);
  if (index >= 0) {
    empleados[index] = empleado;
  } else {
    empleados.push(empleado);
  }
  saveEmpleadosToStorage(empleados);
}

export async function saveEmpleadoApi(empleado: Empleado): Promise<void> {
  await apiFetch(`${API_ROOT}/empleados`, {
    method: 'POST',
    body: JSON.stringify(empleado)
  });
}

export function deleteEmpleado(id: string): void {
  saveEmpleadosToStorage(getEmpleadosFromStorage().filter(e => e.id !== id));
}

export async function deleteEmpleadoApi(id: string): Promise<void> {
  await apiFetch(`${API_ROOT}/empleados?id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export function getCargos(): Cargo[] {
  const config = getConfiguracionFromStorage();
  return config.cargos;
}

export async function getCargosApi(): Promise<Cargo[]> {
  const config = await getConfiguracion();
  return config.cargos;
}

export function saveCargos(cargos: Cargo[]): void {
  const config = getConfiguracionFromStorage();
  saveConfiguracionToStorage({ ...config, cargos });
}

export async function saveCargosApi(cargos: Cargo[]): Promise<void> {
  const config = await getConfiguracion();
  await saveConfiguracion({ ...config, cargos });
}

export function getCargoNameForEmpleado(empleado: any, cargos: Cargo[] = []): string {
  const list = cargos.length > 0 ? cargos : [];
  if (empleado.cargoId) {
    const c = list.find(x => x.id === empleado.cargoId);
    return c ? c.nombre : (empleado.cargo || 'N/A');
  }
  return (empleado.cargo && typeof empleado.cargo === 'string') ?
    ({ tecnico: 'Técnico', ayudante: 'Ayudante', asesor: 'Asesor', administrativo: 'Administrativo', lavado: 'Personal de Lavado', supervisor: 'Supervisor' } as Record<string,string>)[empleado.cargo] || empleado.cargo : 'N/A';
}

export function getTipoBonos(): TipoBono[] {
  const config = getConfiguracionFromStorage();
  return config.tiposBono;
}

export async function getTipoBonosApi(): Promise<TipoBono[]> {
  const config = await getConfiguracion();
  return config.tiposBono;
}

export function saveTipoBonos(tipos: TipoBono[]): void {
  const config = getConfiguracionFromStorage();
  saveConfiguracionToStorage({ ...config, tiposBono: tipos });
}

export async function saveTipoBonosApi(tipos: TipoBono[]): Promise<void> {
  const config = await getConfiguracion();
  await saveConfiguracion({ ...config, tiposBono: tipos });
}

export function getActiveTipoBono(): TipoBono {
  const tipos = getTipoBonos();
  return businessGetActiveTipoBono(tipos);
}

export async function getActiveTipoBonoApi(): Promise<TipoBono> {
  const tipos = await getTipoBonosApi();
  return businessGetActiveTipoBono(tipos);
}

export function getIncidencias(): Incidencia[] {
  return getIncidenciasFromStorage();
}

export async function getIncidenciasApi(): Promise<Incidencia[]> {
  return apiFetch<Incidencia[]>(`${API_ROOT}/incidencias`);
}

export function getIncidenciaById(id: string): Incidencia | null {
  return getIncidenciasFromStorage().find(i => i.id === id) || null;
}

export async function getIncidenciaByIdApi(id: string): Promise<Incidencia | null> {
  return apiFetch<Incidencia | null>(`${API_ROOT}/incidencias?id=${encodeURIComponent(id)}`);
}

export function getIncidenciasByEmpleado(empleadoId: string): Incidencia[] {
  return getIncidenciasFromStorage().filter(i => i.empleadoId === empleadoId);
}

export async function getIncidenciasByEmpleadoApi(empleadoId: string): Promise<Incidencia[]> {
  return apiFetch<Incidencia[]>(`${API_ROOT}/incidencias?empleadoId=${encodeURIComponent(empleadoId)}`);
}

export function saveIncidencia(incidencia: Incidencia): void {
  const incidencias = getIncidenciasFromStorage();
  const index = incidencias.findIndex(i => i.id === incidencia.id);
  if (index >= 0) {
    incidencias[index] = incidencia;
  } else {
    incidencias.push(incidencia);
  }
  saveIncidenciasToStorage(incidencias);
}

export async function saveIncidenciaApi(incidencia: Incidencia): Promise<void> {
  await apiFetch(`${API_ROOT}/incidencias`, {
    method: 'POST',
    body: JSON.stringify(incidencia)
  });
}

export function deleteIncidencia(id: string): void {
  saveIncidenciasToStorage(getIncidenciasFromStorage().filter(i => i.id !== id));
}

export async function deleteIncidenciaApi(id: string): Promise<void> {
  await apiFetch(`${API_ROOT}/incidencias?id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export function getMemorandums(): Memorandum[] {
  return getMemorandumsFromStorage();
}

export async function getMemorandumsApi(): Promise<Memorandum[]> {
  return apiFetch<Memorandum[]>(`${API_ROOT}/memorandums`);
}

export function getMemorandumById(id: string): Memorandum | null {
  return getMemorandumsFromStorage().find(m => m.id === id) || null;
}

export async function getMemorandumByIdApi(id: string): Promise<Memorandum | null> {
  return apiFetch<Memorandum | null>(`${API_ROOT}/memorandums?id=${encodeURIComponent(id)}`);
}

export function getMemorandumsByEmpleado(empleadoId: string): Memorandum[] {
  return getMemorandumsFromStorage().filter(m => m.empleadoId === empleadoId);
}

export async function getMemorandumsByEmpleadoApi(empleadoId: string): Promise<Memorandum[]> {
  return apiFetch<Memorandum[]>(`${API_ROOT}/memorandums?empleadoId=${encodeURIComponent(empleadoId)}`);
}

export function saveMemorandum(memorandum: Memorandum): void {
  const memorandums = getMemorandumsFromStorage();
  const index = memorandums.findIndex(m => m.id === memorandum.id);
  if (index >= 0) {
    memorandums[index] = memorandum;
  } else {
    memorandums.push(memorandum);
  }
  saveMemorandumsToStorage(memorandums);
}

export async function saveMemorandumApi(memorandum: Memorandum): Promise<void> {
  await apiFetch(`${API_ROOT}/memorandums`, {
    method: 'POST',
    body: JSON.stringify(memorandum)
  });
}

export function deleteMemorandum(id: string): void {
  saveMemorandumsToStorage(getMemorandumsFromStorage().filter(m => m.id !== id));
}

export async function deleteMemorandumApi(id: string): Promise<void> {
  await apiFetch(`${API_ROOT}/memorandums?id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export function getReglas(): ReglaDescuento[] {
  const config = getConfiguracionFromStorage();
  return config.reglas;
}

export async function getReglasApi(): Promise<ReglaDescuento[]> {
  const config = await getConfiguracion();
  return config.reglas;
}

export function saveReglas(reglas: ReglaDescuento[]): void {
  const config = getConfiguracionFromStorage();
  saveConfiguracionToStorage({ ...config, reglas });
}

export async function saveReglasApi(reglas: ReglaDescuento[]): Promise<void> {
  const config = await getConfiguracion();
  await saveConfiguracion({ ...config, reglas });
}

export function checkAcumulacionFaltas(empleadoId: string) {
  const incidencias = getIncidenciasByEmpleado(empleadoId);
  return businessCheckAcumulacionFaltas(empleadoId, incidencias);
}

export async function checkAcumulacionFaltasApi(empleadoId: string) {
  const incidencias = await getIncidenciasByEmpleadoApi(empleadoId);
  return businessCheckAcumulacionFaltas(empleadoId, incidencias);
}

export function getBonosDelMes(mes: string): BonoEmpleado[] {
  const empleados = getEmpleadosFromStorage().filter(e => e.estado === 'activo');
  const incidencias = getIncidenciasFromStorage();
  const memorandums = getMemorandumsFromStorage();
  const reglas = getReglas();
  const tiposBono = getTipoBonos();
  return businessGetBonosDelMes(mes, empleados, incidencias, memorandums, reglas, tiposBono);
}

export async function getBonosDelMesApi(mes: string): Promise<BonoEmpleado[]> {
  return apiFetch<BonoEmpleado[]>(`${API_ROOT}/bonos?mes=${encodeURIComponent(mes)}`);
}

export function getDashboardStats() {
  const empleados = getEmpleadosFromStorage();
  const incidencias = getIncidenciasFromStorage();
  const memorandums = getMemorandumsFromStorage();
  const reglas = getReglas();
  const tiposBono = getTipoBonos();
  return businessGetDashboardStats(empleados, incidencias, memorandums, reglas, tiposBono);
}

export async function getDashboardStatsApi() {
  return apiFetch<{ totalEmpleados: number; empleadosActivos: number; incidenciasDelMes: number; totalBonos: number; empleadosEnRiesgo: number; alertasAcumulacion: number }>(`${API_ROOT}/dashboard`);
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (typeof window === 'undefined' || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}
