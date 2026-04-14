import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, AlertCircle, Wand2, Info } from 'lucide-react';
import { InventoryService } from '../services/inventory.service';

const baseState = {
  category: 'Medicamento',
  code: '',
  name: '',
  stockCurrent: 0,
  minStock: 10,
  valorUnit: 0,
  valorTotal: 0,
  proveedor: '',
  nFactura: '',
  conceptoRecepcion: '',
  principioActivo: '',
  marca: '',
  laboratorio: '',
  concentracion: '',
  formaFarmaceutica: '',
  presentation: '',
  unidadMedida: '',
  batchNumber: '',
  expirationDate: '',
  motivo: '',
  responsable: '',
  observacionesTrazabilidad: '',
  diasValid: '',
  estadoVto: '',
  cum: '',
  ium: '',
  regInvima: '',
  vidaUtil: '',
  fabricante: '',
  serie: '',
  clasifRiesgo: '',
  vigInvima: '',
  fechaHidrostatica: '',
  pinturaOk: false,
  hidroVigente: false,
  termoOk: false,
};

const inputClasses = 'w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500';
const MAX_LENGTH_DEFAULT = 50;
const FIELD_MAX_LENGTHS = {
  responsable: 100,
  observacionesTrazabilidad: 250,
};
const NUMERIC_ONLY_FIELDS = new Set(['vidaUtil']);
const NON_UPPERCASE_INPUT_TYPES = new Set(['number', 'date', 'checkbox']);

const getFieldMaxLength = (name) => FIELD_MAX_LENGTHS[name] ?? MAX_LENGTH_DEFAULT;

export default function ProductForm({ onClose, onProductCreated, initialData = null }) {
  const [formData, setFormData] = useState(baseState);
  const [loading, setLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!initialData) return;

    setFormData({
      ...baseState,
      ...initialData,
      expirationDate: initialData.expirationDate && initialData.expirationDate.toDate
        ? new Date(initialData.expirationDate.toDate()).toISOString().split('T')[0]
        : initialData.expirationDate || '',
      fechaHidrostatica: initialData.fechaHidrostatica && initialData.fechaHidrostatica.toDate
        ? new Date(initialData.fechaHidrostatica.toDate()).toISOString().split('T')[0]
        : initialData.fechaHidrostatica || '',
    });
  }, [initialData]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      valorTotal: (Number(prev.valorUnit) * Number(prev.stockCurrent)) || 0,
    }));
  }, [formData.valorUnit, formData.stockCurrent]);

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    setError(null);
    try {
      const code = await InventoryService.generateNextCode(formData.category);
      setFormData((prev) => ({ ...prev, code }));
    } catch (err) {
      setError(`Error generando codigo: ${err.message}`);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let nextValue = type === 'checkbox' ? checked : value;

    if (type !== 'checkbox' && typeof nextValue === 'string') {
      if (NUMERIC_ONLY_FIELDS.has(name)) {
        nextValue = nextValue.replace(/\D/g, '');
      }

      const maxLength = getFieldMaxLength(name);
      if (nextValue.length > maxLength) {
        nextValue = nextValue.slice(0, maxLength);
      }

      const tag = String(e.target?.tagName || '').toUpperCase();
      const isTextField = (tag === 'INPUT' || tag === 'TEXTAREA') && !NON_UPPERCASE_INPUT_TYPES.has(type);
      if (isTextField) {
        nextValue = nextValue.toUpperCase();
      }
    }

    setFormData((prev) => {
      if (name === 'category' && !initialData) {
        // Reset code so each category gets its own sequential namespace.
        return { ...prev, [name]: nextValue, code: '' };
      }
      return { ...prev, [name]: nextValue };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.code || !formData.name) {
        throw new Error('El codigo y el nombre son obligatorios.');
      }

      for (const [fieldName, fieldValue] of Object.entries(formData)) {
        if (typeof fieldValue !== 'string') continue;
        const maxLength = getFieldMaxLength(fieldName);
        if (fieldValue.length > maxLength) {
          throw new Error(`El campo ${fieldName} supera el maximo permitido (${maxLength}).`);
        }
      }

      if (formData.vidaUtil && !/^\d+$/.test(String(formData.vidaUtil))) {
        throw new Error('Vida util debe ser numerico.');
      }

      if (initialData) {
        await InventoryService.updateProduct(initialData.id, formData);
      } else {
        await InventoryService.createProduct(formData);
      }

      onProductCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-overlay-enter">
      <div className="bg-dark-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden modal-panel-enter flex flex-col max-h-[90vh]">
        <div className="bg-dark-900/40 px-6 py-4 border-b border-slate-700/70 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {initialData ? 'Editar producto' : 'Nuevo producto'}
            <span className="px-2 py-0.5 rounded text-xs border border-blue-500/30 bg-blue-500/10 text-blue-300">{formData.category}</span>
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div>
              <h3 className="text-blue-300 font-semibold text-sm mb-4 border-b border-slate-700/50 pb-2">1. Informacion principal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Categoria *</label>
                  <select name="category" value={formData.category} onChange={handleChange} disabled={!!initialData} className={`${inputClasses} ${initialData ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <option value="Medicamento">Medicamento</option>
                    <option value="Dispositivo">Dispositivo medico</option>
                    <option value="Reactivo">Reactivo</option>
                    <option value="Gas">Gas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Codigo *</label>
                  <div className="flex gap-2">
                    <input name="code" required value={formData.code} onChange={handleChange} readOnly={!!initialData} className={`${inputClasses} ${initialData ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder="Ej: MED-0001" />
                    {!initialData && (
                      <button type="button" onClick={handleGenerateCode} disabled={generatingCode} className="p-2.5 bg-blue-500/10 text-blue-300 rounded-lg hover:bg-blue-500/20" title="Generar codigo automatico">
                        <Wand2 className={`w-5 h-5 ${generatingCode ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Nombre *</label>
                  <input name="name" required value={formData.name} onChange={handleChange} className={inputClasses} placeholder="Ej: Acetaminofen 500mg" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Stock inicial</label>
                  <input name="stockCurrent" type="number" min="0" disabled={!!initialData} value={formData.stockCurrent} onChange={handleChange} className={`${inputClasses} ${initialData ? 'opacity-50' : ''}`} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-blue-300 font-semibold text-sm mb-4 border-b border-slate-700/50 pb-2">2. Identificacion</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['Medicamento', 'Dispositivo', 'Reactivo'].includes(formData.category) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Marca</label>
                    <input name="marca" value={formData.marca} onChange={handleChange} className={inputClasses} />
                  </div>
                )}
                {formData.category === 'Medicamento' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Principio activo</label>
                      <input name="principioActivo" value={formData.principioActivo} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Laboratorio</label>
                      <input name="laboratorio" value={formData.laboratorio} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Forma farmaceutica</label>
                      <input name="formaFarmaceutica" value={formData.formaFarmaceutica} onChange={handleChange} className={inputClasses} />
                    </div>
                  </>
                )}
                {formData.category === 'Dispositivo' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Fabricante</label>
                      <input name="fabricante" value={formData.fabricante} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">No. serie</label>
                      <input name="serie" value={formData.serie} onChange={handleChange} className={inputClasses} />
                    </div>
                  </>
                )}
                {['Medicamento', 'Gas'].includes(formData.category) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Concentracion</label>
                    <input name="concentracion" value={formData.concentracion} onChange={handleChange} className={inputClasses} />
                  </div>
                )}
                {['Dispositivo', 'Reactivo'].includes(formData.category) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Clasificacion riesgo</label>
                    <input name="clasifRiesgo" value={formData.clasifRiesgo} onChange={handleChange} className={inputClasses} />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Presentacion</label>
                  <input name="presentation" value={formData.presentation} onChange={handleChange} className={inputClasses} />
                </div>
                {['Medicamento', 'Dispositivo', 'Gas'].includes(formData.category) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Unidad de medida</label>
                    <input name="unidadMedida" value={formData.unidadMedida} onChange={handleChange} className={inputClasses} />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-blue-300 font-semibold text-sm mb-4 border-b border-slate-700/50 pb-2">3. Trazabilidad</h3>
              {formData.category === 'Medicamento' && (
                <div className="bg-dark-900/40 border border-slate-700/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3 text-slate-300 text-sm font-semibold">
                    <Info className="w-4 h-4 text-blue-300" /> Identificacion INVIMA
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input name="cum" value={formData.cum} onChange={handleChange} className={inputClasses} placeholder="CUM" />
                    <input name="ium" value={formData.ium} onChange={handleChange} className={inputClasses} placeholder="IUM" />
                    <input name="regInvima" value={formData.regInvima} onChange={handleChange} className={inputClasses} placeholder="Registro INVIMA" />
                  </div>
                </div>
              )}

              {['Dispositivo', 'Reactivo'].includes(formData.category) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Registro INVIMA / permiso comercializacion</label>
                  <input name="regInvima" value={formData.regInvima} onChange={handleChange} className={inputClasses} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Lote</label>
                  <input name="batchNumber" value={formData.batchNumber} onChange={handleChange} className={inputClasses} />
                </div>
                {['Medicamento', 'Dispositivo', 'Reactivo'].includes(formData.category) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Fecha vencimiento</label>
                      <input name="expirationDate" type="date" value={formData.expirationDate} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Vida util</label>
                      <input name="vidaUtil" type="number" min="0" value={formData.vidaUtil} onChange={handleChange} className={inputClasses} />
                    </div>
                  </>
                )}
                {formData.category === 'Gas' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Vigencia INVIMA</label>
                      <input name="vigInvima" type="date" value={formData.vigInvima} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Fecha hidrostatica</label>
                      <input name="fechaHidrostatica" type="date" value={formData.fechaHidrostatica} onChange={handleChange} className={inputClasses} />
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Motivo</label>
                  <select name="motivo" value={formData.motivo} onChange={handleChange} className={inputClasses}>
                    <option value="">Seleccionar (opcional)</option>
                    <option value="Compra">Compra</option>
                    <option value="Reposición de stock">Reposición de stock</option>
                    <option value="Devolución de ambulancia">Devolución de ambulancia</option>
                    <option value="Inventario Inicial">Inventario Inicial</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Responsable</label>
                  <input name="responsable" value={formData.responsable} onChange={handleChange} className={inputClasses} placeholder="Nombre del responsable" />
                  <p className="text-[11px] text-slate-500 mt-1">{String(formData.responsable || '').length}/100</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Observaciones</label>
                  <textarea
                    name="observacionesTrazabilidad"
                    value={formData.observacionesTrazabilidad}
                    onChange={handleChange}
                    rows={4}
                    className={`${inputClasses} resize-y min-h-[96px]`}
                    placeholder="Observaciones adicionales..."
                  />
                  <p className="text-[11px] text-slate-500 mt-1">{String(formData.observacionesTrazabilidad || '').length}/250</p>
                </div>
              </div>

              {formData.category === 'Gas' && (
                <div className="flex flex-wrap gap-6 mt-4 p-4 bg-dark-900/30 rounded-lg border border-slate-700/40">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input type="checkbox" name="pinturaOk" checked={formData.pinturaOk} onChange={handleChange} className="w-4 h-4 accent-blue-500" /> Pintura OK
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input type="checkbox" name="hidroVigente" checked={formData.hidroVigente} onChange={handleChange} className="w-4 h-4 accent-blue-500" /> Hidro vigente
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input type="checkbox" name="termoOk" checked={formData.termoOk} onChange={handleChange} className="w-4 h-4 accent-blue-500" /> Termo OK
                  </label>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-blue-300 font-semibold text-sm mb-4 border-b border-slate-700/50 pb-2">4. Inventario y proveedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Proveedor</label>
                  <input name="proveedor" value={formData.proveedor} onChange={handleChange} className={inputClasses} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Numero de factura</label>
                  <input name="nFactura" value={formData.nFactura} onChange={handleChange} className={inputClasses} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Concepto recepcion</label>
                  <input name="conceptoRecepcion" value={formData.conceptoRecepcion} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Stock minimo</label>
                  <input name="minStock" type="number" min="0" value={formData.minStock} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Valor unitario</label>
                  <input name="valorUnit" type="number" min="0" step="0.01" value={formData.valorUnit} onChange={handleChange} className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Valor total</label>
                  <input name="valorTotal" type="number" value={formData.valorTotal || 0} readOnly className={`${inputClasses} bg-dark-900/60 opacity-70 cursor-not-allowed`} />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="bg-dark-900/40 px-6 py-4 border-t border-slate-700/70 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/60">Cancelar</button>
          <button type="submit" form="productForm" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
            <Save className="w-4 h-4" /> {loading ? 'Guardando...' : 'Guardar producto'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
