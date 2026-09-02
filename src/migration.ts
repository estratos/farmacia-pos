/**
 * Migración de datos locales: IDs numéricos → UUID (los ids del backend central
 * son UUID generados por el cliente). Se ejecuta UNA vez al arrancar la app,
 * antes del primer render, y remapea productos, ventas, movimientos y clientes
 * conservando las referencias cruzadas.
 */
import { loadData, saveData, uuid } from './services/storage';
import type { Customer, InventoryMovement, Product, Sale } from './types';

const PRODUCTS_KEY = 'products';
const SALES_KEY = 'sales';
const MOVEMENTS_KEY = 'movements';
const CUSTOMERS_KEY = 'customers';
const MIGRATION_KEY = 'migration_uuid_v2';

function hasNumericIds(items: { id: unknown }[]): boolean {
  return items.some((i) => typeof i.id === 'number');
}

export function migrateLocalData(): void {
  if (loadData<boolean>(MIGRATION_KEY, false)) return;

  const productMap = new Map<number, string>();
  const customerMap = new Map<number, string>();
  const mapFor = (map: Map<number, string>, n: number): string => {
    let id = map.get(n);
    if (!id) {
      id = uuid();
      map.set(n, id);
    }
    return id;
  };

  // Productos
  const products = loadData<Product[]>(PRODUCTS_KEY, []);
  if (hasNumericIds(products)) {
    const migrated: Product[] = products.map((p) => ({
      ...p,
      id: mapFor(productMap, p.id as unknown as number),
    }));
    saveData(PRODUCTS_KEY, migrated);
  }

  // Clientes
  const customers = loadData<Customer[]>(CUSTOMERS_KEY, []);
  if (hasNumericIds(customers)) {
    const migrated: Customer[] = customers.map((c) => ({
      ...c,
      id: mapFor(customerMap, c.id as unknown as number),
    }));
    saveData(CUSTOMERS_KEY, migrated);
  }

  // Ventas (items.product_id → mapa de productos; customer_id → mapa de clientes;
  // el id de la venta es nuevo — nada lo referencia por número)
  const sales = loadData<Sale[]>(SALES_KEY, []);
  if (hasNumericIds(sales)) {
    const migrated: Sale[] = sales.map((s) => ({
      ...s,
      id: uuid(),
      items: s.items.map((item) => ({
        ...item,
        id: mapFor(productMap, item.id as unknown as number),
      })),
      customer_id:
        s.customer_id !== undefined
          ? mapFor(customerMap, s.customer_id as unknown as number)
          : undefined,
    }));
    saveData(SALES_KEY, migrated);
  }

  // Movimientos (product_id → mapa de productos; el id del movimiento es nuevo)
  const movements = loadData<InventoryMovement[]>(MOVEMENTS_KEY, []);
  if (hasNumericIds(movements)) {
    const migrated: InventoryMovement[] = movements.map((m) => ({
      ...m,
      id: uuid(),
      product_id: mapFor(productMap, m.product_id as unknown as number),
    }));
    saveData(MOVEMENTS_KEY, migrated);
  }

  saveData(MIGRATION_KEY, true);
}
