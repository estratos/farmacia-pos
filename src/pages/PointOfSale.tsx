import { useState } from 'react';
import ProductSearch from '../components/products/ProductSearch';
import ProductDetailModal from '../components/products/ProductDetailModal';
import Cart from '../components/sales/Cart';
import CheckoutModal from '../components/sales/CheckoutModal';
import Receipt from '../components/sales/Receipt';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../components/ui/Toast';
import { settingsService } from '../services/settingsService';
import { writeCreateSale } from '../services/remoteApi';
import { cashService } from '../services/cashService';
import OpenCashModal from '../components/cash/OpenCashModal';
import type { CartItem, PaymentMethod, Product, Sale } from '../types';

function PointOfSale() {
  const { state, dispatch } = useAppContext();
  const { cart } = state;
  const { showToast } = useToast();

  const [showCheckout, setShowCheckout] = useState(false);
  const [showOpenCash, setShowOpenCash] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const taxRate = settingsService.getSettings().taxRate;
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

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

  // Apertura obligatoria: no se puede cobrar sin caja abierta
  const handleCheckout = () => {
    if (!cashService.getCurrentSession()) {
      setShowOpenCash(true);
      return;
    }
    setShowCheckout(true);
  };

  const handleOpenCash = (fondo: number) => {
    cashService.openSession({ fondo, cajero: state.user?.name ?? 'Admin' });
    setShowOpenCash(false);
    showToast('success', 'Caja abierta — puedes cobrar la venta');
  };

  const handleConfirmSale = async (payload: {
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    tax_rate?: number; // fracción 0–1; 0 = sin IVA
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
        <ProductSearch onAddToCart={handleAddToCart} onViewProduct={setDetailProduct} />
      </div>
      <div className="lg:col-span-1">
        <Cart
          items={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onCheckout={handleCheckout}
          onViewProduct={setDetailProduct}
        />
      </div>

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onAddToCart={(p) => {
            handleAddToCart(p);
            setDetailProduct(null);
          }}
        />
      )}

      {showOpenCash && (
        <OpenCashModal onOpen={handleOpenCash} onClose={() => setShowOpenCash(false)} />
      )}

      {showCheckout && (
        <CheckoutModal
          items={cart}
          subtotal={subtotal}
          taxRatePercent={taxRate}
          onConfirm={handleConfirmSale}
          onCancel={() => setShowCheckout(false)}
        />
      )}

      {lastSale && <Receipt sale={lastSale} onClose={() => setLastSale(null)} />}
    </div>
  );
}

export default PointOfSale;
