import type { BonoEmpleado, Empleado, Incidencia, Memorandum, ReglaDescuento, TipoBono } from './types';
import { BONO_BASE } from './types';

export const getActiveTipoBono = (tipos: TipoBono[]): TipoBono => {
  const found = tipos.find(t => t.activo && t.nombre.toLowerCase().includes('disciplina')) || tipos.find(t => t.activo) || tipos[0];
  if (found) return found;
  return { id: 'default', nombre: 'Bono Disciplina', monto_base: BONO_BASE, activo: true, periodicidad: 'mensual', reglas: [] };
};

export function checkAcumulacionFaltas(empleadoId: string, incidencias: Incidencia[]) {
  const faltasLeves = incidencias.filter(i => i.empleadoId === empleadoId && i.tipoFalta === 'leve');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recientes = faltasLeves.filter(i => new Date(i.fecha) >= thirtyDaysAgo);
  const cantidad = recientes.length;

  if (cantidad >= 3) {
    return {
      alerta: true,
      cantidad,
      mensaje: `ALERTA: El empleado ha acumulado ${cantidad} faltas leves en los últimos 30 días. Se sugiere elevar la siguiente falta a grave o aplicar suspensión de bono.`
    };
  }

  return { alerta: false, cantidad, mensaje: '' };
}

export function calcularBono(
  empleadoId: string,
  mes: string,
  incidencias: Incidencia[],
  memorandums: Memorandum[],
  reglas: ReglaDescuento[],
  tiposBono: TipoBono[]
): BonoEmpleado {
  const incidenciasEmpleado = incidencias.filter(i => i.empleadoId === empleadoId && i.fecha.substring(0, 7) === mes);
  const memorandumsEmpleado = memorandums.filter(m => m.empleadoId === empleadoId && m.fecha.substring(0, 7) === mes);
  const tipo = getActiveTipoBono(tiposBono);

  let bonoBruto = tipo && typeof tipo.monto_base === 'number' ? tipo.monto_base : BONO_BASE;
  const deducciones: { concepto: string; monto: number; cantidad: number }[] = [];

  let tardanzas = 0;
  let faltasLeves = 0;
  let faltasGraves = 0;
  let amonestaciones = 0;

  incidenciasEmpleado.forEach(i => {
    if (i.tipoFalta === 'grave') {
      faltasGraves++;
    } else if (i.categoria.toLowerCase().includes('tardanza')) {
      tardanzas++;
    } else {
      faltasLeves++;
    }

    if (i.medidaAplicada.toLowerCase().includes('amonestación escrita')) {
      amonestaciones++;
    }
  });

  const reglaTardanza = reglas.find(r => r.tipo === 'tardanza' && r.activa);
  const reglaLeve = reglas.find(r => r.tipo === 'falta_leve' && r.activa);
  const reglaGrave = reglas.find(r => r.tipo === 'falta_grave' && r.activa);
  const reglaAmonestacion = reglas.find(r => r.tipo === 'amonestacion' && r.activa);
  const reglaMemo = reglas.find(r => r.tipo === 'memorandum' && r.activa);

  let perdidaTotal = false;
  let razonPerdida = '';

  if (faltasGraves >= 2) {
    perdidaTotal = true;
    razonPerdida = 'Dos o más faltas graves en el mes';
  } else if (tardanzas + faltasLeves >= 5) {
    perdidaTotal = true;
    razonPerdida = 'Cinco o más faltas leves en el mes';
  }

  if (perdidaTotal) {
    return {
      empleadoId,
      mes,
      bonoBruto,
      deducciones: [{ concepto: razonPerdida, monto: bonoBruto, cantidad: 1 }],
      bonoLiquido: 0,
      perdidaTotal: true,
      razonPerdida
    };
  }

  if (tardanzas > 0 && reglaTardanza) {
    const descuento = (bonoBruto * Number(reglaTardanza.porcentaje_descuento ?? reglaTardanza.porcentajeDescuento) / 100) * tardanzas;
    deducciones.push({ concepto: `Tardanzas (${reglaTardanza.porcentaje_descuento ?? reglaTardanza.porcentajeDescuento}% c/u)`, monto: descuento, cantidad: tardanzas });
  }

  if (faltasLeves > 0 && reglaLeve) {
    const descuento = (bonoBruto * Number(reglaLeve.porcentaje_descuento ?? reglaLeve.porcentajeDescuento) / 100) * faltasLeves;
    deducciones.push({ concepto: `Faltas leves (${reglaLeve.porcentaje_descuento ?? reglaLeve.porcentajeDescuento}% c/u)`, monto: descuento, cantidad: faltasLeves });
  }

  if (faltasGraves > 0 && reglaGrave) {
    const descuento = (bonoBruto * Number(reglaGrave.porcentaje_descuento ?? reglaGrave.porcentajeDescuento) / 100) * faltasGraves;
    deducciones.push({ concepto: `Faltas graves (${reglaGrave.porcentaje_descuento ?? reglaGrave.porcentajeDescuento}% c/u)`, monto: descuento, cantidad: faltasGraves });
  }

  if (amonestaciones > 0 && reglaAmonestacion) {
    const descuento = (bonoBruto * Number(reglaAmonestacion.porcentaje_descuento ?? reglaAmonestacion.porcentajeDescuento) / 100) * amonestaciones;
    deducciones.push({ concepto: `Amonestaciones (${reglaAmonestacion.porcentaje_descuento ?? reglaAmonestacion.porcentajeDescuento}% c/u)`, monto: descuento, cantidad: amonestaciones });
  }

  if (memorandumsEmpleado.length > 0 && reglaMemo) {
    const descuento = (bonoBruto * Number(reglaMemo.porcentaje_descuento ?? reglaMemo.porcentajeDescuento) / 100) * memorandumsEmpleado.length;
    deducciones.push({ concepto: `Memorándums (${reglaMemo.porcentaje_descuento ?? reglaMemo.porcentajeDescuento}% c/u)`, monto: descuento, cantidad: memorandumsEmpleado.length });
  }

  const totalDeducciones = deducciones.reduce((sum, d) => sum + d.monto, 0);
  const bonoLiquido = Math.max(0, bonoBruto - totalDeducciones);

  return {
    empleadoId,
    mes,
    bonoBruto,
    deducciones,
    bonoLiquido,
    perdidaTotal: bonoLiquido === 0,
    razonPerdida: bonoLiquido === 0 ? 'Deducciones superan el bono base' : undefined
  };
}

export function getBonosDelMes(
  mes: string,
  empleados: Empleado[],
  incidencias: Incidencia[],
  memorandums: Memorandum[],
  reglas: ReglaDescuento[],
  tiposBono: TipoBono[]
) {
  return empleados.map((empleado) => calcularBono(empleado.id, mes, incidencias, memorandums, reglas, tiposBono));
}

export function getDashboardStats(
  empleados: Empleado[],
  incidencias: Incidencia[],
  memorandums: Memorandum[],
  reglas: ReglaDescuento[],
  tiposBono: TipoBono[]
) {
  const currentMonth = new Date();
  const monthString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const bonos = getBonosDelMes(monthString, empleados.filter(e => e.estado === 'activo'), incidencias, memorandums, reglas, tiposBono);
  const totalBonos = bonos.reduce((sum, b) => sum + b.bonoLiquido, 0);
  const empleadosEnRiesgo = bonos.filter(b => {
    const porcentajeDescuento = ((b.bonoBruto - b.bonoLiquido) / b.bonoBruto) * 100;
    return porcentajeDescuento >= 50;
  }).length;
  const alertasAcumulacion = empleados.filter(e => {
    const check = checkAcumulacionFaltas(e.id, incidencias);
    return check.alerta;
  }).length;

  const incidenciasDelMes = incidencias.filter(i => i.fecha.substring(0, 7) === monthString).length;
  const empleadosActivos = empleados.filter(e => e.estado === 'activo').length;

  return {
    totalEmpleados: empleados.length,
    empleadosActivos,
    incidenciasDelMes,
    totalBonos,
    empleadosEnRiesgo,
    alertasAcumulacion
  };
}
