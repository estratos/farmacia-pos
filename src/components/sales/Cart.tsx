import { Minus, Plus, Trash2, AlertTriangle, ShoppingCart, ArrowRight } from 'lucide-react';
import { settingsService } from '../../services/settingsService';
import { formatMoney } from '../../services/storage';
import type { CartItem } from '../../types';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onCheckout: () => void;
}

function Cart({ items, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) {
  const taxRate = settingsService.getSettings().taxRate;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  const stockIssues = items.filter((item) => item.quantity > item.stock);
  const canCheckout = items.length > 0 && stockIssues.length === 0;

  return (
    <div className="card p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Carrito de Venta
        </h2>
        {items.length > 0 && (
          <span className="badge bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300">
            {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
          </span>
        )}
      </div>

      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto flex-1">
        {items.map((item) => {
          const outOfStock = item.quantity > item.stock;
          return (
            <div key={item.id} className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900 dark:text-white">{item.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatMoney(item.price)} c/u
                  </p>
                  {outOfStock && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Solo hay {item.stock} en inventario
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Quitar del carrito"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-9 text-center text-sm font-medium text-slate-900 dark:text-white tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatMoney(item.price * item.quantity)}
                </span>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">El carrito está vacío</p>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>IVA ({taxRate}%)</span>
              <span className="tabular-nums">{formatMoney(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(total)}</span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            disabled={!canCheckout}
            className="btn-success w-full"
          >
            Procesar Venta
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Cart;
