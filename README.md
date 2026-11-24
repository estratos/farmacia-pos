# Farmacia POS 💊

Sistema de punto de venta (POS) para farmacias, construido con **React + TypeScript + Vite + Tailwind CSS + Electron**.

Funciona **offline-first**: los datos se guardan localmente (localStorage) y la app sigue
operando sin conexión; cuando hay red se **sincroniza con el backend central** (ventas,
movimientos, caja, catálogo y clientes).

## Características

- **Punto de Venta**: búsqueda por nombre, código de barras o **SKU** (soporta lector de código de barras: escanea y presiona Enter), carrito con IVA configurable, validación de stock, aviso de medicamentos que requieren receta.
- **Cobro**: efectivo (con cálculo de cambio), tarjeta o transferencia; **IVA por venta** (con la tasa de la tienda o **sin IVA** al 0%).
- **Recibo / Ticket**: vista previa e impresión en formato térmico de **80 mm** (ver [Impresión](#impresión-recibos-y-cortes-de-caja)).
- **Caja (cortes)**: apertura con fondo inicial (obligatoria para vender), retiros/ingresos con motivo, **corte de caja** con conteo de efectivo y diferencia (sobrante/faltante), notas, impresión del corte e historial con reimpresión; los movimientos de caja se sincronizan con el backend.
- **Inventario**: alta, edición, baja y búsqueda de productos; alertas de stock bajo; campos de lote y fecha de expiración; **imagen del producto** servida por el backend (URL `image_url`, sin copia local).
- **Ficha del producto**: click en una fila del Inventario o en una tarjeta/nombre del POS abre la ficha (imagen, datos, stock, movimientos recientes y acciones de editar/stock).
- **Movimientos de inventario (auditoría)**: cada cambio de stock queda registrado con tipo (stock inicial, entrada/compra, venta, devolución, ajuste, merma, devolución de compra), cantidad con signo, stock antes/después, referencia (ej. número de venta), motivo, proveedor, usuario y fecha. Pantalla dedicada con filtros (tipo, producto, rango de fechas, búsqueda) y resúmenes de entradas/salidas/neto. Registro *append-only*: no se edita ni elimina.
- **Clientes**: registro y administración de clientes.
- **Reportes**: ventas por día, productos más vendidos e historial de ventas.
- **Dashboard**: ventas del día, ingresos, productos populares, stock bajo y **gráfica de ventas de los últimos 7 días**.
- **Configuración**: farmacia (nombre, licencia), impuestos (IVA), recibo (pie), **conexión al servidor** (usuario/contraseña con auto-login) y tema claro/oscuro.
- **Interfaz profesional**: iconos SVG consistentes (Lucide), tipografía **Inter**, **modo claro/oscuro** con persistencia, **toasts** de confirmación y estados vacíos ilustrados.
- **Electron**: ventana con barra de título personalizada (minimizar/maximizar/cerrar).

## Stack

- React 19 + TypeScript (strict) + Vite 7
- Tailwind CSS 3 (modo oscuro con clase `dark`)
- React Router (HashRouter para compatibilidad con `file://`)
- Lucide React (iconos) + @fontsource/inter (tipografía)
- Electron 38 + Electron Forge

## Desarrollo

```bash
npm install

# Terminal 1: servidor de Vite (http://localhost:3000)
npm run dev

# Terminal 2: Electron en modo desarrollo (carga el servidor de Vite)
npm run start
```

### Conexión con el backend central

La app se conecta al backend central (ver `docs/central-api-design.md` y la OpenAPI en
`/api-docs/`). La URL se configura con `VITE_API_BASE_URL` (copia `.env.example` a `.env`;
por defecto `http://localhost:8080`).

**Implementado:**
- `src/services/apiClient.ts` — cliente HTTP (auth, timeout, detección de offline).
- `src/services/remoteApi.ts` — auth (login), endpoints write-through (products, movements,
  sales, void, customers) y sync (`sync/push` + `sync/changes` con cursor e idempotencia).
- `src/services/outbox.ts` — cola persistente de operaciones pendientes.
- `src/services/syncEngine.ts` — push/pull con backoff y eventos de conectividad.
- **Write-through**: al crear un movimiento o una venta, si hay conexión se envía al
  servidor central en ese momento y se aplica su respuesta autoritativa (stock calculado
  por el servidor, FEFO por lotes). Sin conexión, la operación se aplica en local y se
  encola en el outbox para sincronizar al restaurar la conexión.
- **Auth**: sección "Conexión" en Configuración (usuario/contraseña) con auto-login al
  arrancar; el indicador de sincronización del Header/TitleBar muestra el estado.

Los IDs son UUID generados por el cliente (migración automática de los datos locales
existentes en el primer arranque).

### Caja y cortes de caja

- **Apertura obligatoria para vender**: antes de cobrar, el POS pide abrir la caja con el
  fondo inicial en efectivo.
- **Retiros / ingresos** de efectivo con motivo, y **corte de caja** con conteo físico:
  el esperado se calcula como `fondo + ventas en efectivo + ingresos − retiros`, y la
  diferencia se clasifica en *sobrante*, *faltante* o *cuadrado*.
- Cada movimiento (apertura, cierre, retiro, ingreso) se **persiste localmente** y se
  **sincroniza** con el backend cuando está disponible (`/cash/open|close|withdrawal|ingress`,
  con `id` de cliente e idempotencia). Sin conexión queda en el outbox.
- Historial de cortes con reimpresión del ticket de corte.

### Impresión (recibos y cortes de caja)

La impresión se hace con el **diálogo del sistema** (`window.print()`) y una hoja de
estilos para **ticket térmico de 80 mm**:

- **Ticket de venta** (`src/components/sales/Receipt.tsx`, área `#receipt-area`): cabecera
  de la farmacia, folio, productos, subtotal, **IVA con la tasa efectiva de la venta**,
  total, forma de pago y cambio.
- **Corte de caja** (`src/components/cash/CashCutModal.tsx`, área `#cash-cut-area`):
  resumen por método, esperado vs. contado, diferencia, notas y **firmas** de cajero y
  encargado. Se imprime al guardar el corte o al reimprimirlo desde el historial.
- Reglas en `src/index.css` (`@media print`): solo se imprime el área del documento,
  ancho fijo `80mm` y tipografía monoespaciada.

**Requisitos**: una impresora instalada en Windows — térmica de 80 mm con controlador
genérico (recomendado) o cualquier impresora del sistema. No se envían comandos ESC/POS
crudos ni se accede directamente al puerto USB/serie.

> **Ajustes de impresora: no implementados.** No existe una sección de configuración de
> impresora: no se puede elegir impresora, ancho de papel (58/80 mm), número de copias ni
> hacer una impresión de prueba desde la app; cada impresión abre el diálogo del sistema.
> **Roadmap**: sección *Impresora* en Configuración (impresora por defecto, ancho 58/80 mm,
> copias, impresión de prueba y, opcionalmente, impresión directa/silenciosa desde Electron
> con `webContents.print`).

## Verificación de tipos

```bash
npm run typecheck
```

## Build de la aplicación de Electron

### Requisitos previos

- **Node.js 18+** y **npm** (el primer `npm install` descarga los binarios de Electron).
- Windows: sin herramientas extra para este proyecto (no usa módulos nativos propios).
- Una vez descargados los binarios, la compilación es **sin conexión** (no requiere internet).

### 1) Instalar dependencias

```bash
npm install
```

> En desarrollo también se instalan `lucide-react` y `@fontsource/inter` (iconos y tipografía).

### 2) Verificación de tipos (opcional pero recomendada)

```bash
npm run typecheck
```

### 3) Compilar el frontend (React → `dist/`)

```bash
npm run build
```

### 4) Compilar el proceso de Electron (→ `dist-electron/`)

```bash
npm run electron:build
```

### 5) Empaquetar la app (carpeta ejecutable, sin instalador)

```bash
npm run package
```

Genera la aplicación empaquetada en `out/farmacia_pos-win32-x64/` (puedes ejecutar
`farmacia_pos.exe` directamente).

### 6) Generar el instalador de Windows

```bash
npm run make
```

Genera el **instalador Squirrel** en `out/make/squirrel.windows/x64/`:

- `farmacia_pos-<versión> Setup.exe` (p. ej. `farmacia_pos-1.2.0 Setup.exe`, según la
  versión de `package.json`) — instalador de Windows (doble clic para instalar).
- `RELEASES` — índice de versiones que usa Squirrel para actualizaciones.

> **Todo en uno:** `npm run dist` equivale a `npm run build && npm run electron:build && npm run make`.

### Probar el instalador

1. Doble clic en `farmacia_pos-1.2.0 Setup.exe`.
2. Se instala por usuario en `%LocalAppData%\farmacia_pos` y crea el acceso directo
   en el menú Inicio.
3. La app carga el build de React desde `resources/dist/index.html` (configurado con
   `extraResource` en Electron Forge).

> **Importante:** el empaquetado requiere que el build del frontend exista. Si ejecutas
> `make`/`package` sin haber hecho `npm run build`, la app abrirá la pantalla de error
> "Build de React No Encontrado". Usa siempre `npm run dist` (o los pasos 3–5 en orden).

### Salidas del build

| Comando | Salida |
|---|---|
| `npm run build` | `dist/` (frontend) |
| `npm run electron:build` | `dist-electron/` (main/preload) |
| `npm run package` | `out/farmacia_pos-win32-x64/` (app ejecutable) |
| `npm run make` | `out/make/squirrel.windows/x64/` (Setup.exe + RELEASES) |

### Notas

- El instalador usa el **icono por defecto de Electron**; para un icono propio agrega
  `assets/icon.ico` y el campo `"icon"` en `config.forge.packagerConfig` de `package.json`.
- En macOS/Linux, `npm run make` genera `.zip` (maker-zip); el instalador Squirrel es
  específico de Windows.
- La app se puede ejecutar sin empaquetar durante el desarrollo con dos terminales:
  `npm run dev` (Vite en :3000) y `npm run start` (Electron en modo desarrollo).

## Estructura del proyecto

```
src/
├── components/
│   ├── cash/          # OpenCashModal, CashCutModal (corte 80mm), CashStatusPill
│   ├── layout/        # Sidebar, Header, Layout
│   ├── products/      # ProductSearch, ProductThumb, ProductDetailModal (ficha)
│   ├── sales/         # Cart, CheckoutModal (IVA por venta), Receipt (ticket 80mm)
│   └── ui/            # TitleBar, Modal, Toast, SyncIndicator
├── contexts/          # AppContext (estado del carrito)
├── electron/          # main.ts y preload.ts (proceso de Electron)
├── pages/             # Dashboard, PointOfSale, Inventory, Movements, Customers, Cash, Reports, Settings
├── services/          # storage, productService, saleService, customerService, movementService,
│                      # settingsService, cashService, apiClient, remoteApi (write-through/sync),
│                      # outbox (cola offline), syncEngine
└── types/             # Tipos compartidos (incl. backend.ts)
scripts/
└── flow-validation.mjs  # validación end-to-end contra el backend (34 checks)
docs/
├── central-api-design.md  # diseño de la API central
└── cortes-de-caja.md      # diseño de cortes de caja
```

## Datos

Todos los datos (productos, ventas, clientes, configuración, movimientos de inventario) se persisten en `localStorage` bajo el prefijo `farmacia_pos_`. La primera vez se cargan productos de ejemplo y se registra su stock como movimientos `initial`. Para restablecer los datos, borra el almacenamiento del sitio o usa las herramientas de desarrollador.

## Arquitectura de datos y sincronización futura

La capa de servicios (`src/services/`) aísla toda la persistencia en `storage.ts`. Para centralizar en un backend:

1. Reemplaza la implementación de `loadData`/`saveData` (o de cada servicio) por llamadas HTTP a la API, **manteniendo las mismas interfaces** — las páginas no necesitan cambios.
2. Los registros ya tienen el esquema pensado para sincronizar: **IDs estables**, timestamps ISO 8601 y referencias (`product_id`, `reference` como el número de venta).
3. Los movimientos de inventario son *append-only* (traza de auditoría) y referencian al producto por ID con snapshot de nombre/código, de modo que el historial sobrevive a cambios o bajas de producto.
4. Tipos de movimiento estables (en inglés): `initial`, `purchase`, `sale`, `return`, `adjustment`, `shrinkage` — la UI los muestra en español.

## Licencia

MIT — ver `licence.txt`.
