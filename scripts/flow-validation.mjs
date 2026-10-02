// Validación end-to-end del flujo del POS contra el backend central.
// Usa exactamente los payloads de src/services/remoteApi.ts.
const base = 'http://localhost:8080/api/v1';
const T = 45000;
const uuid = () => crypto.randomUUID();

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    fail += 1;
    failures.push(name + (detail ? ' — ' + detail : ''));
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function j(path, opts = {}) {
  const res = await fetch(`${base}${path}`, { ...opts, signal: AbortSignal.timeout(T) });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

console.log('=== 1. Conectividad y autenticación ===');
const health = await j('/health');
check('GET /health (público)', health.status === 200, `status ${health.status}`);

const login = await j('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
});
check('POST /auth/login', login.status === 200 && !!login.body?.token, `store ${login.body?.store?.id}`);
const storeId = login.body.store.id;
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${login.body.token}` };

console.log('\n=== 2. Catálogo (productos con sku e image_url) ===');
const catalog = await j(`/products?store_id=${storeId}&limit=5`, { headers: H });
const item = catalog.body?.items?.[0];
check('GET /products', catalog.status === 200 && !!item, `${catalog.body?.items?.length} items`);
check('producto trae sku', item && 'sku' in item, item?.sku ?? 'sin sku');
check('producto trae image_url', item && 'image_url' in item, item?.image_url ? 'con imagen' : 'sin imagen');
check('producto trae stock de la tienda', item && !!item.stock, `stock ${item?.stock?.stock}`);

console.log('\n=== 3. Alta de producto (write-through) ===');
const pid = uuid();
const barcode = '9' + String(Date.now()).slice(-12);
const created = await j('/products', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    client_op_id: pid, id: pid, store_id: storeId,
    name: 'TEST-FLOW-' + pid.slice(0, 8), description: 'Validación de flujo',
    price: 100, barcode, sku: 'SKU-' + pid.slice(0, 6), category: 'Prueba',
    requires_prescription: false, controlled: false, initial_stock: 20,
  }),
});
check('POST /products (201)', created.status === 201, `status ${created.status}`);
check('stock inicial 20', created.body?.stock?.stock === 20, `stock ${created.body?.stock?.stock}`);
check('movimiento initial creado', created.body?.movement?.type === 'initial', created.body?.movement?.type);
check('id del cliente respetado', created.body?.product?.id === pid);

console.log('\n=== 4. Movimientos de inventario ===');
const mv = await j('/movements', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    client_op_id: uuid(), store_id: storeId, product_id: pid,
    type: 'purchase', quantity: 10, unit_price: 60, reason: 'Entrada de prueba', supplier: 'Proveedor Test', user_name: 'admin',
  }),
});
check('POST /movements purchase', mv.status === 201 && mv.body?.movement?.quantity === 10, `stock ${mv.body?.movement?.stock_before}→${mv.body?.movement?.stock_after}`);
const mvList = await j(`/movements?store_id=${storeId}&product_id=${pid}`, { headers: H });
check('GET /movements (historial)', mvList.status === 200 && mvList.body?.items?.length >= 2, `${mvList.body?.items?.length} movimientos`);

console.log('\n=== 5. Ventas con y sin IVA ===');
const saleNoIvaId = uuid();
const saleNoIva = await j('/sales', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    client_op_id: saleNoIvaId, id: saleNoIvaId, store_id: storeId,
    items: [{ product_id: pid, quantity: 2, price: 100 }],
    tax_rate: 0, payment_method: 'efectivo', received: 250, change: 50, cashier_name: 'admin',
  }),
});
check('POST /sales tax_rate 0 → sin IVA', saleNoIva.status === 201 && saleNoIva.body?.sale?.tax === '0.00', `tax ${saleNoIva.body?.sale?.tax} total ${saleNoIva.body?.sale?.total}`);
check('venta descuenta stock (30→28)', saleNoIva.body?.stocks?.[0]?.stock === 28, `stock ${saleNoIva.body?.stocks?.[0]?.stock}`);
check('venta genera movimiento sale', saleNoIva.body?.movements?.[0]?.type === 'sale');

const saleIva = await j('/sales', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    client_op_id: uuid(), id: uuid(), store_id: storeId,
    items: [{ product_id: pid, quantity: 1, price: 100 }],
    payment_method: 'tarjeta', cashier_name: 'admin',
  }),
});
check('POST /sales sin tax_rate → tasa de tienda', saleIva.status === 201 && parseFloat(saleIva.body?.sale?.tax) > 0, `tax ${saleIva.body?.sale?.tax}`);

console.log('\n=== 6. Idempotencia ===');
const dup = await j('/sales', {
  method: 'POST',
  headers: H,
  body: JSON.stringify({
    client_op_id: saleNoIvaId, id: saleNoIvaId, store_id: storeId,
    items: [{ product_id: pid, quantity: 2, price: 100 }],
    tax_rate: 0, payment_method: 'efectivo', cashier_name: 'admin',
  }),
});
check('venta duplicada no se aplica 2 veces', dup.status === 200 && dup.body?.idempotent === true, `idempotent ${dup.body?.idempotent}`);

console.log('\n=== 7. Anulación de venta (void) ===');
const voided = await j(`/sales/${saleNoIvaId}/void`, {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ store_id: storeId, client_op_id: uuid() }),
});
check('POST /sales/{id}/void', voided.status === 200 && voided.body?.sale?.status === 'voided', `stock ${voided.body?.stocks?.[0]?.stock}`);

console.log('\n=== 8. Caja: apertura, retiro, ingreso y corte (ids de cliente) ===');
const cajaSid = uuid();
const cajaMid = uuid();
const cajaIid = uuid();
const cajaCid = uuid();
const cajaName = 'TEST-FLOW-CAJA';
const cashOpen = await j('/cash/open', {
  method: 'POST', headers: H,
  body: JSON.stringify({ id: cajaSid, client_op_id: cajaSid, store_id: storeId, caja: cajaName, fondo: 500, cajero: 'admin' }),
});
check('POST /cash/open (id cliente)', cashOpen.status === 201 && cashOpen.body?.session?.id === cajaSid);
const wd = await j('/cash/withdrawal', {
  method: 'POST', headers: H,
  body: JSON.stringify({ id: cajaMid, client_op_id: cajaMid, store_id: storeId, session_id: cajaSid, monto: 100, motivo: 'Retiro a gerencia' }),
});
check('POST /cash/withdrawal', wd.status === 201 && wd.body?.movement?.id === cajaMid);
const ing = await j('/cash/ingress', {
  method: 'POST', headers: H,
  body: JSON.stringify({ id: cajaIid, client_op_id: cajaIid, store_id: storeId, session_id: cajaSid, monto: 50, motivo: 'Reposición' }),
});
check('POST /cash/ingress', ing.status === 201 && ing.body?.movement?.id === cajaIid);
const current = await j(`/cash/current?store_id=${storeId}&caja=${cajaName}`, { headers: H });
check('GET /cash/current', current.status === 200 && current.body?.session?.id === cajaSid);
const close = await j('/cash/close', {
  method: 'POST', headers: H,
  body: JSON.stringify({
    id: cajaCid, client_op_id: cajaCid, store_id: storeId, session_id: cajaSid,
    contado_por_metodo: { efectivo: 450, tarjeta: 0, transferencia: 0 },
    notas: 'Corte de validación', cajero: 'admin',
  }),
});
check('POST /cash/close (id cliente)', close.status === 201 && close.body?.cut?.id === cajaCid, `esperado 450 diff ${close.body?.cut?.difference?.total ?? close.body?.cut?.diferencia?.total}`);
const cuts = await j(`/cash/cuts?store_id=${storeId}&limit=5`, { headers: H });
check('GET /cash/cuts (historial)', cuts.status === 200 && (cuts.body?.items?.length ?? 0) > 0, `${cuts.body?.items?.length} cortes`);

console.log('\n=== 9. Clientes (CRUD) ===');
const cid = uuid();
const cust = await j('/customers', {
  method: 'POST', headers: H,
  body: JSON.stringify({ client_op_id: cid, id: cid, store_id: storeId, name: 'Cliente Validación', phone: '5512345678', email: 'test@example.com' }),
});
check('POST /customers', cust.status === 201 && cust.body?.customer?.id === cid);
const custUpd = await j(`/customers/${cid}`, {
  method: 'PUT', headers: H,
  body: JSON.stringify({ store_id: storeId, name: 'Cliente Validación 2', phone: '5599999999' }),
});
check('PUT /customers/{id}', custUpd.status === 200 && custUpd.body?.customer?.name === 'Cliente Validación 2');
const custDel = await j(`/customers/${cid}`, { method: 'DELETE', headers: H, body: JSON.stringify({ store_id: storeId }) });
check('DELETE /customers/{id}', custDel.status === 200);

console.log('\n=== 10. Sincronización (feed y push) ===');
const syncStatus = await j(`/sync/status?store_id=${storeId}`, { headers: H });
check('GET /sync/status (cursor)', syncStatus.status === 200 && typeof syncStatus.body?.cursor === 'number', `cursor ${syncStatus.body?.cursor}`);
const changes = await j(`/sync/changes?store_id=${storeId}&after_cursor=0&limit=20`, { headers: H });
check('GET /sync/changes (feed)', changes.status === 200 && Array.isArray(changes.body?.changes), `${changes.body?.changes?.length} cambios desde 0`);
const entities = new Set((changes.body?.changes ?? []).map((c) => c.entity));
check('feed incluye varias entidades', entities.size >= 2, [...entities].join(', '));

const pushSid = uuid();
const push = await j('/sync/push', {
  method: 'POST', headers: H,
  body: JSON.stringify({
    store_id: storeId,
    operations: [
      {
        op: 'create_product',
        payload: { client_op_id: pushSid, id: pushSid, store_id: storeId, name: 'TEST-PUSH-' + pushSid.slice(0, 6), price: 50, barcode: '8' + String(Date.now()).slice(-12), category: 'Prueba', initial_stock: 3 },
      },
    ],
  }),
});
check('POST /sync/push (lote)', push.status === 200 && push.body?.results?.[0]?.ok === true, JSON.stringify(push.body?.results?.[0]).slice(0, 90));

console.log('\n=== 11. Tienda y limpieza ===');
const store = await j('/store/settings', { headers: H });
check('GET /store/settings', store.status === 200 && !!store.body?.store, `tax_rate ${store.body?.store?.settings?.tax_rate}`);
const delProd = await j(`/products/${pid}`, { method: 'DELETE', headers: H, body: JSON.stringify({ client_op_id: uuid() }) });
check('DELETE /products/{id} (tombstone)', delProd.status === 200);
const delPush = await j(`/products/${pushSid}`, { method: 'DELETE', headers: H, body: JSON.stringify({ client_op_id: uuid() }) });
check('limpieza producto de sync/push', delPush.status === 200);

console.log(`\n=== RESULTADO: ${pass} PASS / ${fail} FAIL ===`);
if (failures.length) {
  console.log('Fallos:');
  failures.forEach((f) => console.log(' - ' + f));
}
