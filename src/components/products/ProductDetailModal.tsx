import {
  FileText,
  ShieldAlert,
  CalendarDays,
  Tag,
  Boxes,
  StickyNote,
  Pencil,
  ArrowLeftRight,
  Hash,
} from 'lucide-react';
import Modal from '../ui/Modal';
import ProductThumb from './ProductThumb';
import { movementService, MOVEMENT_LABELS } from '../../services/movementService';
import { formatMoney } from '../../services/storage';
import type { Product } from '../../types';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onStock: (product: Product) => void;
}

/** Ficha del producto: imagen, datos y movimientos recientes con accesos rápidos. */
function ProductDetailModal({ product, onClose, onEdit, onStock }: ProductDetailModalProps) {
  const recent = movementService.getByProduct(product.id).slice(0, 5);

  const stockClass =
    product.stock === 0
      ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300'
      : product.stock < 10
        ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
        : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';

  const fields = [
    { icon: Hash, label: 'Código de barras', value: product.barcode || '—' },
    { icon: Tag, label: 'SKU', value: product.sku || '—' },
    { icon: Boxes, label: 'Categoría', value: product.category || '—' },
    {
      icon: CalendarDays,
      label: 'Expiración',
      value: product.expiration_date
        ? new Date(`${product.expiration_date}T00:00:00`).toLocaleDateString('es-MX')
        : '—',
    },
    { icon: Tag, label: 'Lote', value: product.lot_number || '—' },
    { icon: StickyNote, label: 'Descripción', value: product.description || '—' },
  ];

  return (
    <Modal title="Ficha del producto" onClose={onClose} wide>
      {/* Cabecera: imagen + nombre + badges + precio/stock */}
      <div className="flex gap-4 mb-5">
        <ProductThumb
          src={product.image_url}
          name={product.name}
          className="w-24 h-24 rounded-xl"
          iconClassName="w-10 h-10"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{product.name}</h3>
            {product.requires_prescription && (
              <span className="badge bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300">
                <FileText className="w-3 h-3" /> Receta
              </span>
            )}
            {product.controlled && (
              <span className="badge bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300">
                <ShieldAlert className="w-3 h-3" /> Controlado
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge ${stockClass}`}>{product.stock} uds</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {formatMoney(product.price)}
            </span>
          </div>
        </div>
      </div>

      {/* Campos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.label}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg"
            >
              <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                <Icon className="w-3.5 h-3.5" /> {f.label}
              </p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-0.5 break-words">
                {f.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Movimientos recientes */}
      <div className="mt-5">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
          Movimientos recientes
        </h4>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Sin movimientos registrados para este producto.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {recent.map((m) => (
              <div
                key={m.id}
                className="flex justify-between items-center px-3 py-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg text-sm"
              >
                <div>
                  <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {MOVEMENT_LABELS[m.type]}
                  </span>
                  <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                    {new Date(m.created_at).toLocaleString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-semibold tabular-nums ${
                      m.quantity > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {m.quantity > 0 ? '+' : ''}
                    {m.quantity}
                  </span>
                  <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                    {m.stock_before} → {m.stock_after}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 mt-6">
        <button onClick={onClose} className="btn-secondary flex-1">
          Cerrar
        </button>
        <button onClick={() => onStock(product)} className="btn-ghost flex-1">
          <ArrowLeftRight className="w-4 h-4" />
          Stock
        </button>
        <button onClick={() => onEdit(product)} className="btn-primary flex-1">
          <Pencil className="w-4 h-4" />
          Editar
        </button>
      </div>
    </Modal>
  );
}

export default ProductDetailModal;
