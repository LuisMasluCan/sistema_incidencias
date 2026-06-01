'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import {
  Download,
  FileText,
  Table,
  Calendar
} from 'lucide-react';
import {
  getEmpleados,
  getIncidencias,
  getMemorandums,
  getBonosDelMes,
  getCurrentMonth,
  getMonthName,
  exportToCSV
} from '@/lib/storage';
import { type Empleado, type Incidencia, type BonoEmpleado } from '@/lib/types';
import { getCargoNameForEmpleado } from '@/lib/storage';
import { EMPRESA } from '@/lib/empresa';
import jsPDF from 'jspdf';

export default function ReportesPage() {
  const [mesSeleccionado, setMesSeleccionado] = useState(getCurrentMonth());
  const [stats, setStats] = useState({
    totalEmpleados: 0,
    empleadosActivos: 0,
    incidenciasDelMes: 0,
    memorandumsDelMes: 0,
    totalBonos: 0
  });
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    const empleados = getEmpleados();
    const incidencias = getIncidencias().filter(i => i.fecha.substring(0, 7) === mesSeleccionado);
    const memorandums = getMemorandums().filter(m => m.fecha.substring(0, 7) === mesSeleccionado);
    const bonos = getBonosDelMes(mesSeleccionado);
    
    setStats({
      totalEmpleados: empleados.length,
      empleadosActivos: empleados.filter(e => e.estado === 'activo').length,
      incidenciasDelMes: incidencias.length,
      memorandumsDelMes: memorandums.length,
      totalBonos: bonos.reduce((sum, b) => sum + b.bonoLiquido, 0)
    });
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [mesSeleccionado]);

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

  const exportIncidenciasCSV = () => {
    const empleados = getEmpleados();
    const incidencias = getIncidencias()
      .filter(i => i.fecha.substring(0, 7) === mesSeleccionado)
      .map(i => {
        const emp = empleados.find(e => e.id === i.empleadoId);
        return {
          Fecha: new Date(i.fecha).toLocaleDateString('es-PE'),
          Empleado: emp?.nombreCompleto || 'Desconocido',
          DNI: emp?.dni || 'N/A',
          Cargo: emp ? getCargoNameForEmpleado(emp) : 'N/A',
          TipoFalta: i.tipoFalta === 'grave' ? 'Grave' : 'Leve',
          Categoria: i.categoria,
          Descripcion: i.descripcion,
          MedidaAplicada: i.medidaAplicada,
          Evidencia: i.evidencia,
          NegativaFirmar: i.negativaFirmar ? 'Sí' : 'No',
          Testigos: i.testigos
        };
      });
    
    exportToCSV(incidencias, `incidencias_${mesSeleccionado}`);
  };

  const exportBonosCSV = () => {
    const empleados = getEmpleados();
    const bonos = getBonosDelMes(mesSeleccionado).map(b => {
      const emp = empleados.find(e => e.id === b.empleadoId);
      const deducciones = b.deducciones.map(d => `${d.concepto}: -S/${d.monto.toFixed(2)}`).join('; ');
      return {
        Empleado: emp?.nombreCompleto || 'Desconocido',
        DNI: emp?.dni || 'N/A',
        Cargo: emp ? getCargoNameForEmpleado(emp) : 'N/A',
        BonoBruto: `S/ ${b.bonoBruto.toFixed(2)}`,
        Deducciones: deducciones || 'Ninguna',
        BonoLiquido: `S/ ${b.bonoLiquido.toFixed(2)}`,
        PerdidaTotal: b.perdidaTotal ? 'Sí' : 'No',
        RazonPerdida: b.razonPerdida || 'N/A'
      };
    });
    
    exportToCSV(bonos, `bonos_${mesSeleccionado}`);
  };

  const exportEmpleadosCSV = () => {
    const empleados = getEmpleados().map(e => ({
      NombreCompleto: e.nombreCompleto,
      DNI: e.dni,
      Cargo: getCargoNameForEmpleado(e),
      FechaIngreso: new Date(e.fechaIngreso).toLocaleDateString('es-PE'),
      Estado: e.estado === 'activo' ? 'Activo' : 'Inactivo'
    }));
    
    exportToCSV(empleados, 'empleados');
  };

  const exportBonosPDF = () => {
    const doc = new jsPDF();
    const empleados = getEmpleados();
    const bonos = getBonosDelMes(mesSeleccionado);
    
    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(EMPRESA.razonSocial, 105, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`RUC: ${EMPRESA.ruc}`, 105, 21, { align: 'center' });
    doc.text(EMPRESA.direccion, 105, 26, { align: 'center' });
    doc.text(`${EMPRESA.ciudad}, ${EMPRESA.pais}`, 105, 31, { align: 'center' });
    
    // Line separator
    doc.line(20, 35, 190, 35);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE BONOS POR DISCIPLINA', 105, 45, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periodo: ${getMonthName(mesSeleccionado)}`, 105, 55, { align: 'center' });
    
    // Summary
    const totalBruto = bonos.reduce((sum, b) => sum + b.bonoBruto, 0);
    const totalLiquido = bonos.reduce((sum, b) => sum + b.bonoLiquido, 0);
    
    doc.setFontSize(10);
    doc.text(`Total Empleados: ${bonos.length}`, 20, 70);
    doc.text(`Total Bono Bruto: S/ ${totalBruto.toFixed(2)}`, 20, 77);
    doc.text(`Total Deducciones: S/ ${(totalBruto - totalLiquido).toFixed(2)}`, 20, 84);
    doc.text(`Total Bono Liquido: S/ ${totalLiquido.toFixed(2)}`, 20, 91);
    
    // Table header
    let yPos = 105;
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(26, 26, 46);
    doc.rect(15, yPos - 5, 180, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Empleado', 20, yPos);
    doc.text('Cargo', 90, yPos);
    doc.text('Bruto', 130, yPos);
    doc.text('Ded.', 150, yPos);
    doc.text('Liquido', 170, yPos);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    
    // Table rows
    bonos.forEach((bono, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const emp = empleados.find(e => e.id === bono.empleadoId);
      const deduccion = bono.bonoBruto - bono.bonoLiquido;
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(15, yPos - 5, 180, 8, 'F');
      }
      
      const nombreCorto = emp?.nombreCompleto.substring(0, 30) || 'Desconocido';
      doc.text(nombreCorto, 20, yPos);
      doc.text(emp ? getCargoNameForEmpleado(emp).substring(0, 15) : 'N/A', 90, yPos);
      doc.text(`S/${bono.bonoBruto.toFixed(0)}`, 130, yPos);
      doc.text(`-${deduccion.toFixed(0)}`, 150, yPos);
      
      if (bono.perdidaTotal) {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(34, 197, 94);
      }
      doc.text(`S/${bono.bonoLiquido.toFixed(0)}`, 170, yPos);
      doc.setTextColor(0, 0, 0);
      
      yPos += 8;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.text(`Generado el ${new Date().toLocaleDateString('es-PE')} - Sistema de Control Disciplinario`, 105, 285, { align: 'center' });
    
    doc.save(`bonos_${mesSeleccionado}.pdf`);
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
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Reportes</h1>
            <p className="text-muted-foreground mt-1">
              Exportación de datos y estadísticas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-muted-foreground" />
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
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Empleados" value={stats.totalEmpleados} />
          <StatCard label="Empleados Activos" value={stats.empleadosActivos} />
          <StatCard label="Incidencias del Mes" value={stats.incidenciasDelMes} />
          <StatCard label="Memorándums" value={stats.memorandumsDelMes} />
          <StatCard label="Total Bonos" value={`S/ ${stats.totalBonos.toFixed(2)}`} />
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Incidencias Report */}
          <ReportCard
            title="Reporte de Incidencias"
            description="Lista completa de incidencias disciplinarias del mes seleccionado"
            icon={FileText}
            exports={[
              { label: 'Exportar CSV', onClick: exportIncidenciasCSV, type: 'csv' }
            ]}
          />

          {/* Bonos Report */}
          <ReportCard
            title="Resumen de Bonos"
            description="Detalle de bonos por empleado con deducciones aplicadas"
            icon={Table}
            exports={[
              { label: 'Exportar CSV', onClick: exportBonosCSV, type: 'csv' },
              { label: 'Exportar PDF', onClick: exportBonosPDF, type: 'pdf' }
            ]}
          />

          {/* Empleados Report */}
          <ReportCard
            title="Lista de Empleados"
            description="Directorio completo de empleados registrados en el sistema"
            icon={FileText}
            exports={[
              { label: 'Exportar CSV', onClick: exportEmpleadosCSV, type: 'csv' }
            ]}
          />
        </div>

        {/* Info Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Información sobre Reportes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Formato CSV</h4>
              <p>
                Los archivos CSV pueden abrirse en Excel, Google Sheets u otras 
                aplicaciones de hojas de cálculo. Contienen todos los datos en 
                formato tabular para análisis detallado.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Formato PDF</h4>
              <p>
                Los documentos PDF están formateados para impresión y presentación. 
                Incluyen el encabezado de la empresa y están listos para archivo físico.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-card-foreground mt-1">{value}</p>
    </div>
  );
}

function ReportCard({
  title,
  description,
  icon: Icon,
  exports
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  exports: { label: string; onClick: () => void; type: 'csv' | 'pdf' }[];
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon size={24} className="text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-card-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {exports.map((exp, idx) => (
          <button
            key={idx}
            onClick={exp.onClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              exp.type === 'pdf'
                ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                : 'bg-accent/10 text-accent hover:bg-accent/20'
            }`}
          >
            <Download size={16} />
            {exp.label}
          </button>
        ))}
      </div>
    </div>
  );
}
