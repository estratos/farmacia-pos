import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Package, FileText, ShieldAlert } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { productService } from '../services/productService';
import { formatMoney } from '../services/storage';
import type { Product } from '../types';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  barcode: string;
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
  category: '',
  requires_prescription: false,
  controlled: false,
  expiration_date: '',
  lot_number: '',
};

function Inventory() {
  const [products, setProducts] = useState<Product[]>(() => productService.getProducts());
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const filtered = search.trim() ? productService.searchProducts(search) : products;

  const refresh = () => setProducts(productService.getProducts());

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
      category: product.category,
      requires_prescription: product.requires_prescription,
      controlled: product.controlled,
      expiration_date: product.expiration_date ?? '',
      lot_number: product.lot_number ?? '',
    });
    setError(null);
    setShowForm(true);
  };

  const handleDelete = (product: Product) => {
    if (window.confirm(`¿Eliminar "${product.name}" del inventario?`)) {
      productService.deleteProduct(product.id);
      refresh();
      showToast('success', 'Producto eliminado');
    }
  };

  const handleSubmit = () => {
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
      category: form.category.trim() || 'General',
      requires_prescription: form.requires_prescription,
      controlled: form.controlled,
      expiration_date: form.expiration_date || undefined,
      lot_number: form.lot_number.trim() || undefined,
    };

    if (editingId !== null) {
      productService.updateProduct(editingId, data);
      showToast('success', 'Producto actualizado');
    } else {
      productService.createProduct(data);
      showToast('success', 'Producto agregado');
    }
    refresh();
    setShowForm(false);
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
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        <Package className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          Código: {product.barcode}
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
                        onClick={() => openEdit(product)}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
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
    </div>
  );
}

export default Inventory;
