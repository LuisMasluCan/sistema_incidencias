import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Memorandum } from '@/lib/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const empleadoId = url.searchParams.get('empleadoId');
  const id = url.searchParams.get('id');

  if (id) {
    const result = await query<Memorandum>('SELECT * FROM memorandums WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0] || null);
  }

  if (empleadoId) {
    const result = await query<Memorandum>('SELECT * FROM memorandums WHERE empleado_id = $1 ORDER BY fecha DESC', [empleadoId]);
    return NextResponse.json(result.rows);
  }

  const result = await query<Memorandum>('SELECT * FROM memorandums ORDER BY fecha DESC');
  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  const memorandum = (await request.json()) as Memorandum;
  await query(
    `INSERT INTO memorandums
      (id, empleado_id, incidencia_id, fecha, asunto, descripcion, base_normativa, monto_bono_afectado, negativa_firmar, testigos)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET
       empleado_id = EXCLUDED.empleado_id,
       incidencia_id = EXCLUDED.incidencia_id,
       fecha = EXCLUDED.fecha,
       asunto = EXCLUDED.asunto,
       descripcion = EXCLUDED.descripcion,
       base_normativa = EXCLUDED.base_normativa,
       monto_bono_afectado = EXCLUDED.monto_bono_afectado,
       negativa_firmar = EXCLUDED.negativa_firmar,
       testigos = EXCLUDED.testigos`,
    [
      memorandum.id,
      memorandum.empleadoId,
      memorandum.incidenciaId || null,
      memorandum.fecha,
      memorandum.asunto,
      memorandum.descripcion,
      JSON.stringify(memorandum.baseNormativa),
      memorandum.montoBonoAfectado,
      memorandum.negativaFirmar,
      memorandum.testigos
    ]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

  await query('DELETE FROM memorandums WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
