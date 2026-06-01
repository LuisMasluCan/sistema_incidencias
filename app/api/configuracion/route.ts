import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Cargo, ReglaDescuento, TipoBono } from '@/lib/types';

interface ConfiguracionPayload {
  cargos: Cargo[];
  tiposBono: TipoBono[];
  reglas: ReglaDescuento[];
}

export async function GET() {
  const [cargosResult, tiposResult, reglasResult] = await Promise.all([
    query<Cargo>('SELECT * FROM cargos ORDER BY nombre'),
    query<TipoBono>('SELECT * FROM tipos_bono ORDER BY nombre'),
    query<ReglaDescuento>('SELECT * FROM reglas_descuento ORDER BY nombre')
  ]);

  return NextResponse.json({
    cargos: cargosResult.rows,
    tiposBono: tiposResult.rows,
    reglas: reglasResult.rows
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ConfiguracionPayload;

  await query('DELETE FROM cargos');
  await query('DELETE FROM tipos_bono');
  await query('DELETE FROM reglas_descuento');

  const insertCargo = `INSERT INTO cargos (id, nombre, descripcion, activo) VALUES ($1, $2, $3, $4)`;
  const insertTipo = `INSERT INTO tipos_bono (id, nombre, monto_base, activo, periodicidad, reglas) VALUES ($1, $2, $3, $4, $5, $6)`;
  const insertRegla = `INSERT INTO reglas_descuento (id, nombre, tipo, porcentaje_descuento, activa) VALUES ($1, $2, $3, $4, $5)`;

  for (const cargo of payload.cargos) {
    await query(insertCargo, [cargo.id, cargo.nombre, cargo.descripcion || '', cargo.activo]);
  }

  for (const tipo of payload.tiposBono) {
    await query(insertTipo, [tipo.id, tipo.nombre, tipo.monto_base, tipo.activo, tipo.periodicidad, JSON.stringify(tipo.reglas || [])]);
  }

  for (const regla of payload.reglas) {
    await query(insertRegla, [regla.id, regla.nombre, regla.tipo, regla.porcentajeDescuento, regla.activa]);
  }

  return NextResponse.json({ ok: true });
}
