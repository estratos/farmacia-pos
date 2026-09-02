import { useState } from 'react';
import {
  Search,
  Plus,
  Barcode,
  FileText,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { formatMoney } from '../../services/storage';
import ProductThumb from './ProductThumb';
import type { Product } from '../../types';

interface ProductSearchProps {
  onAddToCart: (product: Product) => void;
}

function ProductSearch({ onAddToCart }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [products] = useState<Product[]>(() => productService.getProducts());
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const filteredProducts = searchTerm.trim()
    ? productService.searchProducts(searchTerm)
    : products;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !searchTerm.trim()) return;

    const byBarcode = productService.getProductByBarcode(searchTerm.trim());
    if (byBarcode) {
      if (byBarcode.stock <= 0) {
        setFeedback({ type: 'error', message: `${byBarcode.name} no tiene stock disponible` });
      } else {
        onAddToCart(byBarcode);
        setFeedback({ type: 'success', message: `Agregado: ${byBarcode.name}` });
      }
      setSearchTerm('');
      return;
    }

    if (filteredProducts.length === 1) {
      onAddToCart(filteredProducts[0]);
      setSearchTerm('');
    } else if (filteredProducts.length > 1) {
      setFeedback({ type: 'info', message: 'Selecciona un producto de la lista' });
    } else {
      setFeedback({ type: 'error', message: 'No se encontró el producto' });
    }
  };

  const feedbackStyles = {
    success: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    error: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300',
    info: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-300',
  };
  const feedbackIcons = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    error: <AlertTriangle className="w-4 h-4 shrink-0" />,
    info: <Info className="w-4 h-4 shrink-0" />,
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Buscar Productos
        </h2>
        <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
          {filteredProducts.length} resultados
        </span>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o código de barras..."
          className="input-field pl-9"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setFeedback(null);
          }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
        <Barcode className="w-3.5 h-3.5" />
        Lector de código de barras: escanea y presiona Enter para agregar directo al carrito.
      </p>

      {feedback && (
        <div
          className={`mb-4 px-3 py-2 border rounded-lg text-sm flex items-center gap-2 ${feedbackStyles[feedback.type]}`}
        >
          {feedbackIcons[feedback.type]}
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/40 transition-all"
          >
            <div className="flex items-start gap-3">
              <ProductThumb
                src={product.image_url}
                name={product.name}
                className="w-12 h-12 rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {product.name}
                  </h3>
                  <div className="flex gap-1 shrink-0">
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
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Código: {product.barcode}
                  {product.sku ? ` · SKU: ${product.sku}` : ''}
                </p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatMoney(product.price)}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      product.stock <= 0
                        ? 'text-red-600 dark:text-red-400'
                        : product.stock < 10
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    Stock: {product.stock}
                  </span>
                </div>
                <button
                  onClick={() => onAddToCart(product)}
                  disabled={product.stock <= 0}
                  className="btn-primary w-full mt-3 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {product.stock <= 0 ? 'Sin stock' : 'Agregar al Carrito'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-10 text-slate-400 dark:text-slate-500">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No se encontraron productos</p>
        </div>
      )}
    </div>
  );
}

export default ProductSearch;
