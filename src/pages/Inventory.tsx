import { useSyncExternalStore, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  FileText,
  ShieldAlert,
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  History,
  ArrowLeftRight,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAppContext } from '../contexts/AppContext';
import { productService, subscribeProducts, getProductsRevision } from '../services/productService';
import { movementService, MOVEMENT_LABELS } from '../services/movementService';
import { writeCreateProduct, writeUpdateProduct, writeDeleteProduct, writeAdjustStock } from '../services/remoteApi';
import ProductThumb from '../components/products/ProductThumb';
import ProductDetailModal from '../components/products/ProductDetailModal';
import { formatMoney } from '../services/storage';
import type { InventoryMovement, MovementType, Product } from '../types';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  barcode: string;
  sku: string;
  category: string;
  requires_prescription: boolean;
  controlled: boolean;
  expiration_date: string;
  lot_number: string;
}

const emptyForm: ProductForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  barcode: '',
  sku: '',
  category: '',
  requires_prescription: false,
  controlled: false,
  expiration_date: '',
  lot_number: '',
};

type StockAction = 'purchase' | 'adjustment' | 'shrinkage';

const STOCK_ACTIONS: {
  value: StockAction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { value: 'purchase', label: 'Entrada', icon: PackagePlus, color: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'adjustment', label: 'Ajuste', icon: SlidersHorizontal, color: 'text-amber-600 dark:text-amber-400' },
  { value: 'shrinkage', label: 'Merma', icon: PackageMinus, color: 'text-red-600 dark:text-red-400' },
];

function Inventory() {
  // Re-render al cambiar el catálogo (sync, write-through, reconciliación)
  useSyncExternalStore(subscribeProducts, getProductsRevision);
  const products = productService.getProducts();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { state } = useAppContext();

  // Modal de movimientos de stock por producto
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAction, setStockAction] = useState<StockAction>('purchase');
  const [stockQty, setStockQty] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [stockSupplier, setStockSupplier] = useState('');
  const [stockCost, setStockCost] = useState('');
  const [stockError, setStockError] = useState<string | null>(null);
  const [recentMovements, setRecentMovements] = useState<InventoryMovement[]>([]);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const filtered = search.trim() ? productService.searchProducts(search) : products;
  const userName = state.user?.name;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      barcode: product.barcode,
      sku: product.sku ?? '',
      category: product.category,
      requires_prescription: product.requires_prescription,
      controlled: product.controlled,
      expiration_date: product.expiration_date ?? '',
      lot_number: product.lot_number ?? '',
    });
    setError(null);
    setShowForm(true);
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`¿Eliminar "${product.name}" del inventario?`)) {
      try {
        await writeDeleteProduct(product.id);
        showToast('success', 'Producto eliminado');
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'No se pudo eliminar');
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);
    if (isNaN(price) || price < 0) {
      setError('Precio inválido');
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setError('Stock inválido');
      return;
    }

    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      stock,
      barcode: form.barcode.trim() || `750${Date.now()}`,
      sku: form.sku.trim() || undefined,
      category: form.category.trim() || 'General',
      requires_prescription: form.requires_prescription,
      controlled: form.controlled,
      expiration_date: form.expiration_date || undefined,
      lot_number: form.lot_number.trim() || undefined,
    };

    try {
      if (editingId !== null) {
        await writeUpdateProduct(editingId, data, { user: userName });
        showToast('success', 'Producto actualizado');
      } else {
        await writeCreateProduct(data, { user: userName });
        showToast('success', 'Producto agregado');
      }
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el producto');
    }
  };

  // ---- Modal de stock ----
  const openStockModal = (product: Product) => {
    setStockProduct(product);
    setStockAction('purchase');
    setStockQty('');
    setStockReason('');
    setStockSupplier('');
    setStockCost('');
    setStockError(null);
    setRecentMovements(movementService.getByProduct(product.id).slice(0, 6));
  };

  const handleStockSubmit = async () => {
    if (!stockProduct) return;
    const qty = parseFloat(stockQty);
    if (isNaN(qty) || qty <= 0) {
      setStockError('La cantidad debe ser mayor a 0');
      return;
    }

    let delta: number;
    let type: MovementType;
    let reason: string | undefined;

    if (stockAction === 'purchase') {
      delta = qty;
      type = 'purchase';
      reason = 'Entrada de mercancía';
    } else if (stockAction === 'shrinkage') {
      if (qty > stockProduct.stock) {
        setStockError(`La merma no puede superar el stock actual (${stockProduct.stock})`);
        return;
      }
      delta = -qty;
      type = 'shrinkage';
      reason = stockReason.trim() || 'Merma (daño, vencimiento o pérdida)';
    } else {
      delta = qty;
      type = 'adjustment';
      reason = stockReason.trim() || 'Ajuste manual de inventario';
    }

    const cost = parseFloat(stockCost);
    try {
      await writeAdjustStock(stockProduct.id, delta, {
        type,
        reason,
        supplier: stockAction === 'purchase' ? stockSupplier.trim() || undefined : undefined,
        unitPrice: !isNaN(cost) && cost > 0 ? cost : stockProduct.price,
        user: userName,
      });
      setStockProduct(productService.getById(stockProduct.id) ?? stockProduct);
      setRecentMovements(movementService.getByProduct(stockProduct.id).slice(0, 6));
      setStockQty('');
      setStockReason('');
      setStockSupplier('');
      setStockCost('');
      setStockError(null);
      showToast(
        'success',
        `${MOVEMENT_LABELS[type]}: ${delta > 0 ? '+' : ''}${qty} uds registrada`
      );
    } catch (err) {
      setStockError(err instanceof Error ? err.message : 'Error al registrar el movimiento');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventario</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {products.length} productos registrados
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Agregar Producto
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, código o categoría..."
          className="input-field pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/40">
              <tr>
                <th className="table-header">Producto</th>
                <th className="table-header">Categoría</th>
                <th className="table-header">Stock</th>
                <th className="table-header">Precio</th>
                <th className="table-header">Prescripción</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map((product) => (
                <tr
                  key={product.id}
                  onClick={() => setDetailProduct(product)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <ProductThumb
                        src={product.image_url}
                        name={product.name}
                        className="w-10 h-10 rounded-lg"
                      />
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          Código: {product.barcode}
                          {product.sku ? ` · SKU: ${product.sku}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400">
                    {product.category}
                  </td>
                  <td className="table-cell">
                    <span
                      className={`badge ${
                        product.stock === 0
                          ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300'
                          : product.stock < 10
                            ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {product.stock} uds
                    </span>
                  </td>
                  <td className="table-cell text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatMoney(product.price)}
                  </td>
                  <td className="table-cell">
                    {product.requires_prescription ? (
                      <span className="flex gap-1">
                        <span className="badge bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300">
                          <FileText className="w-3 h-3" /> Receta
                        </span>
                        {product.controlled && (
                          <span className="badge bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300">
                            <ShieldAlert className="w-3 h-3" /> Controlado
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openStockModal(product);
                        }}
                        className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                        title="Movimientos de stock (entrada / ajuste / merma)"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(product);
                        }}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(product);
                        }}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    No hay productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <Modal
          title={editingId !== null ? 'Editar Producto' : 'Agregar Producto'}
          onClose={() => setShowForm(false)}
          wide
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nombre *
              </label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Paracetamol 500mg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Descripción
              </label>
              <input
                className="input-field"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {editingId !== null &&
              (() => {
                const current = productService.getById(editingId);
                if (!current?.image_url) return null;
                return (
                  <div className="md:col-span-2 flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                    <ProductThumb src={current.image_url} name={current.name} className="w-12 h-12 rounded-lg" />
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      <p className="font-medium text-slate-700 dark:text-slate-200">
                        Imagen del producto
                      </p>
                      <p className="text-xs">
                        La asigna el backend (importación WooCommerce); se muestra desde la URL
                        que entrega la API.
                      </p>
                    </div>
                  </div>
                );
              })()}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Precio *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Stock *
              </label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Código de barras
              </label>
              <input
                className="input-field"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                SKU
              </label>
              <input
                className="input-field"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="Ej. PAM-500 (proveedor/WooCommerce)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Categoría
              </label>
              <input
                className="input-field"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ej. Analgésico"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Fecha de expiración
              </label>
              <input
                type="date"
                className="input-field"
                value={form.expiration_date}
                onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lote
              </label>
              <input
                className="input-field"
                value={form.lot_number}
                onChange={(e) => setForm({ ...form, lot_number: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-600"
                  checked={form.requires_prescription}
                  onChange={(e) => setForm({ ...form, requires_prescription: e.target.checked })}
                />
                <span>Requiere receta médica</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-600"
                  checked={form.controlled}
                  onChange={(e) => setForm({ ...form, controlled: e.target.checked })}
                />
                <span>Medicamento controlado</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-4 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex space-x-2 mt-6">
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button onClick={handleSubmit} className="btn-primary flex-1">
              {editingId !== null ? 'Guardar Cambios' : 'Agregar Producto'}
            </button>
          </div>
        </Modal>
      )}

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onEdit={(p) => {
            setDetailProduct(null);
            openEdit(p);
          }}
          onStock={(p) => {
            setDetailProduct(null);
            openStockModal(p);
          }}
        />
      )}

      {stockProduct && (
        <Modal
          title={`Movimientos de stock — ${stockProduct.name}`}
          onClose={() => setStockProduct(null)}
        >
          <div className="space-y-4">
            {/* Acciones */}
            <div className="grid grid-cols-3 gap-2">
              {STOCK_ACTIONS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => {
                    setStockAction(value);
                    setStockError(null);
                  }}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    stockAction === value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${stockAction === value ? 'text-white' : color}`} />
                  {label}
                </button>
              ))}
            </div>

            {/* Formulario */}
            <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Stock actual</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {stockProduct.stock} uds
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {stockAction === 'adjustment'
                    ? 'Cantidad (usa signo: + agrega, - resta)'
                    : 'Cantidad'}
                </label>
                <input
                  type="number"
                  step="1"
                  min={stockAction === 'adjustment' ? undefined : 0}
                  className="input-field"
                  value={stockQty}
                  onChange={(e) => {
                    setStockQty(e.target.value);
                    setStockError(null);
                  }}
                  placeholder={stockAction === 'adjustment' ? 'Ej. -5 o +10' : 'Ej. 10'}
                  autoFocus
                />
              </div>
              {stockAction === 'purchase' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Proveedor
                    </label>
                    <input
                      className="input-field"
                      value={stockSupplier}
                      onChange={(e) => setStockSupplier(e.target.value)}
                      placeholder="Ej. Distribuidora XYZ"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Costo unitario
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={stockCost}
                      onChange={(e) => setStockCost(e.target.value)}
                      placeholder={String(stockProduct.price)}
                    />
                  </div>
                </div>
              )}
              {(stockAction === 'adjustment' || stockAction === 'shrinkage') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Motivo
                  </label>
                  <input
                    className="input-field"
                    value={stockReason}
                    onChange={(e) => setStockReason(e.target.value)}
                    placeholder={
                      stockAction === 'shrinkage'
                        ? 'Ej. Producto dañado, vencimiento, pérdida'
                        : 'Ej. Conteo físico, corrección'
                    }
                  />
                </div>
              )}

              {stockError && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-700 dark:text-red-300">
                  {stockError}
                </div>
              )}

              <button onClick={handleStockSubmit} className="btn-primary w-full">
                <Plus className="w-4 h-4" />
                Registrar {MOVEMENT_LABELS[stockAction]}
              </button>
            </div>

            {/* Historial reciente */}
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                <History className="w-4 h-4" />
                Movimientos recientes
              </h4>
              {recentMovements.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Sin movimientos registrados para este producto.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {recentMovements.map((m) => (
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
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Inventory;
