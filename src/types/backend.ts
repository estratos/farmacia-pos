/**
 * Tipos del backend central (espejo de la especificación OpenAPI
 * server/public/api-docs/openapi.yaml). Los precios del servidor llegan como
 * string con 2 decimales; se convierten a number al aplicar localmente.
 */

export interface BUser {
  id: string;
  store_id: string;
  name: string;
  username: string;
  role: 'admin' | 'manager' | 'cashier';
  active: boolean;
}

export interface BStore {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  settings: {
    tax_rate: number;
    receipt_footer: string;
    license_number: string | null;
  };
  created_at: string;
}

export interface BProduct {
  id: string;
  name: string;
  description: string | null;
  price: string; // '25.50'
  barcode: string | null;
  sku: string | null;
  category: string | null;
  requires_prescription: boolean;
  controlled: boolean;
  expiration_date: string | null;
  lot_number: string | null;
  image: string | null; // ruta local (solo lectura por API)
  image_url: string | null; // URL absoluta para el POS (pública, sin token)
  rev: number;
  updated_at: string;
  deleted_at: string | null;
}

export interface BStock {
  store_id: string;
  product_id: string;
  stock: number;
  price_override: string | null;
  rev: number;
  updated_at: string;
}

export interface BMovement {
  id: string;
  store_id: string;
  product_id: string;
  type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  unit_price: string | null;
  reference: string | null;
  reason: string | null;
  supplier: string | null;
  user_id: string | null;
  user_name: string | null;
  lot_number: string | null;
  expiration_date: string | null;
  created_at: string;
}

export interface BSaleItem {
  product_id: string;
  name: string;
  quantity: number;
  price: string;
  requires_prescription: boolean;
}

export interface BSale {
  id: string;
  store_id: string;
  reference: string;
  items: BSaleItem[];
  subtotal: string;
  tax: string;
  total: string;
  payment_method: string;
  received: string | null;
  change: string | null;
  customer_id: string | null;
  customer_snapshot: Record<string, unknown> | null;
  cashier_name: string;
  status: 'completed' | 'voided';
  timbrada: boolean;
  voided_at: string | null;
  created_at: string;
}

export interface BCustomer {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  rfc: string | null;
  razon_social: string | null;
  regimen_fiscal: string | null;
  codigo_postal: string | null;
  uso_cfdi: string | null;
  factura_email: string | null;
  rev: number;
  updated_at: string;
  deleted_at: string | null;
}

export type BChangeEntity =
  | 'product'
  | 'stock'
  | 'movement'
  | 'sale'
  | 'purchase'
  | 'customer'
  | 'supplier'
  | 'lot';

export interface BChangeLogItem {
  id: number; // cursor (monótono)
  entity: BChangeEntity;
  entity_id: string;
  op: 'upsert' | 'delete';
  rev: number;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface BErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

/** Resultado de una operación en /sync/push */
export interface BPushResult {
  client_op_id: string | null;
  ok: boolean;
  entity?: string;
  id?: string;
  rev?: number;
  data?: Record<string, unknown>;
  error?: { code: string; message: string };
}
