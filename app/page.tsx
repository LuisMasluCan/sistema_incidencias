'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import {
  Users,
  AlertTriangle,
  DollarSign,
  AlertCircle,
  TrendingDown,
  Activity
} from 'lucide-react';
import {
  getDashboardStatsApi,
  getEmpleadosApi,
  checkAcumulacionFaltasApi,
  getIncidenciasApi,
  getCurrentMonth,
  getMonthName
} from '@/lib/storage';
import { getCargoNameForEmpleado } from '@/lib/storage';
import type { Empleado, Incidencia } from '@/lib/types';

interface DashboardStats {
  totalEmpleados: number;
  empleadosActivos: number;
  incidenciasDelMes: number;
  totalBonos: number;
  empleadosEnRiesgo: number;
  alertasAcumulacion: number;
}

interface AlertaEmpleado {
  empleado: Empleado;
  cantidad: number;
  mensaje: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alertas, setAlertas] = useState<AlertaEmpleado[]>([]);
  const [incidenciasRecientes, setIncidenciasRecientes] = useState<(Incidencia & { empleadoNombre: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const dashStats = await getDashboardStatsApi();
      setStats(dashStats);

      const empleados = (await getEmpleadosApi()).filter(e => e.estado === 'activo');
      const alertasEmpleados: AlertaEmpleado[] = [];
      
      for (const emp of empleados) {
        const check = await checkAcumulacionFaltasApi(emp.id);
        if (check.alerta) {
          alertasEmpleados.push({
            empleado: emp,
            cantidad: check.cantidad,
            mensaje: check.mensaje
          });
        }
      }
      setAlertas(alertasEmpleados);

      const incidencias = await getIncidenciasApi();
      const currentMonth = getCurrentMonth();
      const recent = incidencias
        .filter(i => i.fecha.substring(0, 7) === currentMonth)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 5)
        .map(i => {
          const emp = empleados.find(e => e.id === i.empleadoId);
          return {
            ...i,
            empleadoNombre: emp?.nombreCompleto || 'Desconocido'
          };
        });
      setIncidenciasRecientes(recent);
      
      setLoading(false);
    };

    loadData();
  }, []);

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
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Resumen del mes: {getMonthName(getCurrentMonth())}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            title="Total Empleados"
            value={stats?.totalEmpleados || 0}
            icon={Users}
            color="bg-primary"
          />
          <KPICard
            title="Empleados Activos"
            value={stats?.empleadosActivos || 0}
            icon={Activity}
            color="bg-accent"
          />
          <KPICard
            title="Incidencias del Mes"
            value={stats?.incidenciasDelMes || 0}
            icon={AlertTriangle}
            color="bg-[#f59e0b]"
          />
          <KPICard
            title="Total Bonos"
            value={`S/ ${(stats?.totalBonos || 0).toFixed(2)}`}
            icon={DollarSign}
            color="bg-[#22c55e]"
          />
          <KPICard
            title="Bonos en Riesgo"
            value={stats?.empleadosEnRiesgo || 0}
            icon={TrendingDown}
            color="bg-destructive"
          />
          <KPICard
            title="Alertas Acumulación"
            value={stats?.alertasAcumulacion || 0}
            icon={AlertCircle}
            color="bg-destructive"
          />
        </div>

        {/* Alerts Section */}
        {alertas.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-4">
              <AlertCircle size={20} />
              Alertas de Acumulación de Faltas
            </h2>
            <div className="space-y-3">
              {alertas.map((alerta, index) => (
                <div key={index} className="bg-card rounded-lg p-4 border border-border">
                  <p className="font-medium text-foreground">{alerta.empleado.nombreCompleto}</p>
                  <p className="text-sm text-muted-foreground">
                    {getCargoNameForEmpleado(alerta.empleado)} - DNI: {alerta.empleado.dni}
                  </p>
                  <p className="text-sm text-destructive mt-2">
                    {alerta.cantidad} faltas leves en los últimos 30 días
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Incidents */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-card-foreground">
              Incidencias Recientes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Empleado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Categoría</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Medida</th>
                </tr>
              </thead>
              <tbody>
                {incidenciasRecientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No hay incidencias este mes
                    </td>
                  </tr>
                ) : (
                  incidenciasRecientes.map((inc) => (
                    <tr key={inc.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-4 text-sm text-foreground whitespace-nowrap">
                        {new Date(inc.fecha).toLocaleDateString('es-PE')}
                      </td>
                      <td className="p-4 text-sm text-foreground">{inc.empleadoNombre}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          inc.tipoFalta === 'grave'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                        }`}>
                          {inc.tipoFalta === 'grave' ? 'Grave' : 'Leve'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-foreground">{inc.categoria}</td>
                      <td className="p-4 text-sm text-muted-foreground">{inc.medidaAplicada}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Manual Disciplinario */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Manual Disciplinario
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Faltas Leves:</strong> Tardanzas, desorden, uso excesivo de celular, mala presentación, etc.</p>
              <p><strong className="text-foreground">Faltas Graves:</strong> Desobediencia, agresiones, robo, abandono de puesto, daños por negligencia.</p>
              <p><strong className="text-foreground">Acumulación:</strong> 3+ faltas leves en 30 días pueden elevarse a falta grave.</p>
            </div>
          </div>

          {/* Política de Bonos */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Política de Bonos
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Bono Base:</strong> S/ 150.00 mensuales por disciplina.</p>
              <p><strong className="text-foreground">Descuentos:</strong> Tardanzas 5%, Faltas leves 8%, Faltas graves 30%.</p>
              <p><strong className="text-foreground">Pérdida Total:</strong> 2+ faltas graves o 5+ faltas leves en el mes.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function KPICard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-card-foreground mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}
