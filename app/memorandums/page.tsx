'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Download,
  X
} from 'lucide-react';
import {
  getEmpleadosApi,
  getMemorandumsApi,
  saveMemorandumApi,
  deleteMemorandumApi,
  getIncidenciaByIdApi,
  saveIncidenciaApi,
  generateId,
  getActiveTipoBonoApi
} from '@/lib/storage';
import { ARTICULOS_REGLAMENTO, type Empleado, type Memorandum, type TipoBono } from '@/lib/types';
import { getCargoNameForEmpleado } from '@/lib/storage';
import { EMPRESA } from '@/lib/empresa';
import jsPDF from 'jspdf';

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function MemorandumsContent() {
  const searchParams = useSearchParams();
  const [memorandums, setMemorandums] = useState<(Memorandum & { empleadoNombre: string })[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [activeTipoBono, setActiveTipoBono] = useState<TipoBono | null>(null);
  const [filteredMemorandums, setFilteredMemorandums] = useState<(Memorandum & { empleadoNombre: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [viewingMemorandum, setViewingMemorandum] = useState<(Memorandum & { empleadoNombre: string }) | null>(null);
  const [prefilledData, setPrefilledData] = useState<{ empleadoId?: string; incidenciaId?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const emps = await getEmpleadosApi();
    setEmpleados(emps);
    const tipoBono = await getActiveTipoBonoApi();

    const memos = (await getMemorandumsApi()).map(m => {
      const emp = emps.find(e => e.id === m.empleadoId);
      return {
        ...m,
        empleadoNombre: emp?.nombreCompleto || 'Desconocido'
      };
    }).sort((a, b) => parseLocalDate(b.fecha).getTime() - parseLocalDate(a.fecha).getTime());

    setMemorandums(memos);
    setActiveTipoBono(tipoBono);
    setLoading(false);
  };

  useEffect(() => {
    const initialize = async () => {
      await loadData();

      // Check for prefilled data from URL
      const incidenciaId = searchParams.get('incidenciaId');
      const empleadoId = searchParams.get('empleadoId');
      const viewId = searchParams.get('id');

      if (viewId) {
        const memo = (await getMemorandumsApi()).find(m => m.id === viewId);
        if (memo) {
          const emps = await getEmpleadosApi();
          const emp = emps.find(e => e.id === memo.empleadoId);
          setViewingMemorandum({ ...memo, empleadoNombre: emp?.nombreCompleto || 'Desconocido' });
          setShowPreviewModal(true);
        }
      } else if (incidenciaId && empleadoId) {
        setPrefilledData({ incidenciaId, empleadoId });
        setShowModal(true);
      }
    };

    initialize();
  }, [searchParams]);

  useEffect(() => {
    let filtered = [...memorandums];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.empleadoNombre.toLowerCase().includes(term) ||
        m.asunto.toLowerCase().includes(term)
      );
    }
    
    setFilteredMemorandums(filtered);
  }, [memorandums, searchTerm]);

  const handleSave = async (memorandum: Memorandum) => {
    await saveMemorandumApi(memorandum);
    
    // Link to incidencia if applicable
    if (memorandum.incidenciaId) {
      const incidencia = await getIncidenciaByIdApi(memorandum.incidenciaId);
      if (incidencia) {
        await saveIncidenciaApi({ ...incidencia, memorandumId: memorandum.id });
      }
    }
    
    await loadData();
    setShowModal(false);
    setPrefilledData(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este memorándum?')) {
      await deleteMemorandumApi(id);
      await loadData();
    }
  };

  const handleView = (memo: Memorandum & { empleadoNombre: string }) => {
    setViewingMemorandum(memo);
    setShowPreviewModal(true);
  };

  const exportToPDF = (memo: Memorandum & { empleadoNombre: string }) => {
    const doc = new jsPDF();
    const emp = empleados.find(e => e.id === memo.empleadoId);
    
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
    doc.text('MEMORANDUM', 105, 45, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Date
    const fecha = parseLocalDate(memo.fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`${EMPRESA.ciudad}, ${fecha}`, 20, 55);
    
    // Employee data
    doc.text(`PARA: ${memo.empleadoNombre}`, 20, 65);
    doc.text(`CARGO: ${emp ? getCargoNameForEmpleado(emp) : 'N/A'}`, 20, 72);
    doc.text(`DNI: ${emp?.dni || 'N/A'}`, 20, 79);
    doc.text('DE: Gerencia General', 20, 86);
    doc.text(`ASUNTO: ${memo.asunto}`, 20, 93);
    
    // Horizontal line
    doc.line(20, 100, 190, 100);
    
    // Body
    const splitDescription = doc.splitTextToSize(memo.descripcion, 170);
    doc.text(splitDescription, 20, 110);
    
    let yPos = 110 + (splitDescription.length * 7);
    
    // Normative base
    if (memo.baseNormativa.length > 0) {
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Base Normativa:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      
      memo.baseNormativa.forEach((art) => {
        yPos += 7;
        doc.text(`- ${art}`, 25, yPos);
      });
    }
    
    // Bonus affected
    if (memo.montoBonoAfectado > 0) {
      yPos += 15;
      doc.text(`Monto de Bono Afectado: S/ ${memo.montoBonoAfectado.toFixed(2)}`, 20, yPos);
    }
    
    // Signature section
    yPos += 30;
    doc.line(20, yPos, 80, yPos);
    doc.text('Firma del Trabajador', 30, yPos + 7);
    
    doc.line(110, yPos, 170, yPos);
    doc.text('Huella Digital', 130, yPos + 7);
    
    // Refusal to sign
    if (memo.negativaFirmar) {
      yPos += 25;
      doc.setFont('helvetica', 'bold');
      doc.text('NEGATIVA A FIRMAR', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`Testigos: ${memo.testigos}`, 20, yPos + 7);
    }
    
    // Footer
    doc.setFontSize(8);
    doc.text('Documento generado por el Sistema de Control Disciplinario', 105, 285, { align: 'center' });
    
    doc.save(`memorandum_${memo.id.substring(0, 8)}.pdf`);
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
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Memorándums</h1>
            <p className="text-muted-foreground mt-1">
              Documentos disciplinarios formales
            </p>
          </div>
          <button
            onClick={() => {
              setPrefilledData(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            Nuevo Memorándum
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por empleado o asunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="text-sm text-muted-foreground flex items-center">
              {filteredMemorandums.length} memorándum(s) encontrado(s)
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Empleado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Asunto</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Bono Afectado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Negativa</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMemorandums.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No se encontraron memorándums
                    </td>
                  </tr>
                ) : (
                  filteredMemorandums.map((memo) => (
                    <tr key={memo.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-4 text-sm text-foreground whitespace-nowrap">
                        {parseLocalDate(memo.fecha).toLocaleDateString('es-PE')}
                      </td>
                      <td className="p-4 text-sm text-foreground">{memo.empleadoNombre}</td>
                      <td className="p-4 text-sm text-foreground max-w-[200px] truncate" title={memo.asunto}>
                        {memo.asunto}
                      </td>
                      <td className="p-4 text-sm text-foreground">
                        S/ {memo.montoBonoAfectado.toFixed(2)}
                      </td>
                      <td className="p-4">
                        {memo.negativaFirmar ? (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            No
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(memo)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Ver"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => exportToPDF(memo)}
                            className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                            title="Exportar PDF"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(memo.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <MemorandumModal
          empleados={empleados.filter(e => e.estado === 'activo')}
          prefilledData={prefilledData}
          activeTipoBono={activeTipoBono}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setPrefilledData(null);
          }}
        />
      )}

      {/* Preview Modal */}
      {showPreviewModal && viewingMemorandum && (
        <PreviewModal
          memorandum={viewingMemorandum}
          empleado={empleados.find(e => e.id === viewingMemorandum.empleadoId)}
          onClose={() => {
            setShowPreviewModal(false);
            setViewingMemorandum(null);
          }}
          onExport={() => exportToPDF(viewingMemorandum)}
        />
      )}
    </AppLayout>
  );
}

export default function MemorandumsPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    }>
      <MemorandumsContent />
    </Suspense>
  );
}

function MemorandumModal({
  empleados,
  prefilledData,
  activeTipoBono,
  onSave,
  onClose
}: {
  empleados: Empleado[];
  prefilledData: { empleadoId?: string; incidenciaId?: string } | null;
  activeTipoBono: TipoBono | null;
  onSave: (memorandum: Memorandum) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Memorandum>(() => ({
    id: generateId(),
    empleadoId: prefilledData?.empleadoId || empleados[0]?.id || '',
    incidenciaId: prefilledData?.incidenciaId,
    fecha: new Date().toISOString().split('T')[0],
    asunto: '',
    descripcion: '',
    baseNormativa: [],
    montoBonoAfectado: 0,
    negativaFirmar: false,
    testigos: ''
  }));

  const [selectedArticulos, setSelectedArticulos] = useState<string[]>(formData.baseNormativa);

  useEffect(() => {
    if (!prefilledData?.incidenciaId) return;
    let mounted = true;

    const loadIncidencia = async () => {
      const incidencia = await getIncidenciaByIdApi(prefilledData.incidenciaId!);
      if (!mounted || !incidencia) return;

      setFormData((current) => ({
        ...current,
        asunto: `Falta ${incidencia.tipoFalta} - ${incidencia.categoria}`,
        descripcion: `Por medio del presente, se le comunica que el día ${parseLocalDate(incidencia.fecha).toLocaleDateString('es-PE')}, usted incurrió en una falta ${incidencia.tipoFalta} consistente en: ${incidencia.categoria}. ${incidencia.descripcion}`,
        negativaFirmar: incidencia.negativaFirmar || false,
        testigos: incidencia.testigos || ''
      }));
    };

    loadIncidencia();

    return () => {
      mounted = false;
    };
  }, [prefilledData]);

  const handleArticuloToggle = (articulo: string) => {
    const newSelected = selectedArticulos.includes(articulo)
      ? selectedArticulos.filter(a => a !== articulo)
      : [...selectedArticulos, articulo];
    setSelectedArticulos(newSelected);
    setFormData({ ...formData, baseNormativa: newSelected });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empleadoId || !formData.asunto) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold text-card-foreground">
            Nuevo Memorándum
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Empleado *
            </label>
            <select
              value={formData.empleadoId}
              onChange={(e) => setFormData({ ...formData, empleadoId: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              disabled={!!prefilledData?.empleadoId}
            >
              <option value="">Seleccionar empleado</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombreCompleto} - {getCargoNameForEmpleado(emp)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Fecha *
            </label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Asunto *
            </label>
            <input
              type="text"
              value={formData.asunto}
              onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Asunto del memorándum"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Descripción *
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={5}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Descripción detallada del memorándum..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Base Normativa
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-muted/30 rounded-lg">
              {ARTICULOS_REGLAMENTO.map((articulo) => (
                <label key={articulo} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedArticulos.includes(articulo)}
                    onChange={() => handleArticuloToggle(articulo)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-foreground">{articulo}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Monto de Bono Afectado (S/)
            </label>
            <input
              type="number"
              value={formData.montoBonoAfectado}
              onChange={(e) => setFormData({ ...formData, montoBonoAfectado: parseFloat(e.target.value) || 0 })}
              min="0"
              max={activeTipoBono?.monto_base ?? 0}
              step="0.01"
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.negativaFirmar}
                onChange={(e) => setFormData({ ...formData, negativaFirmar: e.target.checked })}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-foreground text-sm">Trabajador se niega a firmar</span>
            </label>

            {formData.negativaFirmar && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Testigos de la Negativa
                </label>
                <input
                  type="text"
                  value={formData.testigos}
                  onChange={(e) => setFormData({ ...formData, testigos: e.target.value })}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nombres de los testigos..."
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PreviewModal({
  memorandum,
  empleado,
  onClose,
  onExport
}: {
  memorandum: Memorandum & { empleadoNombre: string };
  empleado?: Empleado;
  onClose: () => void;
  onExport: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            Vista Previa del Memorándum
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              <Download size={16} />
              Exportar PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
        
        {/* Preview Content - styled like a document */}
        <div className="p-8 text-gray-900">
          <div className="text-center mb-8">
            <h1 className="text-lg font-bold">RGR SELVA VEHICULOS Y MAQUINARIAS E.I.R.L.</h1>
            <h2 className="text-base font-bold mt-4">MEMORANDUM</h2>
          </div>
          
          <p className="mb-6">
            {EMPRESA.ciudad}, {parseLocalDate(memorandum.fecha).toLocaleDateString('es-PE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          
          <div className="space-y-1 mb-6">
            <p><strong>PARA:</strong> {memorandum.empleadoNombre}</p>
            <p><strong>CARGO:</strong> {empleado ? getCargoNameForEmpleado(empleado) : 'N/A'}</p>
            <p><strong>DNI:</strong> {empleado?.dni || 'N/A'}</p>
            <p><strong>DE:</strong> Gerencia General</p>
            <p><strong>ASUNTO:</strong> {memorandum.asunto}</p>
          </div>
          
          <hr className="my-6 border-gray-300" />
          
          <p className="text-justify leading-relaxed mb-6">
            {memorandum.descripcion}
          </p>
          
          {memorandum.baseNormativa.length > 0 && (
            <div className="mb-6">
              <p className="font-bold mb-2">Base Normativa:</p>
              <ul className="list-disc list-inside space-y-1">
                {memorandum.baseNormativa.map((art, idx) => (
                  <li key={idx}>{art}</li>
                ))}
              </ul>
            </div>
          )}
          
          {memorandum.montoBonoAfectado > 0 && (
            <p className="mb-6">
              <strong>Monto de Bono Afectado:</strong> S/ {memorandum.montoBonoAfectado.toFixed(2)}
            </p>
          )}
          
          <div className="flex justify-between mt-12 mb-8">
            <div className="text-center">
              <div className="w-40 border-t border-gray-900 mb-2"></div>
              <p>Firma del Trabajador</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-t border-gray-900 mb-2"></div>
              <p>Huella Digital</p>
            </div>
          </div>
          
          {memorandum.negativaFirmar && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-bold text-red-800">NEGATIVA A FIRMAR</p>
              <p className="text-red-700">Testigos: {memorandum.testigos}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
