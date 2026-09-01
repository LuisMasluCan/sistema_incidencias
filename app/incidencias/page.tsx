'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  X,
  AlertCircle
} from 'lucide-react';
import {
  getEmpleadosApi,
  getIncidenciasApi,
  saveIncidenciaApi,
  deleteIncidenciaApi,
  generateId,
  checkAcumulacionFaltasApi
} from '@/lib/storage';
import {
  FALTAS_LEVES,
  FALTAS_GRAVES,
  MEDIDAS_DISCIPLINARIAS,
  type Empleado,
  type Incidencia
} from '@/lib/types';
import { getCargoNameForEmpleado } from '@/lib/storage';
import Link from 'next/link';

export default function IncidenciasPage() {
  const [incidencias, setIncidencias] = useState<(Incidencia & { empleadoNombre: string })[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [filteredIncidencias, setFilteredIncidencias] = useState<(Incidencia & { empleadoNombre: string })[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingIncidencia, setEditingIncidencia] = useState<Incidencia | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const emps = await getEmpleadosApi();
    setEmpleados(emps);

    const incidenciasData = await getIncidenciasApi();
    const incs = incidenciasData.map(i => {
      const emp = emps.find(e => e.id === i.empleadoId);
      return {
        ...i,
        empleadoNombre: emp?.nombreCompleto || 'Desconocido'
      };
    }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    setIncidencias(incs);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = [...incidencias];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.empleadoNombre.toLowerCase().includes(term) ||
        i.categoria.toLowerCase().includes(term)
      );
    }
    
    if (filterTipo) {
      filtered = filtered.filter(i => i.tipoFalta === filterTipo);
    }
    
    setFilteredIncidencias(filtered);
  }, [incidencias, searchTerm, filterTipo]);

  const handleSave = async (incidencia: Incidencia) => {
    await saveIncidenciaApi(incidencia);
    await loadData();
    setShowModal(false);
    setEditingIncidencia(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar esta incidencia?')) {
      await deleteIncidenciaApi(id);
      await loadData();
    }
  };

  const handleEdit = (incidencia: Incidencia) => {
    setEditingIncidencia(incidencia);
    setShowModal(true);
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
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Incidencias</h1>
            <p className="text-muted-foreground mt-1">
              Registro de faltas disciplinarias
            </p>
          </div>
          <button
            onClick={() => {
              setEditingIncidencia(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            Nueva Incidencia
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por empleado o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todos los tipos</option>
              <option value="leve">Falta Leve</option>
              <option value="grave">Falta Grave</option>
            </select>
            <div className="text-sm text-muted-foreground flex items-center lg:col-span-2">
              {filteredIncidencias.length} incidencia(s) encontrada(s)
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
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Categoría</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Medida</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Memo</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidencias.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No se encontraron incidencias
                    </td>
                  </tr>
                ) : (
                  filteredIncidencias.map((incidencia) => (
                    <tr key={incidencia.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-4 text-sm text-foreground whitespace-nowrap">
                        {new Date(incidencia.fecha).toLocaleDateString('es-PE')}
                      </td>
                      <td className="p-4 text-sm text-foreground">{incidencia.empleadoNombre}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          incidencia.tipoFalta === 'grave'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                        }`}>
                          {incidencia.tipoFalta === 'grave' ? 'Grave' : 'Leve'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-foreground max-w-[200px] truncate" title={incidencia.categoria}>
                        {incidencia.categoria}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{incidencia.medidaAplicada}</td>
                      <td className="p-4">
                        {incidencia.memorandumId ? (
                          <Link
                            href={`/memorandums?id=${incidencia.memorandumId}`}
                            className="text-accent hover:underline text-sm"
                          >
                            Ver memo
                          </Link>
                        ) : (
                          <Link
                            href={`/memorandums?incidenciaId=${incidencia.id}&empleadoId=${incidencia.empleadoId}`}
                            className="text-muted-foreground hover:text-accent text-sm flex items-center gap-1"
                          >
                            <FileText size={14} />
                            Generar
                          </Link>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(incidencia)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(incidencia.id)}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <IncidenciaModal
          incidencia={editingIncidencia}
          empleados={empleados.filter(e => e.estado === 'activo')}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingIncidencia(null);
          }}
        />
      )}
    </AppLayout>
  );
}

function IncidenciaModal({
  incidencia,
  empleados,
  onSave,
  onClose
}: {
  incidencia: Incidencia | null;
  empleados: Empleado[];
  onSave: (incidencia: Incidencia) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Incidencia>(
    incidencia || {
      id: generateId(),
      empleadoId: empleados[0]?.id || '',
      fecha: new Date().toISOString().split('T')[0],
      tipoFalta: 'leve',
      categoria: FALTAS_LEVES[0],
      descripcion: '',
      medidaAplicada: MEDIDAS_DISCIPLINARIAS[0],
      evidencia: '',
      negativaFirmar: false,
      testigos: ''
    }
  );

  const [alertaAcumulacion, setAlertaAcumulacion] = useState<{ alerta: boolean; mensaje: string }>({ alerta: false, mensaje: '' });

  useEffect(() => {
    let mounted = true;
    const loadAlerta = async () => {
      if (!formData.empleadoId) {
        setAlertaAcumulacion({ alerta: false, mensaje: '' });
        return;
      }
      const check = await checkAcumulacionFaltasApi(formData.empleadoId);
      if (mounted) {
        setAlertaAcumulacion(check);
      }
    };

    loadAlerta();

    return () => {
      mounted = false;
    };
  }, [formData.empleadoId]);

  const categorias = formData.tipoFalta === 'leve' ? FALTAS_LEVES : FALTAS_GRAVES;

  const handleTipoFaltaChange = (tipo: 'leve' | 'grave') => {
    const newCategorias = tipo === 'leve' ? FALTAS_LEVES : FALTAS_GRAVES;
    setFormData({
      ...formData,
      tipoFalta: tipo,
      categoria: newCategorias[0]
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empleadoId || !formData.categoria) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold text-card-foreground">
            {incidencia ? 'Editar Incidencia' : 'Nueva Incidencia'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Alert */}
          {alertaAcumulacion.alerta && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-destructive text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {alertaAcumulacion.mensaje}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Empleado *
            </label>
            <select
              value={formData.empleadoId}
              onChange={(e) => setFormData({ ...formData, empleadoId: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
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
              Tipo de Falta *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoFalta"
                  checked={formData.tipoFalta === 'leve'}
                  onChange={() => handleTipoFaltaChange('leve')}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-foreground">Leve</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoFalta"
                  checked={formData.tipoFalta === 'grave'}
                  onChange={() => handleTipoFaltaChange('grave')}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-foreground">Grave</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Categoría *
            </label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              {categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Descripción Adicional
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Detalles adicionales de la incidencia..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Medida Aplicada *
            </label>
            <select
              value={formData.medidaAplicada}
              onChange={(e) => setFormData({ ...formData, medidaAplicada: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              {MEDIDAS_DISCIPLINARIAS.map((medida) => (
                <option key={medida} value={medida}>{medida}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Evidencia
            </label>
            <input
              type="text"
              value={formData.evidencia}
              onChange={(e) => setFormData({ ...formData, evidencia: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Testigos, referencia a cámara, etc."
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
