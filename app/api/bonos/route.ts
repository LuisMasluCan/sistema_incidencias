import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calcularBono, getActiveTipoBono } from '@/lib/business';
import type { BonoEmpleado, Empleado, Incidencia, Memorandum, ReglaDescuento, TipoBono } from '@/lib/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mes = url.searchParams.get('mes');
  if (!mes) {
    return NextResponse.json({ error: 'Missing mes parameter' }, { status: 400 });
  }

  const [empleadosRes, incidenciasRes, memorandumsRes, reglasRes, tiposRes] = await Promise.all([
    query<Empleado>('SELECT * FROM empleados WHERE estado = $1', ['activo']),
    query<Incidencia>('SELECT * FROM incidencias'),
    query<Memorandum>('SELECT * FROM memorandums'),
    query<ReglaDescuento>('SELECT * FROM reglas_descuento'),
    query<TipoBono>('SELECT * FROM tipos_bono')
  ]);

  const bonos = empleadosRes.rows.map((empleado) => calcularBono(
    empleado.id,
    mes,
    incidenciasRes.rows,
    memorandumsRes.rows,
    reglasRes.rows,
    tiposRes.rows
  ));

  return NextResponse.json(bonos);
}
