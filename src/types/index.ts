export interface Product {
  id: string; // UUID (generado por el cliente; coincide con el backend central)
  name: string;
  description: string;
  price: number;
  stock: number;
  barcode: string;
  sku?: string; // SKU del proveedor/WooCommerce (backend)
  category: string;
  requires_prescription: boolean;
  controlled: boolean;
  expiration_date?: string;
  lot_number?: string;
  image_url?: string; // URL absoluta de la imagen (backend; se usa directo, sin copia local)
  rev?: number; // versión del catálogo (servidor) — para concurrencia
  updated_at?: string;
  deleted_at?: string | null;
  price_override?: number | null; // precio propio de la tienda (backend)
}

export interface CartItem extends Product {
  quantity: number;
}

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Sale {
  id: string; // UUID
  reference?: string; // ej. VENTA-00001 (servidor)
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  date: string;
  payment_method: PaymentMethod;
  received?: number;
  change?: number;
  customer_id?: string;
  cashier_name?: string;
  status?: 'completed' | 'voided';
}

export interface Customer {
  id: string; // UUID
  name: string;
  phone: string;
  email: string;
  created_at: string;
  rfc?: string;
  razon_social?: string;
  rev?: number;
  deleted_at?: string | null;
}

export interface AppSettings {
  pharmacyName: string;
  licenseNumber: string;
  taxRate: number; // porcentaje de IVA, ej. 16
  receiptFooter: string;
  theme?: 'light' | 'dark';
  // Conexión con el backend central
  apiUrl?: string;
  apiUsername?: string;
  apiPassword?: string;
  apiDeviceKey?: string;
  storeId?: string;
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
  | 'shrinkage' // merma (daño, vencimiento, pérdida)
  | 'purchase_return'; // devolución de compra (anulación de compra)

/**
 * Movimiento de inventario (auditoría).
 * Append-only: no se edita ni elimina. Referencias estables (product_id,
 * reference) para poder sincronizarse con el backend después.
 */
export interface InventoryMovement {
  id: string; // UUID
  product_id: string; // UUID del producto
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
  user_id?: string;
  lot_number?: string; // lote consumido/acreditado (FEFO)
  expiration_date?: string;
  notes?: string;
  created_at: string; // ISO 8601
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// ---------------------------------------------------------------- Caja (cortes)

export interface CashSession {
  id: string; // UUID
  store_id?: string;
  caja: string; // nombre del dispositivo/caja
  fondo: number; // efectivo inicial
  cajero: string;
  abierta_el: string; // ISO
  cerrada_el?: string | null; // ISO (al cerrar con el corte)
}

export type CashMovementType = 'apertura' | 'retiro' | 'ingreso' | 'ajuste';

export interface CashMovement {
  id: string;
  session_id: string;
  tipo: CashMovementType;
  monto: number; // con signo: retiro negativo, ingreso positivo
  motivo?: string;
  fecha: string; // ISO
  usuario: string;
}

export interface CashCut {
  id: string;
  session_id: string;
  caja?: string; // nombre del dispositivo/caja (para el ticket)
  ventas_por_metodo: Record<PaymentMethod, { tickets: number; total: number }>;
  esperado: Record<PaymentMethod, number>;
  contado: Partial<Record<PaymentMethod, number>>;
  diferencia: Record<PaymentMethod, number> & { total: number };
  notas?: string;
  cajero: string;
  cerrado_el: string; // ISO
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
