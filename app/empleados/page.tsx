'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  X,
  AlertCircle
} from 'lucide-react';
import {
  getEmpleadosApi,
  saveEmpleadoApi,
  deleteEmpleadoApi,
  generateId,
  checkAcumulacionFaltasApi,
  getIncidenciasByEmpleadoApi,
  getMemorandumsByEmpleadoApi,
  getBonosDelMesApi,
  getCurrentMonth,
  getCargosApi
} from '@/lib/storage';
import { type Cargo, type Empleado, type BonoEmpleado, type Incidencia, type Memorandum } from '@/lib/types';
import { getCargoNameForEmpleado } from '@/lib/storage';

type CargoType = Empleado['cargo'];

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [filteredEmpleados, setFilteredEmpleados] = useState<Empleado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCargo, setFilterCargo] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [viewingEmpleado, setViewingEmpleado] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [alertasMap, setAlertasMap] = useState<Record<string, { alerta: boolean; cantidad: number; mensaje: string }>>({});
  const [bonosMap, setBonosMap] = useState<Record<string, BonoEmpleado>>({});
  const [selectedIncidencias, setSelectedIncidencias] = useState<Incidencia[]>([]);
  const [selectedMemorandums, setSelectedMemorandums] = useState<Memorandum[]>([]);
  const [selectedBono, setSelectedBono] = useState<BonoEmpleado | null>(null);

  const loadEmpleados = async () => {
    setLoading(true);
    const [data, cargosData, bonos] = await Promise.all([
      getEmpleadosApi(),
      getCargosApi(),
      getBonosDelMesApi(getCurrentMonth())
    ]);

    const alertas: Record<string, { alerta: boolean; cantidad: number; mensaje: string }> = {};
    await Promise.all(data.map(async (emp) => {
      alertas[emp.id] = await checkAcumulacionFaltasApi(emp.id);
    }));

    setEmpleados(data);
    setCargos(cargosData);
    setAlertasMap(alertas);
    setBonosMap(bonos.reduce((acc, bono) => ({ ...acc, [bono.empleadoId]: bono }), {} as Record<string, BonoEmpleado>));
    setLoading(false);
  };

  useEffect(() => {
    loadEmpleados();
  }, []);

  useEffect(() => {
    let filtered = [...empleados];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.nombreCompleto.toLowerCase().includes(term) ||
        e.dni.includes(term)
      );
    }
    
    if (filterCargo) {
      filtered = filtered.filter(e => (e.cargoId || e.cargo) === filterCargo);
    }
    
    if (filterEstado) {
      filtered = filtered.filter(e => e.estado === filterEstado);
    }
    
    setFilteredEmpleados(filtered);
  }, [empleados, searchTerm, filterCargo, filterEstado]);

  const handleSave = async (empleado: Empleado) => {
    await saveEmpleadoApi(empleado);
    await loadEmpleados();
    setShowModal(false);
    setEditingEmpleado(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de eliminar este empleado?')) {
      await deleteEmpleadoApi(id);
      await loadEmpleados();
    }
  };

  const handleEdit = (empleado: Empleado) => {
    setEditingEmpleado(empleado);
    setShowModal(true);
  };

  const handleView = async (empleado: Empleado) => {
    const [incidencias, memorandums, bonos] = await Promise.all([
      getIncidenciasByEmpleadoApi(empleado.id),
      getMemorandumsByEmpleadoApi(empleado.id),
      getBonosDelMesApi(getCurrentMonth())
    ]);

    setSelectedIncidencias(incidencias);
    setSelectedMemorandums(memorandums);
    setSelectedBono(bonos.find(b => b.empleadoId === empleado.id) ?? {
      empleadoId: empleado.id,
      mes: getCurrentMonth(),
      bonoBruto: 0,
      deducciones: [],
      bonoLiquido: 0,
      perdidaTotal: false
    });
    setViewingEmpleado(empleado);
    setShowViewModal(true);
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
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Empleados</h1>
            <p className="text-muted-foreground mt-1">
              Gestión del personal de RGR Selva
            </p>
          </div>
          <button
            onClick={() => {
              setEditingEmpleado(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            Nuevo Empleado
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={filterCargo}
              onChange={(e) => setFilterCargo(e.target.value)}
              className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todos los cargos</option>
              {cargos.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <div className="text-sm text-muted-foreground flex items-center">
              {filteredEmpleados.length} empleado(s) encontrado(s)
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">DNI</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cargo</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ingreso</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Alerta</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmpleados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No se encontraron empleados
                    </td>
                  </tr>
                ) : (
                  filteredEmpleados.map((empleado) => {
                    const alerta = alertasMap[empleado.id] ?? { alerta: false, cantidad: 0, mensaje: '' };
                    return (
                      <tr key={empleado.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="p-4 text-sm text-foreground font-medium">{empleado.nombreCompleto}</td>
                        <td className="p-4 text-sm text-foreground">{empleado.dni}</td>
                        <td className="p-4 text-sm text-foreground">{getCargoNameForEmpleado(empleado)}</td>
                        <td className="p-4 text-sm text-foreground whitespace-nowrap">
                          {new Date(empleado.fechaIngreso).toLocaleDateString('es-PE')}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            empleado.estado === 'activo'
                              ? 'bg-[#22c55e]/20 text-[#22c55e]'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {empleado.estado === 'activo' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="p-4">
                          {alerta.alerta && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
                              <AlertCircle size={14} />
                              {alerta.cantidad} faltas
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(empleado)}
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                              title="Ver expediente"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(empleado)}
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(empleado.id)}
                              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <EmpleadoModal
          empleado={editingEmpleado}
          cargos={cargos}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingEmpleado(null);
          }}
        />
      )}

      {/* View Modal */}
      {showViewModal && viewingEmpleado && selectedBono && (
        <ExpedienteModal
          empleado={viewingEmpleado}
          incidencias={selectedIncidencias}
          memorandums={selectedMemorandums}
          bono={selectedBono}
          alerta={alertasMap[viewingEmpleado.id] ?? { alerta: false, cantidad: 0, mensaje: '' }}
          onClose={() => {
            setShowViewModal(false);
            setViewingEmpleado(null);
            setSelectedIncidencias([]);
            setSelectedMemorandums([]);
            setSelectedBono(null);
          }}
        />
      )}
    </AppLayout>
  );
}

function EmpleadoModal({
  empleado,
  cargos,
  onSave,
  onClose
}: {
  empleado: Empleado | null;
  cargos: Cargo[];
  onSave: (empleado: Empleado) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Empleado>(
    empleado || {
      id: generateId(),
      nombreCompleto: '',
      dni: '',
      cargo: cargos[0]?.id || 'tecnico',
      cargoId: cargos[0]?.id || undefined,
      fechaIngreso: new Date().toISOString().split('T')[0],
      estado: 'activo'
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombreCompleto || !formData.dni) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">
            {empleado ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.nombreCompleto}
              onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              DNI *
            </label>
            <input
              type="text"
              value={formData.dni}
              onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
              maxLength={8}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Cargo *
            </label>
            <select
              value={formData.cargo}
              onChange={(e) => setFormData({ ...formData, cargo: e.target.value as CargoType, cargoId: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {cargos.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Fecha de Ingreso *
            </label>
            <input
              type="date"
              value={formData.fechaIngreso}
              onChange={(e) => setFormData({ ...formData, fechaIngreso: e.target.value })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Estado
            </label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'activo' | 'inactivo' })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
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

function ExpedienteModal({
  empleado,
  incidencias,
  memorandums,
  bono,
  alerta,
  onClose
}: {
  empleado: Empleado;
  incidencias: Incidencia[];
  memorandums: Memorandum[];
  bono: BonoEmpleado;
  alerta: { alerta: boolean; cantidad: number; mensaje: string };
  onClose: () => void;
}) {

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold text-card-foreground">
            Expediente del Empleado
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-6">
          {/* Employee Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="font-semibold text-foreground mb-3">{empleado.nombreCompleto}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">DNI:</span>
                <span className="ml-2 text-foreground">{empleado.dni}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cargo:</span>
                <span className="ml-2 text-foreground">{getCargoNameForEmpleado(empleado)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Ingreso:</span>
                <span className="ml-2 text-foreground">
                  {new Date(empleado.fechaIngreso).toLocaleDateString('es-PE')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <span className={`ml-2 ${empleado.estado === 'activo' ? 'text-[#22c55e]' : 'text-muted-foreground'}`}>
                  {empleado.estado === 'activo' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Alert */}
          {alerta.alerta && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-destructive text-sm font-medium flex items-center gap-2">
                <AlertCircle size={18} />
                {alerta.mensaje}
              </p>
            </div>
          )}

          {/* Current Month Bonus */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Bono del Mes Actual</h4>
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Bono Bruto:</span>
                  <p className="text-foreground font-semibold">S/ {bono.bonoBruto.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Deducciones:</span>
                  <p className="text-destructive font-semibold">
                    S/ {(bono.bonoBruto - bono.bonoLiquido).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bono Líquido:</span>
                  <p className={`font-semibold ${bono.perdidaTotal ? 'text-destructive' : 'text-[#22c55e]'}`}>
                    S/ {bono.bonoLiquido.toFixed(2)}
                  </p>
                </div>
              </div>
              {bono.perdidaTotal && (
                <p className="text-destructive text-sm mt-2">
                  Razón de pérdida: {bono.razonPerdida}
                </p>
              )}
            </div>
          </div>

          {/* Incidents */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">
              Incidencias ({incidencias.length})
            </h4>
            {incidencias.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin incidencias registradas</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {incidencias.map((inc) => (
                  <div key={inc.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{inc.categoria}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        inc.tipoFalta === 'grave'
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                      }`}>
                        {inc.tipoFalta === 'grave' ? 'Grave' : 'Leve'}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {new Date(inc.fecha).toLocaleDateString('es-PE')} - {inc.medidaAplicada}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Memorandums */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">
              Memorándums ({memorandums.length})
            </h4>
            {memorandums.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin memorándums registrados</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {memorandums.map((memo) => (
                  <div key={memo.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                    <p className="text-foreground font-medium">{memo.asunto}</p>
                    <p className="text-muted-foreground mt-1">
                      {new Date(memo.fecha).toLocaleDateString('es-PE')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
