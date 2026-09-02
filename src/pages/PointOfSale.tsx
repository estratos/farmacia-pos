import { useState } from 'react';
import ProductSearch from '../components/products/ProductSearch';
import Cart from '../components/sales/Cart';
import CheckoutModal from '../components/sales/CheckoutModal';
import Receipt from '../components/sales/Receipt';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../components/ui/Toast';
import { settingsService } from '../services/settingsService';
import { writeCreateSale } from '../services/remoteApi';
import type { CartItem, PaymentMethod, Product, Sale } from '../types';

function PointOfSale() {
  const { state, dispatch } = useAppContext();
  const { cart } = state;
  const { showToast } = useToast();

  const [showCheckout, setShowCheckout] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const taxRate = settingsService.getSettings().taxRate;
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  const handleAddToCart = (product: Product) => {
    dispatch({ type: 'ADD_TO_CART', payload: product });
  };

  const handleRemoveFromCart = (productId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    dispatch({ type: 'UPDATE_CART_QUANTITY', payload: { id: productId, quantity } });
  };

  const handleConfirmSale = async (payload: {
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    payment_method: PaymentMethod;
    received?: number;
    change?: number;
  }) => {
    try {
      const sale = await writeCreateSale(payload, { user: state.user?.name });
      dispatch({ type: 'CLEAR_CART' });
      setShowCheckout(false);
      setLastSale(sale);
      showToast('success', `Venta ${sale.reference ? `${sale.reference} ` : ''}registrada`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo procesar la venta';
      showToast('error', message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-full">
      <div className="lg:col-span-2">
        <ProductSearch onAddToCart={handleAddToCart} />
      </div>
      <div className="lg:col-span-1">
        <Cart
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onCheckout={() => setShowCheckout(true)}
        />
      </div>

      {showCheckout && (
        <CheckoutModal
          items={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onConfirm={handleConfirmSale}
          onCancel={() => setShowCheckout(false)}
        />
      )}

      {lastSale && <Receipt sale={lastSale} onClose={() => setLastSale(null)} />}
    </div>
  );
}

export default PointOfSale;
