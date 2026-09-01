export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  barcode: string;
  category: string;
  requires_prescription: boolean;
  controlled: boolean;
  expiration_date?: string;
  lot_number?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Sale {
  id: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  date: string;
  payment_method: PaymentMethod;
  received?: number;
  change?: number;
  customer_id?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface AppSettings {
  pharmacyName: string;
  licenseNumber: string;
  taxRate: number; // porcentaje de IVA, ej. 16
  receiptFooter: string;
  theme?: 'light' | 'dark';
}

/**
 * Tipos de movimiento de inventario.
 * Identificadores estables (en inglés) para facilitar la sincronización
 * con el backend futuro; la UI muestra etiquetas en español.
 */
export type MovementType =
  | 'initial' // stock inicial / alta de producto
  | 'purchase' // entrada por compra
  | 'sale' // venta (generado automáticamente)
  | 'return' // devolución de cliente
  | 'adjustment' // ajuste manual (conteo, corrección)
  | 'shrinkage'; // merma (daño, vencimiento, pérdida)

/**
 * Movimiento de inventario (auditoría).
 * Append-only: no se edita ni elimina. Referencias estables (product_id,
 * reference) para poder sincronizarse con el backend después.
 */
export interface InventoryMovement {
  id: number;
  product_id: number;
  product_name: string; // snapshot al momento del movimiento
  product_barcode: string; // snapshot
  type: MovementType;
  quantity: number; // con signo: + entrada, - salida
  stock_before: number;
  stock_after: number;
  unit_price?: number; // precio unitario al momento (costo o venta)
  reference?: string; // ej. "VENTA-00012" o id de la venta
  reason?: string; // motivo (ajustes, mermas, devoluciones)
  supplier?: string; // proveedor (compras)
  user: string;
  notes?: string;
  created_at: string; // ISO 8601
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// Tipos para Electron
export interface ElectronAPI {
  getAppVersion?: () => Promise<string>;
  getAppPath?: () => Promise<string>;
  minimizeWindow?: () => void;
  maximizeWindow?: () => void;
  closeWindow?: () => void;
  openFile?: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
