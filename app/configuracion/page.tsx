'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import {
  Settings,
  Save,
  RotateCcw,
  Info
} from 'lucide-react';
import { getReglas, saveReglas, getTipoBonos, saveTipoBonos, getActiveTipoBono, getCargos, saveCargos, generateId } from '@/lib/storage';
import { type ReglaDescuento } from '@/lib/types';

const TIPO_LABELS: Record<ReglaDescuento['tipo'], string> = {
  tardanza: 'Tardanza',
  falta_leve: 'Falta Leve (no tardanza)',
  falta_grave: 'Falta Grave',
  amonestacion: 'Amonestación Escrita',
  memorandum: 'Memorándum Formal'
};

export default function ConfiguracionPage() {
  const [reglas, setReglas] = useState<ReglaDescuento[]>([]);
  const [tipos, setTipos] = useState(() => getTipoBonos());
  const [editingMonto, setEditingMonto] = useState<number>(getActiveTipoBono().monto_base);
  const [cargos, setCargos] = useState(() => getCargos());
  const [newCargoName, setNewCargoName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getReglas();
    setReglas(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    setTipos(getTipoBonos());
    setEditingMonto(getActiveTipoBono().monto_base);
    setCargos(getCargos());
  }, []);

  const handlePorcentajeChange = (id: string, value: number) => {
    setReglas(prev => prev.map(r => 
      r.id === id ? { ...r, porcentajeDescuento: Math.max(0, Math.min(100, value)) } : r
    ));
    setHasChanges(true);
  };

  const handleActivaChange = (id: string, activa: boolean) => {
    setReglas(prev => prev.map(r => 
      r.id === id ? { ...r, activa } : r
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    setSaving(true);
    saveReglas(reglas);
    // save tipos if changed
    saveTipoBonos(tipos);
    setTimeout(() => {
      setSaving(false);
      setHasChanges(false);
      alert('Configuración guardada exitosamente');
    }, 500);
  };

  const handleSaveMonto = () => {
    const tiposAct = getTipoBonos();
    const active = tiposAct.find(t => t.nombre.toLowerCase().includes('disciplina')) || tiposAct[0];
    if (active) {
      active.monto_base = Math.max(0, editingMonto);
      saveTipoBonos(tiposAct);
      setTipos(tiposAct);
      alert('Monto base actualizado');
    }
  };

  const handleAddCargo = () => {
    const nombre = newCargoName.trim();
    if (!nombre) return;
    const newCargos = [...cargos, { id: generateId(), nombre, descripcion: '', activo: true }];
    saveCargos(newCargos as any);
    setCargos(newCargos as any);
    setNewCargoName('');
  };

  const handleReset = () => {
    if (confirm('¿Desea restaurar los valores predeterminados?')) {
      const defaultReglas: ReglaDescuento[] = [
        { id: reglas.find(r => r.tipo === 'tardanza')?.id || '', nombre: 'Tardanza', tipo: 'tardanza', porcentajeDescuento: 5, activa: true },
        { id: reglas.find(r => r.tipo === 'falta_leve')?.id || '', nombre: 'Falta Leve (no tardanza)', tipo: 'falta_leve', porcentajeDescuento: 8, activa: true },
        { id: reglas.find(r => r.tipo === 'falta_grave')?.id || '', nombre: 'Falta Grave', tipo: 'falta_grave', porcentajeDescuento: 30, activa: true },
        { id: reglas.find(r => r.tipo === 'amonestacion')?.id || '', nombre: 'Amonestación Escrita', tipo: 'amonestacion', porcentajeDescuento: 10, activa: true },
        { id: reglas.find(r => r.tipo === 'memorandum')?.id || '', nombre: 'Memorándum Formal', tipo: 'memorandum', porcentajeDescuento: 15, activa: true }
      ];
      setReglas(defaultReglas);
      setHasChanges(true);
    }
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
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Configuración</h1>
            <p className="text-muted-foreground mt-1">
              Administración de reglas de descuento de bonos
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <RotateCcw size={18} />
              Restaurar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Bono Base Info */}
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-accent mt-0.5" />
            <div className="w-full">
              <p className="font-medium text-foreground">Bono Base por Disciplina</p>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="number"
                  value={editingMonto}
                  onChange={(e) => setEditingMonto(parseFloat(e.target.value) || 0)}
                  className="w-40 px-3 py-2 bg-input border border-border rounded-lg text-foreground"
                />
                <button onClick={handleSaveMonto} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">Actualizar Monto</button>
              </div>
              <p className="text-muted-foreground text-sm mt-3">
                Monto vigente: <strong className="text-foreground">S/ {getActiveTipoBono().monto_base.toFixed(2)}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Rules Configuration */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Settings size={20} className="text-muted-foreground" />
            <h2 className="text-lg font-semibold text-card-foreground">
              Reglas de Descuento
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {reglas.map((regla) => (
                <div 
                  key={regla.id} 
                  className={`p-4 rounded-lg border transition-colors ${
                    regla.activa 
                      ? 'bg-muted/30 border-border' 
                      : 'bg-muted/10 border-border/50 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={regla.activa}
                            onChange={(e) => handleActivaChange(regla.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-ring after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                        <span className="font-medium text-foreground">
                          {TIPO_LABELS[regla.tipo]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 ml-14">
                        Descuento aplicado por cada {regla.tipo === 'tardanza' ? 'tardanza registrada' : 
                          regla.tipo === 'falta_leve' ? 'falta leve (excepto tardanzas)' :
                          regla.tipo === 'falta_grave' ? 'falta grave registrada' :
                          regla.tipo === 'amonestacion' ? 'amonestación escrita' :
                          'memorándum formal emitido'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-14 sm:ml-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={regla.porcentajeDescuento}
                          onChange={(e) => handlePorcentajeChange(regla.id, parseInt(e.target.value) || 0)}
                          min="0"
                          max="100"
                          disabled={!regla.activa}
                          className="w-20 px-3 py-2 bg-input border border-border rounded-lg text-foreground text-center focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        />
                        <span className="text-foreground font-medium">%</span>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        = S/ {((getActiveTipoBono().monto_base * regla.porcentajeDescuento) / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Cargos (categorías) */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-card-foreground">Configuración de Cargos</h3>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={newCargoName}
                onChange={(e) => setNewCargoName(e.target.value)}
                placeholder="Nuevo cargo"
                className="px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleAddCargo}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg"
              >
                Agregar Cargo
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cargos.map(c => (
              <div key={c.id} className="p-3 bg-muted/20 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">{c.nombre}</div>
                  <div className="text-sm text-muted-foreground">{c.descripcion}</div>
                </div>
                <div>
                  <button onClick={() => {
                    const newC = cargos.map(x => x.id === c.id ? { ...x, activo: !x.activo } : x);
                    saveCargos(newC);
                    setCargos(newC);
                  }} className="px-2 py-1 rounded-lg bg-muted">{c.activo ? 'Desactivar' : 'Activar'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loss Conditions */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Condiciones de Pérdida Total del Bono
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <div className="w-2 h-2 rounded-full bg-destructive mt-1.5"></div>
              <div>
                <p className="font-medium text-foreground">2 o más faltas graves en un mes</p>
                <p className="text-muted-foreground">El empleado pierde el 100% del bono del mes.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <div className="w-2 h-2 rounded-full bg-destructive mt-1.5"></div>
              <div>
                <p className="font-medium text-foreground">5 o más faltas leves en un mes</p>
                <p className="text-muted-foreground">El empleado pierde el 100% del bono del mes.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#f59e0b]/10 rounded-lg border border-[#f59e0b]/30">
              <div className="w-2 h-2 rounded-full bg-[#f59e0b] mt-1.5"></div>
              <div>
                <p className="font-medium text-foreground">3 o más faltas leves en 30 días</p>
                <p className="text-muted-foreground">
                  Se genera una alerta de acumulación. La siguiente falta puede elevarse a grave.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Nota: Estas condiciones están establecidas en el Reglamento Interno y no son configurables.
          </p>
        </div>

        {/* About */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Acerca del Sistema
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Sistema de Control Disciplinario</strong></p>
            <p>RGR Selva Vehículos y Maquinarias E.I.R.L.</p>
            <p className="mt-4">
              Este sistema permite gestionar el control disciplinario y los bonos por disciplina
              del personal. Los datos se sincronizan con la base de datos del servidor.
            </p>
            <p className="mt-2 text-xs">
              Si el sistema se reinicia o la base de datos está limpia, el contenido aparecerá vacío hasta que se registre nueva información.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
