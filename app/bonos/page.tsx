'use client';

import { Fragment, useEffect, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import {
  DollarSign,
  AlertCircle,
  TrendingDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  getEmpleadosApi,
  getBonosDelMesApi,
  getCurrentMonth,
  getMonthName,
  getActiveTipoBonoApi
} from '@/lib/storage';
import { type Empleado, type BonoEmpleado, type TipoBono } from '@/lib/types';
import { getCargoNameForEmpleado } from '@/lib/storage';

export default function BonosPage() {
  const [bonos, setBonos] = useState<(BonoEmpleado & { empleado: Empleado })[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [mesSeleccionado, setMesSeleccionado] = useState(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [activeTipoBono, setActiveTipoBono] = useState<TipoBono | null>(null);

  const loadData = async () => {
    setLoading(true);
    const empleados = (await getEmpleadosApi()).filter(e => e.estado === 'activo');
    const bonosDelMes = await getBonosDelMesApi(mesSeleccionado);
    const tipoBono = await getActiveTipoBonoApi();

    const bonosConEmpleado = bonosDelMes.map(b => {
      const emp = empleados.find(e => e.id === b.empleadoId);
      return emp ? { ...b, empleado: emp } : null;
    }).filter((b): b is BonoEmpleado & { empleado: Empleado } => b !== null);

    setBonos(bonosConEmpleado);
    setActiveTipoBono(tipoBono);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [mesSeleccionado]);

  const toggleRow = (empleadoId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(empleadoId)) {
      newExpanded.delete(empleadoId);
    } else {
      newExpanded.add(empleadoId);
    }
    setExpandedRows(newExpanded);
  };

  const totalBonoBruto = bonos.reduce((sum, b) => sum + b.bonoBruto, 0);
  const totalBonoLiquido = bonos.reduce((sum, b) => sum + b.bonoLiquido, 0);
  const totalDeducciones = totalBonoBruto - totalBonoLiquido;
  const empleadosEnRiesgo = bonos.filter(b => {
    const porcentaje = ((b.bonoBruto - b.bonoLiquido) / b.bonoBruto) * 100;
    return porcentaje >= 50;
  }).length;

  // Generate month options
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      options.push({
        value,
        label: date.toLocaleDateString('es-PE', { year: 'numeric', month: 'long' })
      });
    }
    return options;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Control de Bonos</h1>
            <p className="text-muted-foreground mt-1">
              Gestión de bonos por disciplina - Bono Base: S/ {activeTipoBono ? activeTipoBono.monto_base.toFixed(2) : '0.00'}
            </p>
          </div>
          <select
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {generateMonthOptions().map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Bono Bruto"
            value={`S/ ${totalBonoBruto.toFixed(2)}`}
            icon={DollarSign}
            color="bg-primary"
          />
          <SummaryCard
            title="Total Deducciones"
            value={`S/ ${totalDeducciones.toFixed(2)}`}
            icon={TrendingDown}
            color="bg-destructive"
          />
          <SummaryCard
            title="Total Bono Líquido"
            value={`S/ ${totalBonoLiquido.toFixed(2)}`}
            icon={DollarSign}
            color="bg-[#22c55e]"
          />
          <SummaryCard
            title="Empleados en Riesgo"
            value={empleadosEnRiesgo}
            subtitle="Descuento >= 50%"
            icon={AlertCircle}
            color="bg-[#f59e0b]"
          />
        </div>

        {/* Bonos Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">
              Detalle de Bonos - {getMonthName(mesSeleccionado)}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground w-10"></th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Empleado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cargo</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Bono Bruto</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Deducciones</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Bono Líquido</th>
                  <th className="text-center p-4 text-sm font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {bonos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No hay empleados activos
                    </td>
                  </tr>
                ) : (
                  bonos.map((bono) => {
                    const isExpanded = expandedRows.has(bono.empleadoId);
                    const totalDeduccion = bono.bonoBruto - bono.bonoLiquido;
                    const porcentajeDeduccion = (totalDeduccion / bono.bonoBruto) * 100;
                    
                    return (
                      <Fragment key={bono.empleadoId}>
                        <tr 
                          className="border-b border-border hover:bg-muted/30 cursor-pointer"
                          onClick={() => toggleRow(bono.empleadoId)}
                        >
                          <td className="p-4">
                            <button className="p-1 hover:bg-muted rounded">
                              {isExpanded ? (
                                <ChevronUp size={18} className="text-muted-foreground" />
                              ) : (
                                <ChevronDown size={18} className="text-muted-foreground" />
                              )}
                            </button>
                          </td>
                          <td className="p-4 text-sm text-foreground font-medium">
                            {bono.empleado.nombreCompleto}
                          </td>
                          <td className="p-4 text-sm text-foreground">
                            {getCargoNameForEmpleado(bono.empleado)}
                          </td>
                          <td className="p-4 text-sm text-foreground text-right">
                            S/ {bono.bonoBruto.toFixed(2)}
                          </td>
                          <td className="p-4 text-sm text-destructive text-right">
                            {totalDeduccion > 0 ? `-S/ ${totalDeduccion.toFixed(2)}` : '-'}
                          </td>
                          <td className="p-4 text-sm font-semibold text-right">
                            <span className={bono.perdidaTotal ? 'text-destructive' : 'text-[#22c55e]'}>
                              S/ {bono.bonoLiquido.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {bono.perdidaTotal ? (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
                                Perdido
                              </span>
                            ) : porcentajeDeduccion >= 50 ? (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-[#f59e0b]/20 text-[#f59e0b]">
                                En Riesgo
                              </span>
                            ) : porcentajeDeduccion > 0 ? (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent">
                                -{porcentajeDeduccion.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-[#22c55e]/20 text-[#22c55e]">
                                Completo
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${bono.empleadoId}-details`} className="border-b border-border bg-muted/20">
                            <td colSpan={7} className="p-4">
                              <div className="ml-8">
                                <h4 className="font-medium text-foreground mb-3">Detalle de Deducciones</h4>
                                {bono.deducciones.length === 0 ? (
                                  <p className="text-muted-foreground text-sm">Sin deducciones este mes</p>
                                ) : (
                                  <div className="space-y-2">
                                    {bono.deducciones.map((ded, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm bg-card p-3 rounded-lg">
                                        <div>
                                          <span className="text-foreground">{ded.concepto}</span>
                                          {ded.cantidad > 1 && (
                                            <span className="text-muted-foreground ml-2">
                                              x{ded.cantidad}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-destructive font-medium">
                                          -S/ {ded.monto.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {bono.perdidaTotal && bono.razonPerdida && (
                                  <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                                    <p className="text-destructive text-sm font-medium flex items-center gap-2">
                                      <AlertCircle size={16} />
                                      Pérdida total del bono: {bono.razonPerdida}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rules Info */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Reglas de Descuento
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Tardanza</p>
              <p className="text-foreground font-medium">5% por cada una</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Falta Leve</p>
              <p className="text-foreground font-medium">8% por cada una</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Falta Grave</p>
              <p className="text-foreground font-medium">30% por cada una</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Amonestación Escrita</p>
              <p className="text-foreground font-medium">10% por cada una</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Memorándum Formal</p>
              <p className="text-foreground font-medium">15% por cada uno</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-destructive font-medium">Pérdida Total</p>
              <p className="text-muted-foreground">2+ faltas graves o 5+ faltas leves</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-card-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}
