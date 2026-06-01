import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Empleado } from '@/lib/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    const result = await query<Empleado>('SELECT * FROM empleados WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0] || null);
  }

  const result = await query<Empleado>('SELECT * FROM empleados ORDER BY nombre_completo');
  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  const empleado = (await request.json()) as Empleado;
  await query(
    `INSERT INTO empleados (id, nombre_completo, dni, cargo, cargo_id, fecha_ingreso, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       nombre_completo = EXCLUDED.nombre_completo,
       dni = EXCLUDED.dni,
       cargo = EXCLUDED.cargo,
       cargo_id = EXCLUDED.cargo_id,
       fecha_ingreso = EXCLUDED.fecha_ingreso,
       estado = EXCLUDED.estado`,
    [empleado.id, empleado.nombreCompleto, empleado.dni, empleado.cargo, empleado.cargoId, empleado.fechaIngreso, empleado.estado]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

  await query('DELETE FROM empleados WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
