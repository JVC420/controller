import React from 'react';
import { createPortal } from 'react-dom';
import { X, Box, Info, Tag, FileText, Activity, AlertTriangle } from 'lucide-react';

function Field({ label, value }) {
  return (
    <div className="bg-dark-900/40 rounded-lg p-3 border border-slate-700/40">
      <span className="block text-xs text-slate-500 mb-1">{label}</span>
      <span className="block text-sm font-medium text-slate-200">{value || 'N/A'}</span>
    </div>
  );
}

export default function ProductDetailModal({ product, onClose }) {
  if (!product) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-overlay-enter">
      <div className="bg-dark-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden modal-panel-enter flex flex-col max-h-[90vh]">
        <div className="bg-dark-900/40 px-6 py-4 border-b border-slate-700/70 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Box className="w-6 h-6 text-blue-400" />
              {product.name}
            </h2>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-0.5 rounded text-xs border border-blue-500/30 bg-blue-500/10 text-blue-300">{product.category || 'Medicamento'}</span>
              <span className="px-2 py-0.5 rounded text-xs border border-slate-700 bg-slate-800/80 text-slate-300 font-mono">{product.code}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 space-y-6">
          <div>
            <h3 className="text-blue-300 font-semibold text-sm mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" /> Informacion general
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Presentacion" value={product.presentation} />
              <Field label="Unidad de medida" value={product.unidadMedida} />
              <Field label="Stock" value={`${product.stockCurrent} (Min: ${product.minStock})`} />
              {product.marca && <Field label="Marca" value={product.marca} />}
            </div>
          </div>

          <div>
            <h3 className="text-blue-300 font-semibold text-sm mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Especificaciones
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {product.principioActivo && <Field label="Principio activo" value={product.principioActivo} />}
              {product.laboratorio && <Field label="Laboratorio" value={product.laboratorio} />}
              {product.formaFarmaceutica && <Field label="Forma farmaceutica" value={product.formaFarmaceutica} />}
              {product.concentracion && <Field label="Concentracion" value={product.concentracion} />}
              {product.fabricante && <Field label="Fabricante" value={product.fabricante} />}
              {product.serie && <Field label="No. serie" value={product.serie} />}
              {product.clasifRiesgo && <Field label="Clasificacion riesgo" value={product.clasifRiesgo} />}
            </div>
          </div>

          <div>
            <h3 className="text-blue-300 font-semibold text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Trazabilidad
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {product.batchNumber && <Field label="Lote" value={product.batchNumber} />}
              {product.expirationDate && (
                <Field
                  label="Fecha vencimiento"
                  value={product.expirationDate.toDate ? new Date(product.expirationDate.toDate()).toLocaleDateString() : product.expirationDate}
                />
              )}
              {product.vidaUtil && <Field label="Vida util" value={product.vidaUtil} />}
              {product.cum && <Field label="CUM" value={product.cum} />}
              {product.ium && <Field label="IUM" value={product.ium} />}
              {product.regInvima && <Field label="Registro INVIMA" value={product.regInvima} />}
              {product.vigInvima && <Field label="Vigencia INVIMA" value={product.vigInvima} />}
            </div>
          </div>

          {product.category === 'Gas' && (
            <div>
              <h3 className="text-blue-300 font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Detalles cilindro
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-dark-900/30 p-4 rounded-xl border border-slate-700/40">
                {product.fechaHidrostatica && (
                  <Field
                    label="Fecha hidrostatica"
                    value={product.fechaHidrostatica.toDate ? new Date(product.fechaHidrostatica.toDate()).toLocaleDateString() : product.fechaHidrostatica}
                  />
                )}
                <Field label="Pintura OK" value={product.pinturaOk ? 'Si' : 'No'} />
                <Field label="Hidro vigente" value={product.hidroVigente ? 'Si' : 'No'} />
                <Field label="Termometro OK" value={product.termoOk ? 'Si' : 'No'} />
              </div>
            </div>
          )}

          <div>
            <h3 className="text-blue-300 font-semibold text-sm mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Financiero y proveedor
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Proveedor" value={product.proveedor} />
              <Field label="No. factura" value={product.nFactura} />
              <Field label="Valor unitario" value={product.valorUnit ? `$${product.valorUnit.toLocaleString()}` : '$0'} />
              <Field label="Valor total" value={product.valorTotal ? `$${product.valorTotal.toLocaleString()}` : '$0'} />
              <div className="col-span-2">
                <Field label="Concepto / observaciones" value={product.conceptoRecepcion} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
