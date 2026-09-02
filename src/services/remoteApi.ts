/**
 * Integración con el backend central (Farmacia Central API).
 * Implementa auth, endpoints write-through y los handlers de sincronización
 * (push del outbox + pull del feed de cambios), según la especificación OpenAPI
 * (server/public/api-docs/openapi.yaml) y docs/central-api-design.md.
 */
import { apiRequest, setAuthToken, setUnauthorizedHandler, ApiError, OfflineError } from './apiClient';
import { loadData, saveData, uuid } from './storage';
import { productService, type StockAdjustOptions } from './productService';
import { movementService } from './movementService';
import { saleService } from './saleService';
import { customerService } from './customerService';
import { outboxService } from './outbox';
import { settingsService } from './settingsService';
import type { SyncHandlers } from './syncEngine';
import type {
  BCustomer,
  BChangeLogItem,
  BMovement,
  BProduct,
  BPushResult,
  BSale,
  BStock,
  BStore,
  BUser,
} from '../types/backend';
import type { Customer, InventoryMovement, MovementType, Product, Sale } from '../types';

const API_PREFIX = '/api/v1';
const AUTH_KEY = 'auth';
const CURSOR_KEY = 'sync_cursor';
const CATALOG_RECONCILED_KEY = 'catalog_reconciled_v1';

// ---------------------------------------------------------------- Auth

export interface StoredAuth {
  token: string;
  user: BUser;
  store: BStore;
}

export function getStoredAuth(): StoredAuth | null {
  return loadData<StoredAuth | null>(AUTH_KEY, null);
}

export function getStoreId(): string | null {
  return getStoredAuth()?.store.id ?? null;
}

export function isAuthenticated(): boolean {
  return getStoredAuth() !== null;
}

export function clearAuth(): void {
  saveData<StoredAuth | null>(AUTH_KEY, null);
  setAuthToken(null);
}

// Re-autenticación automática: ante un 401, se intenta volver a entrar con las
// credenciales guardadas en Configuración (token caducado o sesión perdida).
let reauthInFlight: Promise<boolean> | null = null;

function registerUnauthorizedHandler(): void {
  setUnauthorizedHandler(async () => {
    const s = settingsService.getSettings();
    if (!s.apiUsername || !s.apiPassword) return false;
    if (!reauthInFlight) {
      reauthInFlight = (async () => {
        try {
          await login(s.apiUsername as string, s.apiPassword as string);
          return true;
        } catch {
          return false;
        } finally {
          reauthInFlight = null;
        }
      })();
    }
    return reauthInFlight;
  });
}

registerUnauthorizedHandler();

export async function login(username: string, password: string): Promise<StoredAuth> {
  const res = await apiRequest<{ token: string; user: BUser; store: BStore }>(
    `${API_PREFIX}/auth/login`,
    { method: 'POST', body: { username, password } }
  );
  const auth: StoredAuth = { token: res.token, user: res.user, store: res.store };
  saveData(AUTH_KEY, auth);
  setAuthToken(res.token);
  return auth;
}

export async function healthCheck(): Promise<boolean> {
  try {
    await apiRequest<{ status: string }>(`${API_PREFIX}/health`);
    return true;
  } catch {
    return false;
  }
}

export function getSyncCursor(): number {
  return loadData<number>(CURSOR_KEY, 0);
}

function setSyncCursor(cursor: number): void {
  saveData(CURSOR_KEY, cursor);
}

// ---------------------------------------------------------------- Conversiones

function toLocalProduct(b: BProduct): Omit<Product, 'stock'> {
  return {
    id: b.id,
    name: b.name,
    description: b.description ?? '',
    price: parseFloat(b.price) || 0,
    barcode: b.barcode ?? '',
    sku: b.sku ?? undefined,
    category: b.category ?? 'General',
    requires_prescription: b.requires_prescription,
    controlled: b.controlled,
    expiration_date: b.expiration_date ?? undefined,
    lot_number: b.lot_number ?? undefined,
    image_url: b.image_url ?? undefined,
    rev: b.rev,
    updated_at: b.updated_at,
    deleted_at: b.deleted_at,
  };
}

function toLocalMovement(b: BMovement): InventoryMovement {
  return {
    id: b.id,
    product_id: b.product_id,
    product_name: '', // se rellena con el catálogo local si existe
    product_barcode: '',
    type: (b.type as MovementType) ?? 'adjustment',
    quantity: b.quantity,
    stock_before: b.stock_before,
    stock_after: b.stock_after,
    unit_price: b.unit_price != null ? parseFloat(b.unit_price) : undefined,
    reference: b.reference ?? undefined,
    reason: b.reason ?? undefined,
    supplier: b.supplier ?? undefined,
    user: b.user_name ?? 'Sistema',
    user_id: b.user_id ?? undefined,
    lot_number: b.lot_number ?? undefined,
    expiration_date: b.expiration_date ?? undefined,
    created_at: b.created_at,
  };
}

function toLocalSale(b: BSale): Sale {
  const items = b.items.map((it) => ({
    id: it.product_id,
    name: it.name,
    quantity: it.quantity,
    price: parseFloat(it.price) || 0,
    stock: 0,
    barcode: '',
    category: '',
    description: '',
    requires_prescription: it.requires_prescription,
    controlled: false,
  }));
  return {
    id: b.id,
    reference: b.reference,
    items,
    subtotal: parseFloat(b.subtotal) || 0,
    tax: parseFloat(b.tax) || 0,
    total: parseFloat(b.total) || 0,
    date: b.created_at,
    payment_method: (b.payment_method as Sale['payment_method']) ?? 'efectivo',
    received: b.received != null ? parseFloat(b.received) : undefined,
    change: b.change != null ? parseFloat(b.change) : undefined,
    customer_id: b.customer_id ?? undefined,
    cashier_name: b.cashier_name,
    status: b.status,
  };
}

function toLocalCustomer(b: BCustomer): Customer {
  return {
    id: b.id,
    name: b.name,
    phone: b.phone ?? '',
    email: b.email ?? '',
    created_at: b.updated_at,
    rfc: b.rfc ?? undefined,
    razon_social: b.razon_social ?? undefined,
    rev: b.rev,
    deleted_at: b.deleted_at,
  };
}

// ---------------------------------------------------------------- Pull (feed de cambios)

function applyChange(change: BChangeLogItem): void {
  switch (change.entity) {
    case 'product': {
      const data = change.data as unknown as BProduct | null;
      if (!data) return;
      if (change.op === 'delete') {
        productService.upsertRemote({ id: change.entity_id, deleted_at: new Date().toISOString() } as Omit<Product, 'stock'>);
        return;
      }
      productService.upsertRemote(toLocalProduct(data));
      break;
    }
    case 'stock': {
      const data = change.data as unknown as BStock | null;
      if (!data) return;
      productService.applyRemoteStock(
        data.product_id,
        data.stock,
        data.price_override != null ? parseFloat(data.price_override) : null
      );
      break;
    }
    case 'movement': {
      const data = change.data as unknown as BMovement | null;
      if (!data) return;
      const local = toLocalMovement(data);
      // Rellenar snapshot de nombre/código desde el catálogo local
      const product = productService.getById(data.product_id);
      if (product) {
        local.product_name = product.name;
        local.product_barcode = product.barcode;
      }
      movementService.upsertRemote(local);
      break;
    }
    case 'sale': {
      const data = change.data as unknown as BSale | null;
      if (!data) return;
      saleService.upsertRemote(toLocalSale(data));
      break;
    }
    case 'customer': {
      const data = change.data as unknown as BCustomer | null;
      if (!data) return;
      customerService.upsertRemote(toLocalCustomer(data));
      break;
    }
    default:
      // purchase / supplier / lot: no se aplican localmente en el MVP del POS
      break;
  }
}

async function pullChanges(storeId: string): Promise<void> {
  let cursor = getSyncCursor();
  for (;;) {
    const res = await apiRequest<{
      cursor: number;
      has_more: boolean;
      changes: BChangeLogItem[];
    }>(`${API_PREFIX}/sync/changes?store_id=${encodeURIComponent(storeId)}&after_cursor=${cursor}&limit=200`);
    for (const change of res.changes) {
      applyChange(change);
    }
    cursor = res.cursor;
    setSyncCursor(cursor);
    if (!res.has_more || res.changes.length === 0) break;
  }
  // NOTA: la reconciliación del catálogo ya NO se ejecuta en cada pull (evitaba
  // spam de 403 si el token no tiene rol manager). Se ejecuta una vez al
  // arrancar tras autenticarse y con el botón "Sincronizar ahora".
}

/**
 * Reconciliación del catálogo:
 *  1) SIEMPRE: aplica al almacén local el catálogo completo del servidor
 *     (productos + stock de la tienda). Así el POS recibe también los productos
 *     importados (WooCommerce/seed) que NO generan entradas en el feed de cambios.
 *  2) Una vez (flag): sube al servidor los productos locales que no existen y
 *     oculta los duplicados por barcode.
 */
export async function reconcileLocalCatalog(): Promise<number> {
  const storeId = getStoreId();
  if (!storeId) return 0;
  const done = loadData<boolean>(CATALOG_RECONCILED_KEY, false);

  // 1) Bootstrap del catálogo del servidor (con stock y precio de la tienda)
  const serverIds = new Set<string>();
  const serverByBarcode = new Map<string, string>();
  let cursor: string | null | undefined;
  do {
    const page = await apiRequest<{
      items: (BProduct & { stock?: BStock | null })[];
      next_cursor: string | null;
    }>(
      `${API_PREFIX}/products?store_id=${encodeURIComponent(storeId)}&limit=500${
        cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
      }`
    );
    for (const item of page.items ?? []) {
      serverIds.add(item.id);
      if (item.barcode) serverByBarcode.set(item.barcode, item.id);
      productService.upsertRemote(toLocalProduct(item), item.stock?.stock ?? undefined);
      if (item.stock?.price_override != null) {
        productService.applyRemoteStock(
          item.id,
          item.stock.stock,
          parseFloat(item.stock.price_override)
        );
      }
    }
    cursor = page.next_cursor;
  } while (cursor);

  // 2) Subida de productos locales ausentes (una sola vez)
  if (done) return 0;

  let pushed = 0;
  let failed = 0;
  for (const p of productService.getProducts()) {
    if (p.deleted_at || serverIds.has(p.id)) continue;

    // Mismo barcode que un producto del servidor → el local es duplicado:
    // se oculta (el del servidor es el canónico y ya está en el catálogo local).
    const serverIdByBarcode = p.barcode ? serverByBarcode.get(p.barcode) : undefined;
    if (serverIdByBarcode) {
      productService.hideProduct(p.id);
      continue;
    }

    try {
      await remoteCreateProduct({
        client_op_id: p.id,
        id: p.id,
        store_id: storeId,
        name: p.name,
        description: p.description,
        price: p.price,
        barcode: p.barcode,
        sku: p.sku,
        category: p.category,
        requires_prescription: p.requires_prescription,
        controlled: p.controlled,
        expiration_date: p.expiration_date,
        lot_number: p.lot_number,
        initial_stock: p.stock,
      });
      pushed += 1;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        // Sin permisos (se necesita rol manager/admin para crear en el catálogo)
        // o sesión inválida: detener el intento en este ciclo.
        console.warn(
          `[sync] No se pudo subir el producto "${p.name}" (${err.status}): ${err.message}. ` +
            'Se necesita un usuario admin/manager para crear productos en el catálogo central.'
        );
        return pushed;
      }
      // p. ej. 422 por barcode duplicado: se reintenta en el siguiente arranque
      failed += 1;
    }
  }
  // Solo se marca como reconciliado si todo se resolvió; si algo falló, se reintenta
  if (failed === 0) saveData(CATALOG_RECONCILED_KEY, true);
  return pushed;
}

// ---------------------------------------------------------------- Push (outbox)

async function pushOperation(op: { op: string; payload: unknown }): Promise<{ ok: boolean; error?: string }> {
  const storeId = getStoreId();
  if (!storeId) throw new OfflineError('No autenticado: falta store_id');
  const res = await apiRequest<{ results: BPushResult[] }>(`${API_PREFIX}/sync/push`, {
    method: 'POST',
    body: { store_id: storeId, operations: [op] },
  });
  const result = res.results?.[0];
  if (!result) return { ok: false, error: 'Sin respuesta del servidor' };
  if (!result.ok) {
    return { ok: false, error: result.error?.message ?? 'Error del servidor' };
  }
  // Aplicar el registro autoritativo devuelto
  if (result.data) {
    applyChange({ id: 0, entity: (result.entity ?? 'movement') as BChangeLogItem['entity'], entity_id: result.id ?? '', op: 'upsert', rev: result.rev ?? 0, data: result.data as Record<string, unknown>, created_at: new Date().toISOString() });
  }
  return { ok: true };
}

export const remoteSyncHandlers: SyncHandlers = {
  pushOperation: async (op) =>
    pushOperation({ op: op.op, payload: op.payload }),
  pullChanges: async () => {
    const storeId = getStoreId();
    if (!storeId) return;
    await pullChanges(storeId);
  },
};

// ---------------------------------------------------------------- Endpoints write-through

export async function remoteCreateProduct(payload: Record<string, unknown>) {
  return apiRequest<{ product: BProduct; stock: BStock; movement: BMovement; idempotent?: boolean }>(
    `${API_PREFIX}/products`,
    { method: 'POST', body: payload }
  );
}

export async function remoteUpdateProduct(id: string, payload: Record<string, unknown>) {
  return apiRequest<{ product: BProduct }>(`${API_PREFIX}/products/${id}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function remoteDeleteProduct(id: string, clientOpId: string) {
  return apiRequest<{ product: BProduct }>(`${API_PREFIX}/products/${id}`, {
    method: 'DELETE',
    body: { client_op_id: clientOpId },
  });
}

export async function remoteCreateMovement(payload: Record<string, unknown>) {
  return apiRequest<{ movement: BMovement; stock: BStock; idempotent?: boolean }>(
    `${API_PREFIX}/movements`,
    { method: 'POST', body: payload }
  );
}

export async function remoteCreateSale(payload: Record<string, unknown>) {
  return apiRequest<{ sale: BSale; movements: BMovement[]; stocks: BStock[]; idempotent?: boolean }>(
    `${API_PREFIX}/sales`,
    { method: 'POST', body: payload }
  );
}

export async function remoteVoidSale(id: string, payload: Record<string, unknown>) {
  return apiRequest<{ sale: BSale; movements: BMovement[]; stocks: BStock[]; already_voided?: boolean }>(
    `${API_PREFIX}/sales/${id}/void`,
    { method: 'POST', body: payload }
  );
}

export async function remoteCreateCustomer(payload: Record<string, unknown>) {
  return apiRequest<{ customer: BCustomer }>(`${API_PREFIX}/customers`, {
    method: 'POST',
    body: payload,
  });
}

export async function remoteUpdateCustomer(id: string, payload: Record<string, unknown>) {
  return apiRequest<{ customer: BCustomer }>(`${API_PREFIX}/customers/${id}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function remoteDeleteCustomer(id: string, storeId: string) {
  return apiRequest<{ customer: BCustomer }>(`${API_PREFIX}/customers/${id}`, {
    method: 'DELETE',
    body: { store_id: storeId },
  });
}

export { ApiError, OfflineError };

// ---------------------------------------------------------------- Write-through
// Patrón: intentar el servidor central primero (write-through); si no hay red,
// aplicar localmente y encolar la operación en el outbox para sincronizar después.

function applyCreatedProduct(res: {
  product: BProduct;
  stock: BStock;
  movement: BMovement;
}): Product {
  const stock = res.stock ? res.stock.stock : (productService.getById(res.product.id)?.stock ?? 0);
  productService.upsertRemote(toLocalProduct(res.product), stock);
  if (res.movement) movementService.upsertRemote(toLocalMovement(res.movement));
  return productService.getById(res.product.id) ?? (toLocalProduct(res.product) as Product);
}

function applyMovementResponse(res: { movement: BMovement; stock: BStock }): void {
  const local = toLocalMovement(res.movement);
  const product = productService.getById(res.movement.product_id);
  if (product) {
    local.product_name = product.name;
    local.product_barcode = product.barcode;
  }
  movementService.upsertRemote(local);
  if (res.stock) {
    productService.applyRemoteStock(
      res.stock.product_id,
      res.stock.stock,
      res.stock.price_override != null ? parseFloat(res.stock.price_override) : null
    );
  }
}

function applySaleResponse(res: {
  sale: BSale;
  movements: BMovement[];
  stocks: BStock[];
}): Sale {
  const localSale = toLocalSale(res.sale);
  saleService.upsertRemote(localSale);
  for (const m of res.movements ?? []) movementService.upsertRemote(toLocalMovement(m));
  for (const s of res.stocks ?? []) {
    productService.applyRemoteStock(
      s.product_id,
      s.stock,
      s.price_override != null ? parseFloat(s.price_override) : null
    );
  }
  return localSale;
}

export async function writeCreateProduct(
  data: Omit<Product, 'id'>,
  opts?: { user?: string }
): Promise<Product> {
  const storeId = getStoreId();
  const id = uuid();
  const payload = {
    client_op_id: id,
    id,
    store_id: storeId,
    name: data.name,
    description: data.description,
    price: data.price,
    barcode: data.barcode,
    sku: data.sku,
    category: data.category,
    requires_prescription: data.requires_prescription,
    controlled: data.controlled,
    expiration_date: data.expiration_date,
    lot_number: data.lot_number,
    initial_stock: data.stock,
  };
  try {
    const res = await remoteCreateProduct(payload);
    return applyCreatedProduct(res);
  } catch (err) {
    if (err instanceof OfflineError) {
      const local = productService.createProduct(data, { user: opts?.user, id });
      outboxService.enqueue('create_product', payload);
      return local;
    }
    throw err;
  }
}

export async function writeUpdateProduct(
  id: string,
  data: Partial<Product>,
  opts?: { user?: string }
): Promise<Product | undefined> {
  const current = productService.getById(id);
  if (!current) return undefined;
  const storeId = getStoreId();
  const clientOpId = uuid();
  const catalogPayload = {
    client_op_id: clientOpId,
    base_rev: current.rev,
    name: data.name ?? current.name,
    price: data.price ?? current.price,
    barcode: data.barcode ?? current.barcode,
    sku: data.sku ?? current.sku,
    category: data.category ?? current.category,
    requires_prescription: data.requires_prescription ?? current.requires_prescription,
    controlled: data.controlled ?? current.controlled,
  };
  const stockDelta = data.stock !== undefined ? data.stock - current.stock : 0;
  const movementPayload = stockDelta !== 0
    ? {
        client_op_id: uuid(),
        store_id: storeId,
        product_id: id,
        type: 'adjustment',
        quantity: stockDelta,
        reason: 'Edición de stock desde Inventario',
        unit_price: data.price ?? current.price,
        user_name: opts?.user,
      }
    : null;

  try {
    const res = await remoteUpdateProduct(id, catalogPayload);
    productService.upsertRemote(toLocalProduct(res.product), current.stock);
    if (movementPayload) {
      const mov = await remoteCreateMovement(movementPayload);
      applyMovementResponse(mov);
    }
    return productService.getById(id);
  } catch (err) {
    if (err instanceof OfflineError) {
      productService.updateProduct(id, data, { user: opts?.user });
      outboxService.enqueue('upsert_product', catalogPayload);
      if (movementPayload) outboxService.enqueue('create_movement', movementPayload);
      return productService.getById(id);
    }
    throw err;
  }
}

export async function writeDeleteProduct(id: string): Promise<void> {
  const clientOpId = uuid();
  try {
    await remoteDeleteProduct(id, clientOpId);
    productService.deleteProduct(id);
  } catch (err) {
    if (err instanceof OfflineError) {
      // Nota: /sync/push no incluye op de borrado; se elimina en local y el
      // servidor conserva el producto (baja lógica al reconectar).
      productService.deleteProduct(id);
      return;
    }
    throw err;
  }
}

export async function writeAdjustStock(
  id: string,
  delta: number,
  opts?: StockAdjustOptions
): Promise<void> {
  const storeId = getStoreId();
  const clientOpId = uuid();
  const product = productService.getById(id);
  const payload = {
    client_op_id: clientOpId,
    store_id: storeId,
    product_id: id,
    type: opts?.type ?? 'adjustment',
    quantity: delta,
    unit_price: opts?.unitPrice,
    reference: opts?.reference,
    reason: opts?.reason,
    supplier: opts?.supplier,
    user_name: opts?.user,
  };
  try {
    const res = await remoteCreateMovement(payload);
    applyMovementResponse(res);
    void product;
  } catch (err) {
    if (err instanceof OfflineError) {
      productService.adjustStock(id, delta, opts);
      outboxService.enqueue('create_movement', payload);
      return;
    }
    throw err;
  }
}

export async function writeCreateSale(
  sale: Omit<Sale, 'id' | 'date'>,
  opts?: { user?: string }
): Promise<Sale> {
  const storeId = getStoreId();
  const id = uuid();
  const payload = {
    client_op_id: id,
    id,
    store_id: storeId,
    items: sale.items.map((i) => ({
      product_id: i.id,
      quantity: i.quantity,
      price: i.price,
    })),
    payment_method: sale.payment_method,
    received: sale.received,
    change: sale.change,
    customer_id: sale.customer_id ?? null,
    cashier_name: opts?.user ?? 'Admin',
  };
  try {
    const res = await remoteCreateSale(payload);
    return applySaleResponse(res);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      throw new ApiError(
        404,
        'Uno o más productos no existen en el servidor central. Sincroniza el catálogo (reconexión) e intenta de nuevo.'
      );
    }
    if (err instanceof OfflineError) {
      const local = saleService.createSale(sale, { user: opts?.user, id });
      outboxService.enqueue('create_sale', payload);
      return local;
    }
    throw err;
  }
}

export async function writeCreateCustomer(
  data: Omit<Customer, 'id' | 'created_at'>
): Promise<Customer> {
  const storeId = getStoreId();
  const id = uuid();
  const payload = {
    client_op_id: id,
    id,
    store_id: storeId,
    name: data.name,
    phone: data.phone,
    email: data.email,
  };
  try {
    const res = await remoteCreateCustomer(payload);
    const local = toLocalCustomer(res.customer);
    customerService.upsertRemote(local);
    return local;
  } catch (err) {
    if (err instanceof OfflineError) {
      const local = customerService.createCustomer(data, { id });
      outboxService.enqueue('create_customer', payload);
      return local;
    }
    throw err;
  }
}

export async function writeUpdateCustomer(
  id: string,
  data: Partial<Customer>
): Promise<Customer | undefined> {
  const storeId = getStoreId();
  try {
    const res = await remoteUpdateCustomer(id, {
      store_id: storeId,
      name: data.name,
      phone: data.phone,
      email: data.email,
    });
    customerService.upsertRemote(toLocalCustomer(res.customer));
    return customerService.getById(id);
  } catch (err) {
    if (err instanceof OfflineError) {
      customerService.updateCustomer(id, data);
      return customerService.getById(id);
    }
    throw err;
  }
}

export async function writeDeleteCustomer(id: string): Promise<void> {
  const storeId = getStoreId();
  try {
    await remoteDeleteCustomer(id, storeId ?? '');
    customerService.deleteCustomer(id);
  } catch (err) {
    if (err instanceof OfflineError) {
      customerService.deleteCustomer(id);
      return;
    }
    throw err;
  }
}
