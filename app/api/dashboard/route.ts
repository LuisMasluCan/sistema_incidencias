import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getDashboardStats } from '@/lib/business';
import type { Empleado, Incidencia, Memorandum, ReglaDescuento, TipoBono } from '@/lib/types';

export async function GET() {
  const [empleadosRes, incidenciasRes, memorandumsRes, reglasRes, tiposRes] = await Promise.all([
    query<Empleado>('SELECT * FROM empleados'),
    query<Incidencia>('SELECT * FROM incidencias'),
    query<Memorandum>('SELECT * FROM memorandums'),
    query<ReglaDescuento>('SELECT * FROM reglas_descuento'),
    query<TipoBono>('SELECT * FROM tipos_bono')
  ]);

  const stats = getDashboardStats(
    empleadosRes.rows,
    incidenciasRes.rows,
    memorandumsRes.rows,
    reglasRes.rows,
    tiposRes.rows
  );

  return NextResponse.json(stats);
}
