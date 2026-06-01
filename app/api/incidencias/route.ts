import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Incidencia } from '@/lib/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const empleadoId = url.searchParams.get('empleadoId');
  const id = url.searchParams.get('id');

  if (id) {
    const result = await query<Incidencia>('SELECT * FROM incidencias WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0] || null);
  }

  if (empleadoId) {
    const result = await query<Incidencia>('SELECT * FROM incidencias WHERE empleado_id = $1 ORDER BY fecha DESC', [empleadoId]);
    return NextResponse.json(result.rows);
  }

  const result = await query<Incidencia>('SELECT * FROM incidencias ORDER BY fecha DESC');
  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  const incidencia = (await request.json()) as Incidencia;
  await query(
    `INSERT INTO incidencias 
      (id, empleado_id, fecha, tipo_falta, categoria, descripcion, medida_aplicada, evidencia, negativa_firmar, testigos, memorandum_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       empleado_id = EXCLUDED.empleado_id,
       fecha = EXCLUDED.fecha,
       tipo_falta = EXCLUDED.tipo_falta,
       categoria = EXCLUDED.categoria,
       descripcion = EXCLUDED.descripcion,
       medida_aplicada = EXCLUDED.medida_aplicada,
       evidencia = EXCLUDED.evidencia,
       negativa_firmar = EXCLUDED.negativa_firmar,
       testigos = EXCLUDED.testigos,
       memorandum_id = EXCLUDED.memorandum_id`,
    [
      incidencia.id,
      incidencia.empleadoId,
      incidencia.fecha,
      incidencia.tipoFalta,
      incidencia.categoria,
      incidencia.descripcion,
      incidencia.medidaAplicada,
      incidencia.evidencia,
      incidencia.negativaFirmar,
      incidencia.testigos,
      incidencia.memorandumId || null
    ]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

  await query('DELETE FROM incidencias WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
