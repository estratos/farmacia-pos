import { loadData, saveData, uuid } from './storage';
import { movementService } from './movementService';
import type { MovementType, Product } from '../types';

const KEY = 'products';

const seedProducts: Product[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Paracetamol 500mg',
    description: 'Analgésico y antipirético',
    price: 25.5,
    stock: 45,
    barcode: '750123456789',
    category: 'Analgésico',
    requires_prescription: false,
    controlled: false,
    expiration_date: '2026-12-31',
    lot_number: 'LOT-001',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Amoxicilina 250mg',
    description: 'Antibiótico de amplio espectro',
    price: 89.0,
    stock: 23,
    barcode: '750123456790',
    category: 'Antibiótico',
    requires_prescription: true,
    controlled: false,
    expiration_date: '2026-06-30',
    lot_number: 'LOT-002',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Omeprazol 20mg',
    description: 'Inhibidor de bomba de protones',
    price: 45.0,
    stock: 67,
    barcode: '750123456791',
    category: 'Gastrointestinal',
    requires_prescription: false,
    controlled: false,
    expiration_date: '2027-03-15',
    lot_number: 'LOT-003',
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    name: 'Aspirina 500mg',
    description: 'Antiagregante plaquetario',
    price: 35.0,
    stock: 89,
    barcode: '750123456792',
    category: 'Analgésico',
    requires_prescription: false,
    controlled: false,
    expiration_date: '2026-09-30',
    lot_number: 'LOT-004',
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    name: 'Losartán 50mg',
    description: 'Antihipertensivo',
    price: 120.0,
    stock: 12,
    barcode: '750123456793',
    category: 'Cardiovascular',
    requires_prescription: true,
    controlled: false,
    expiration_date: '2026-11-30',
    lot_number: 'LOT-005',
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    name: 'Clonazepam 2mg',
    description: 'Ansiolítico (controlado)',
    price: 95.0,
    stock: 30,
    barcode: '750123456794',
    category: 'Controlado',
    requires_prescription: true,
    controlled: true,
    expiration_date: '2026-08-31',
    lot_number: 'LOT-006',
  },
];

function read(): Product[] {
  const products = loadData<Product[]>(KEY, seedProducts);
  // Migración única: registrar el stock actual como movimientos 'initial'
  movementService.ensureInitialMovements(products);
  return products;
}

function write(products: Product[]): void {
  saveData(KEY, products);
}

export interface StockAdjustOptions {
  type?: MovementType;
  reason?: string;
  reference?: string;
  unitPrice?: number;
  supplier?: string;
  user?: string;
  notes?: string;
}

export const productService = {
  getProducts(): Product[] {
    return read().filter((p) => !p.deleted_at);
  },

  searchProducts(query: string): Product[] {
    const q = query.trim().toLowerCase();
    if (!q) return read().filter((p) => !p.deleted_at);
    return read().filter(
      (p) =>
        !p.deleted_at &&
        (p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q))
    );
  },

  getProductByBarcode(barcode: string): Product | undefined {
    return read().find((p) => p.barcode === barcode.trim());
  },

  getById(id: string): Product | undefined {
    return read().find((p) => p.id === id);
  },

  createProduct(
    data: Omit<Product, 'id'>,
    opts?: { user?: string; id?: string }
  ): Product {
    const products = read();
    const product: Product = { ...data, id: opts?.id ?? uuid() };
    write([...products, product]);
    if (product.stock > 0) {
      movementService.record({
        product_id: product.id,
        product_name: product.name,
        product_barcode: product.barcode,
        type: 'initial',
        quantity: product.stock,
        stock_before: 0,
        stock_after: product.stock,
        unit_price: product.price,
        reason: 'Alta de producto con stock inicial',
        user: opts?.user,
      });
    }
    return product;
  },

  updateProduct(
    id: string,
    data: Partial<Product>,
    opts?: { user?: string }
  ): Product | undefined {
    const products = read();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const previous = products[idx];
    const updated = { ...previous, ...data, id };
    products[idx] = updated;
    write(products);

    // Si cambió el stock por edición, registrar ajuste
    if (data.stock !== undefined && data.stock !== previous.stock) {
      const delta = data.stock - previous.stock;
      movementService.record({
        product_id: id,
        product_name: updated.name,
        product_barcode: updated.barcode,
        type: 'adjustment',
        quantity: delta,
        stock_before: previous.stock,
        stock_after: updated.stock,
        unit_price: updated.price,
        reason: 'Edición de stock desde Inventario',
        user: opts?.user,
      });
    }
    return updated;
  },

  deleteProduct(id: string): void {
    write(read().filter((p) => p.id !== id));
  },

  /**
   * Ajusta el stock y registra el movimiento correspondiente.
   * delta con signo (+ entrada, - salida). type por defecto: 'adjustment'.
   */
  adjustStock(id: string, delta: number, opts?: StockAdjustOptions): void {
    const products = read();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const before = products[idx].stock;
    const after = Math.max(0, before + delta);
    products[idx] = { ...products[idx], stock: after };
    write(products);

    movementService.record({
      product_id: id,
      product_name: products[idx].name,
      product_barcode: products[idx].barcode,
      type: opts?.type ?? 'adjustment',
      quantity: after - before,
      stock_before: before,
      stock_after: after,
      unit_price: opts?.unitPrice ?? products[idx].price,
      reference: opts?.reference,
      reason: opts?.reason,
      supplier: opts?.supplier,
      user: opts?.user,
      notes: opts?.notes,
    });
  },

  getLowStock(threshold = 10): Product[] {
    return read().filter((p) => p.stock <= threshold);
  },

  /**
   * Aplica un producto del servidor (catálogo). Conserva el stock local si el
   * cambio no trae stock (el stock llega en los cambios 'stock' del feed).
   */
  upsertRemote(product: Omit<Product, 'stock'>, stock?: number): void {
    const products = read();
    const idx = products.findIndex((p) => p.id === product.id);
    if (idx === -1) {
      products.push({ ...product, stock: stock ?? 0 });
    } else {
      products[idx] = { ...products[idx], ...product, stock: stock ?? products[idx].stock };
    }
    write(products);
  },

  /** Aplica el stock (y precio propio) de la tienda devuelto por el servidor. */
  applyRemoteStock(productId: string, stock: number, priceOverride?: number | null): void {
    const products = read();
    const idx = products.findIndex((p) => p.id === productId);
    if (idx === -1) return;
    products[idx] = { ...products[idx], stock, price_override: priceOverride ?? null };
    write(products);
  },

  /** Oculta localmente un producto (tombstone local) conservando su historial. */
  hideProduct(id: string): void {
    const products = read();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return;
    products[idx] = { ...products[idx], deleted_at: new Date().toISOString() };
    write(products);
  },
};
