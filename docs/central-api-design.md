# API Central — Inventarios y Ventas Multi-Tienda (diseño)

> Documento de diseño del sistema centralizado para Farmacia POS.
> Objetivos: **multi-tienda**, **offline-first** (la tienda sigue operando sin conexión),
> **sincronización automática al restaurar la conexión** y **write-through** (los movimientos
> de inventario se crean en el servidor central en el momento en que ocurren, cuando hay
> conexión).
>
> **Stack backend: Symfony 7.4 (PHP)** — se integra con los módulos de **facturación** y
> **catálogos** ya construidos.
>
> **Decisiones confirmadas:**
> - Catálogo de productos **compartido** (global) con **stock por tienda**.
> - Anulación de ventas (`void`) **incluida en el MVP**.
> - Secuencia de venta `VENTA-{n}` por tienda.
> - **Base de datos**: **SQLite en desarrollo local** (sin credenciales ni servidor) y
>   **MariaDB en producción y staging**. El esquema Doctrine es portable: en despliegue solo
>   cambia `DATABASE_URL` y se ejecuta la migración. **No se reutilizan credenciales de otros
>   proyectos.**
> - **Workspace del backend**: `C:\Users\julio\local-repos\farmacia-central` (repositorio
>   separado del frontend).

---

## 1. Principios de diseño

1. **Offline-first**: la tienda (POS) es la unidad de operación. Sin conexión, todo sigue
   funcionando con el almacén local; nada se bloquea.
2. **Write-through**: al crear un movimiento de inventario (o una venta), si hay conexión,
   la operación se envía **inmediatamente** al servidor central y se aplica la respuesta
   autoritativa (stock calculado por el servidor). Sin conexión, se aplica localmente y se
   encola para sincronizar.
3. **El movimiento es la fuente de verdad del stock**: `store_stock.stock` es una caché
   mantenida por el servidor en la misma transacción que el movimiento (con job de
   reconciliación periódica).
4. **Catálogo compartido**: los productos son globales; cada tienda tiene su propio stock y
   puede tener un precio propio (override).
5. **IDs generados por el cliente (UUID)**: toda entidad creada en la tienda lleva un UUID
   generado localmente (productos, ventas, movimientos, clientes).
6. **Idempotencia obligatoria**: toda escritura incluye `client_op_id` (UUID); el servidor
   la aplica exactamente una vez y los reintentos devuelven el resultado original.
7. **Traza de auditoría append-only**: ventas y movimientos no se editan ni eliminan; las
   anulaciones se modelan como movimientos inversos (`return`).
8. **Baja lógica (tombstone)**: borrados con `deleted_at` propagados por el feed de cambios.

---

## 2. Arquitectura general

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│  Tienda A (POS Electron)    │        │  Servidor Central (Symfony 7.4) │
│                             │  HTTPS │                                  │
│  ┌───────────────────────┐  │◄──────►│  Auth (JWT / API key)           │
│  │ UI (React)            │  │        │  REST /api/v1                   │
│  │ Servicios (interfaz   │  │        │  • catálogo (módulo existente)  │
│  │   estable)            │  │        │  • store_stock por tienda       │
│  │ ┌───────────────────┐ │  │        │  • movimientos (write-through)  │
│  │ │ ApiClient (fetch) │ │  │        │  • ventas (transaccional)       │
│  │ │ Outbox (cola)     │ │  │        │  • facturación (módulo exist.)  │
│  │ │ SyncEngine        │ │  │        │  • sync push/changes            │
│  │ └───────────────────┘ │  │        └──────────────┬───────────────────┘
│  │ Almacén local         │  │                       │
│  │ (localStorage/IDB)    │  │              ┌────────▼────────┐
│  │ productos+stock,      │  │              │ PostgreSQL      │
│  │ ventas, movimientos,  │  │              │ + change_log    │
│  │ outbox, cursor        │  │              │ (feed de cambios)│
│  └───────────────────────┘  │              └─────────────────┘
└─────────────────────────────┘
```

**Flujo de una operación (write-through):**

1. La UI llama al servicio local (`movementService.record(...)`, `saleService.createSale(...)`, ...).
2. El servicio intenta `POST` al servidor central con `client_op_id`.
3. **Online**: el servidor valida (y para ventas verifica stock), aplica en una transacción
   (movimiento + stock; o venta + movimientos + stock) y responde con los registros
   autoritativos → el cliente los aplica localmente.
4. **Offline** (fallo de red): aplica localmente (optimista), agrega la operación al
   **outbox** y marca los registros como `pending_sync`.
5. El **SyncEngine** (eventos `online`/`offline`, temporizador, arranque) hace *push* del
   outbox y *pull* del feed de cambios cuando hay conexión.

---

## 3. Modelo de datos (servidor — PostgreSQL / Doctrine)

### stores
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| name | text | |
| address / phone | text | opcional |
| timezone | text | ej. `America/Mexico_City` |
| settings | jsonb | `tax_rate`, `receipt_footer`, `license_number` |
| created_at | timestamptz | |

### users (operadores)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| store_id | uuid FK | |
| name | text | |
| username | text UNIQUE | |
| password_hash | text | bcrypt/Argon2 |
| role | text | `admin` \| `manager` \| `cashier` |
| active | bool | |

### devices (POS registradas)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| store_id | uuid FK | |
| name | text | ej. "Caja 1" |
| api_key_hash | text | credencial de dispositivo |
| last_sync_at | timestamptz | |

### products — **catálogo compartido (global)**
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | **generado por el cliente** |
| name / description | text | |
| price | numeric(12,2) | precio base global (override por tienda en store_stock) |
| barcode | text UNIQUE | global |
| category | text | |
| requires_prescription / controlled | bool | |
| expiration_date / lot_number | date/text | opcional |
| rev | bigint | versión (server) |
| updated_at | timestamptz | |
| deleted_at | timestamptz NULL | tombstone |

> Reutilizar el módulo de **catálogos** existente: esta entidad debe mapearse a la entidad
> de producto ya construida (precios, categorías, códigos de barras), agregando los campos
> de sincronización (`rev`, `updated_at`, `deleted_at`).

### store_stock — **stock y precio por tienda**
| campo | tipo | notas |
|---|---|---|
| store_id | uuid FK | PK compuesta con product_id |
| product_id | uuid FK | |
| stock | int | caché mantenida por movimientos |
| price_override | numeric(12,2) NULL | precio propio de la tienda (NULL = usa el global) |
| rev | bigint | |
| updated_at | timestamptz | |
| deleted_at | timestamptz NULL | |

### inventory_movements (append-only)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | **generado por el cliente** |
| store_id | uuid FK | |
| product_id | uuid FK | producto del catálogo global |
| type | text | `initial` \| `purchase` \| `sale` \| `return` \| `adjustment` \| `shrinkage` |
| quantity | int | con signo (+ entrada, − salida) |
| stock_before / stock_after | int | stock **de la tienda** calculado por el servidor |
| unit_price | numeric(12,2) | costo o precio al momento |
| reference | text | ej. `VENTA-00012` o `sale_id` |
| reason / supplier | text | ajustes/mermas/compras |
| user_id / user_name | uuid/text | snapshot del operador |
| client_op_id | uuid UNIQUE | idempotencia |
| created_at | timestamptz | |

### sales (append-only, snapshot)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | **generado por el cliente** |
| store_id | uuid FK | |
| items | jsonb | snapshot `[{product_id,name,quantity,price,requires_prescription}]` (precio de la tienda) |
| subtotal / tax / total | numeric | |
| payment_method | text | `efectivo` \| `tarjeta` \| `transferencia` |
| received / change | numeric NULL | |
| customer_id | uuid NULL | |
| cashier_name | text | |
| client_op_id | uuid UNIQUE | idempotencia |
| status | text | `completed` \| `voided` |
| voided_at | timestamptz NULL | |
| created_at | timestamptz | |

> La venta queda lista para conectarse al módulo de **facturación** existente (ej. CFDI):
> `sale_id` como fuente de la factura, campos de cliente y montos ya presentes.

### customers (por tienda)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | **generado por el cliente** |
| store_id | uuid FK | |
| name / phone / email | text | |
| rev / updated_at / deleted_at | | |

### change_log (feed de sincronización — el cursor)
| campo | tipo | notas |
|---|---|---|
| id | bigserial PK | **cursor global** (monótono) |
| store_id | uuid NULL | NULL = cambio de catálogo global (para todas las tiendas) |
| entity | text | `product` (catálogo) \| `stock` \| `movement` \| `sale` \| `customer` |
| entity_id | uuid | |
| op | text | `upsert` \| `delete` |
| rev | bigint | |
| created_at | timestamptz | |

> El `change_log` es la base del pull incremental: cada escritura aceptada inserta una fila.
> Los cambios de **catálogo** (`store_id NULL`) van a todas las tiendas; los de
> **stock/movimientos/ventas/clientes** van solo a su tienda.

---

## 4. API REST — `/api/v1` (Symfony)

### 4.1 Autenticación y dispositivo
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | `{username,password}` → `{token, user, store, settings}` |
| POST | `/auth/refresh` | renueva el JWT |
| POST | `/devices/register` | registra la POS → `{device_id, api_key}` (una vez) |

- JWT (lexik/jwt-authentication-bundle) con claim `store_id` + `user_id`; scoping estricto
  por tienda en cada endpoint. Alternativa para POS: API key en `X-Device-Key`.

### 4.2 Catálogo de productos (global, write-through)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/products?cursor=&limit=` | catálogo paginado (bootstrap) |
| GET | `/products?store_id=&cursor=&limit=` | catálogo **enriquecido con stock y precio de la tienda** (vista POS) |
| GET | `/products/{id}` | detalle |
| POST | `/products` | crear producto (write-through); opcional `initial_stock` + `store_id` para crear el movimiento `initial` en la misma transacción |
| PUT | `/products/{id}` | actualizar catálogo (write-through, `base_rev`) |
| DELETE | `/products/{id}` | baja lógica (tombstone, global) |

**POST /products — request**
```json
{
  "client_op_id": "uuid",
  "name": "Paracetamol 500mg",
  "description": "Analgésico",
  "price": 25.50,
  "barcode": "750123456789",
  "category": "Analgésico",
  "requires_prescription": false,
  "controlled": false,
  "expiration_date": "2026-12-31",
  "lot_number": "LOT-001",
  "initial_stock": 45,
  "store_id": "uuid"
}
```
**response 201** — producto + `store_stock` + movimiento `initial` en una transacción:
```json
{
  "product": { "id": "uuid", "rev": 1 },
  "stock": { "store_id": "uuid", "stock": 45, "price_override": null },
  "movement": { "id": "uuid", "type": "initial", "quantity": 45, "stock_before": 0, "stock_after": 45 }
}
```

**PUT /products/{id}** — cambios de catálogo globales (nombre, precio base, categoría…).
Concurrencia por `base_rev`: si difiere → **409** → el cliente hace pull y reaplica.

**Precio por tienda**: `PUT /stock/{storeId}/{productId}` con `price_override` (no se edita
`stock` directamente; el stock solo cambia vía movimientos).

### 4.3 Movimientos de inventario (write-through — requisito central)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/movements` | **crea el movimiento en el servidor en ese momento** (transaccional con `store_stock`) |
| GET | `/movements?store_id=&product_id=&type=&from=&to=&cursor=` | historial |

**POST /movements — request**
```json
{
  "client_op_id": "uuid",
  "store_id": "uuid",
  "product_id": "uuid",
  "type": "purchase",
  "quantity": 10,
  "reason": "Entrada de mercancía",
  "supplier": "Distribuidora XYZ",
  "unit_price": 18.00,
  "user_id": "uuid"
}
```
**response 201** (autoritativa):
```json
{
  "movement": { "id": "uuid", "stock_before": 45, "stock_after": 55 },
  "stock": { "store_id": "uuid", "product_id": "uuid", "stock": 55, "rev": 7 }
}
```
Reglas del servidor:
- `quantity` con signo; tipos validados; `store_id` debe coincidir con el token.
- Transacción: `SELECT ... FOR UPDATE` sobre `store_stock` → `UPDATE stock` → `INSERT
  movement` (stock_before/after del lock) → `INSERT change_log`.
- Si el stock resultante fuera negativo → **422**.

### 4.4 Ventas (transaccional, genera movimientos)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/sales` | crea venta + movimientos `sale` + descuenta `store_stock` (transacción) |
| GET | `/sales?store_id=&from=&to=&cursor=` | historial |
| POST | `/sales/{id}/void` | **anula la venta** (movimientos `return` inversos) — MVP |

**POST /sales — request**
```json
{
  "client_op_id": "uuid",
  "store_id": "uuid",
  "items": [
    { "product_id": "uuid", "quantity": 2 },
    { "product_id": "uuid", "quantity": 1 }
  ],
  "payment_method": "efectivo",
  "received": 200.00,
  "change": 12.50,
  "customer_id": null,
  "cashier_name": "Admin"
}
```
**response 201**
```json
{
  "sale": { "id": "uuid", "status": "completed", "reference": "VENTA-00012" },
  "movements": [ { "product_id": "uuid", "quantity": -2, "stock_before": 45, "stock_after": 43 } ],
  "stocks": [ { "store_id": "uuid", "product_id": "uuid", "stock": 43, "rev": 8 } ]
}
```
Reglas:
- Valida stock de **todos** los ítems con `SELECT ... FOR UPDATE` antes de insertar.
- `VENTA-{n}` secuencial **por tienda**; se guarda en `movements.reference`.
- Idempotente por `client_op_id`.
- Opcional: disparar la factura en el módulo de **facturación** existente (post-commit).

**POST /sales/{id}/void** — marca la venta `voided` y crea movimientos `return` con
`reference` = `VENTA-{n}` (cantidad positiva, stock se restaura). Idempotente.

### 4.5 Clientes y configuración
| Método | Ruta |
|---|---|
| GET/POST | `/customers?store_id=` |
| PUT/DELETE | `/customers/{id}` |
| GET/PUT | `/store/settings` |

### 4.6 Sincronización (el puente offline)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/sync/push` | envía lote de operaciones pendientes del outbox |
| GET | `/sync/changes?store_id=&after_cursor=&limit=` | feed incremental (catálogo global + datos de la tienda) |
| GET | `/sync/status` | hora del servidor + cursor actual |

**POST /sync/push — request** (lote; cada op idempotente y en su propia transacción)
```json
{
  "operations": [
    { "op": "create_sale", "payload": { "client_op_id": "uuid", "...": "..." } },
    { "op": "create_movement", "payload": { "client_op_id": "uuid", "...": "..." } },
    { "op": "upsert_product", "payload": { "client_op_id": "uuid", "...": "..." } }
  ]
}
```
**response 200**
```json
{
  "results": [
    { "client_op_id": "uuid", "ok": true,  "entity": "sale", "id": "uuid", "rev": 3, "data": { "...": "registro autoritativo" } },
    { "client_op_id": "uuid", "ok": false, "error": { "code": "VALIDATION", "message": "..." } }
  ]
}
```
- El cliente aplica los `data` autoritativos (stock, revs) y quita la op del outbox.
- Ops con error permanente se marcan `failed` (visibles en UI) y no se reintentan solas.

**GET /sync/changes — response**
```json
{
  "cursor": 4821,
  "has_more": false,
  "changes": [
    { "entity": "product",  "entity_id": "uuid", "op": "upsert", "rev": 8, "data": { "name": "...", "price": 25.5 } },
    { "entity": "stock",    "entity_id": "uuid", "op": "upsert", "rev": 9, "data": { "stock": 55, "price_override": null } },
    { "entity": "movement", "entity_id": "uuid", "op": "upsert", "rev": 10, "data": { "...": "movimiento completo" } },
    { "entity": "sale",     "entity_id": "uuid", "op": "upsert", "rev": 11, "data": { "...": "venta completa" } },
    { "entity": "product",  "entity_id": "uuid", "op": "delete", "rev": 12, "data": { "deleted_at": "..." } }
  ]
}
```
- El cliente aplica (upsert sobreescribe; `delete` marca `deleted_at`), guarda `cursor` y
  repite mientras `has_more`.

---

## 5. Protocolo de sincronización (cliente)

### 5.1 Estado local persistido
- `farmacia_pos_outbox` — cola de operaciones pendientes (ordenada, persistente).
- `farmacia_pos_cursor` — último `after_cursor` procesado.
- `farmacia_pos_sync_state` — `{ status, pending_count, last_sync_at }`.

### 5.2 Ciclo de sincronización
```
1. ¿Hay conexión? (navigator.onLine + heartbeat GET /sync/status)
   NO → estado 'offline'; fin.
2. PUSH: enviar outbox por lotes (máx. N).
   - ok → aplicar data autoritativo, quitar de outbox.
   - error permanente → marcar failed.
   - error de red → reintentar (backoff), fin del ciclo.
3. PULL: GET /sync/changes?after_cursor=cursor
   - aplicar cambios (catálogo global + tienda), avanzar cursor, repetir si has_more.
4. Estado 'synced'; programar próximo ciclo (60 s) y suscribirse a 'online'.
```

### 5.3 Disparadores
- Arranque de la app (Electron / evento `online` del renderer).
- Evento `window 'online'` → sincronización inmediata.
- Después de cada write-through exitoso.
- Temporizador periódico + **backoff exponencial** con jitter (1 s → … → máx. 5 min).

### 5.4 Resolución de conflictos
| Entidad | Estrategia |
|---|---|
| Ventas, movimientos | **Append-only**: sin conflicto; idempotencia por `client_op_id` |
| Catálogo (products) | **Optimistic concurrency por `rev`**: `base_rev` → 409 → pull y reaplicar; fallback LWW por `updated_at` |
| store_stock | Solo cambia vía movimientos (servidor); `price_override` por `rev` |
| Borrados | Tombstone (`deleted_at`) con su propia rev |

### 5.5 Reconciliación de stock (servidor, job periódico)
`store_stock.stock = Σ movements` por (store, product); si difiere, corrige y emite al
change_log para que las tiendas reciban el estado corregido.

---

## 6. Cambios en el cliente (Farmacia POS actual)

1. **`src/services/apiClient.ts`** — wrapper fetch: base URL (`VITE_API_BASE_URL`), JWT/API
   key, detección de offline, timeout.
2. **`src/services/outbox.ts`** — cola persistente de operaciones pendientes.
3. **`src/services/syncEngine.ts`** — push/pull, cursor, eventos, backoff, reconciliación.
4. **Servicios** (productService, saleService, movementService, customerService,
   settingsService): **misma interfaz**; internamente escrituras write-through con fallback
   local+outbox, lecturas local-first + refresco por sync.
5. **IDs → UUID** y campos nuevos: `client_op_id`, `rev`, `updated_at`, `deleted_at`,
   `pending_sync` (migración de datos locales actuales).
6. **Vista local de producto** = catálogo global + `store_stock` de la tienda (se mantiene la
   interfaz actual; el sync separa ambas fuentes).
7. **UI**: indicador de sincronización en el Header
   (`Sincronizado` / `Sin conexión — N cambios pendientes` / `Sincronizando…`).

---

## 7. Stack backend (Symfony 7.4)

| Capa | Opción |
|---|---|
| Runtime | PHP 8.3+ / Symfony 7.4 |
| ORM | Doctrine ORM + Migrations |
| BD | **SQLite en desarrollo local** (`pdo_sqlite`); **MariaDB en producción/staging** (`pdo_mysql`). Tipos Doctrine portables (uuid → string, json, bigint autoincrement); el cursor del change_log usa autoincrement nativo |
| Auth | lexik/jwt-authentication-bundle (JWT) + API key por dispositivo |
| Validación | Symfony Validator (constraints) |
| API | Controladores REST manuales o API Platform (opcional) |
| Idempotencia | Tabla `client_op_id` con índice único + registro de operaciones |
| Despliegue | Docker + Docker Compose (nginx + php-fpm) |
| Reuso | Módulos existentes de **facturación** y **catálogos** (mapear entidades, disparar factura post-venta) |

Estructura sugerida:
```
server/
├── config/
├── src/
│   ├── Controller/       # Api/* (products, stock, movements, sales, sync, auth, store)
│   ├── Entity/           # Store, User, Device, Product, StoreStock, InventoryMovement,
│   │                     #   Sale, Customer, ChangeLog, ClientOperation
│   ├── Repository/
│   ├── Service/          # SyncService, MovementService, SaleService, IdempotencyService
│   ├── Security/         # JWT, store-scope voters
│   └── EventSubscriber/  # change_log writer, facturación hook
└── migrations/
```

---

## 8. Plan de implementación

| Fase | Alcance | Criterio de aceptación |
|---|---|---|
| **1. MVP backend** | Entidades + auth + catálogo CRUD + `POST /movements` + `POST /sales` + `POST /sales/{id}/void` (transaccionales) + `sync/push` + `sync/changes` — **desarrollo con SQLite local** | Postman: crear producto (genera `initial`), movimiento, venta, anulación; curl de idempotencia; migración aplicable a MariaDB |
| **2. Cliente offline-first** | apiClient + outbox + syncEngine; servicios write-through con fallback; indicador de estado | Cortar red: vender → outbox; restaurar → se sincroniza y el servidor refleja venta, movimientos y stock |
| **3. Robustez** | tombstones completos, paginación, backoff, reconciliación de stock, pruebas | Escenarios de doble dispositivo y conflicto de edición (409 → reaplicar) |
| **4. Multi-tienda y facturación** | gestión de stores/usuarios, reportes centrales, integración con facturación (CFDI), dashboard de red | Dos tiendas operando sin pisarse; venta → factura emitida |

---

## 9. Notas de integración (módulos existentes)

- **Catálogos**: mapear la entidad `Product` a la ya existente; agregar `rev`,
  `updated_at`, `deleted_at` y exponer los endpoints de catálogo sobre el módulo actual.
- **Facturación**: al confirmar una venta (`status = completed`), el post-commit puede
  disparar la generación de factura/CFDI con los datos de la venta (cliente, items,
  montos). La anulación (`void`) debe reflejarse en el módulo de facturación
  (cancelación/nota de crédito).
- La API de sync (`push`/`changes`) es **independiente** de ambos módulos y puede
  implementarse sin tocarlos.
