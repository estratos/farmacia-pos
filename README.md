# Farmacia POS 💊

Sistema de punto de venta (POS) para farmacias, construido con **React + TypeScript + Vite + Tailwind CSS + Electron**.

Los datos se guardan **localmente** en el equipo (localStorage), sin necesidad de servidor. La capa de servicios está diseñada para poder migrarse a un backend real en el futuro.

## Características

- **Punto de Venta**: búsqueda por nombre o código de barras (soporta lector de código de barras: escanea y presiona Enter), carrito con IVA configurable, validación de stock, aviso de medicamentos que requieren receta.
- **Cobro**: efectivo (con cálculo de cambio), tarjeta o transferencia.
- **Recibo / Ticket**: vista previa en formato térmico de 80mm e impresión (impresora del sistema o térmica con controlador genérico).
- **Inventario**: alta, edición, baja y búsqueda de productos; alertas de stock bajo; campos de lote y fecha de expiración.
- **Movimientos de inventario (auditoría)**: cada cambio de stock queda registrado con tipo (stock inicial, entrada/compra, venta, devolución, ajuste, merma), cantidad con signo, stock antes/después, referencia (ej. número de venta), motivo, proveedor, usuario y fecha. Pantalla dedicada con filtros (tipo, producto, rango de fechas, búsqueda) y resúmenes de entradas/salidas/neto. Registro *append-only*: no se edita ni elimina.
- **Clientes**: registro y administración de clientes.
- **Reportes**: ventas por día, productos más vendidos e historial de ventas.
- **Dashboard**: ventas del día, ingresos, productos populares, stock bajo y **gráfica de ventas de los últimos 7 días**.
- **Configuración**: nombre de la farmacia, licencia, % de IVA y pie de recibo.
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

## Verificación de tipos

```bash
npm run typecheck
```

## Build y empaquetado

```bash
# Compilar el frontend (React) a dist/
npm run build

# Compilar el proceso de Electron a dist-electron/
npm run electron:build

# Empaquetar la app (sin instalador)
npm run package

# Generar instaladores (Windows: Squirrel .exe; mac/linux: .zip)
npm run dist
```

> **Importante:** `npm run dist` primero compila el frontend y luego empaqueta. Electron carga el build de React desde `resources/dist/index.html` (configurado con `extraResource` en Electron Forge).

## Estructura del proyecto

```
src/
├── components/
│   ├── layout/        # Sidebar, Header, Layout
│   ├── products/      # ProductSearch
│   ├── sales/         # Cart, CheckoutModal, Receipt (ticket 80mm)
│   └── ui/            # TitleBar, Modal
├── contexts/          # AppContext (estado del carrito)
├── electron/          # main.ts y preload.ts (proceso de Electron)
├── pages/             # Dashboard, PointOfSale, Inventory, Customers, Reports, Settings
├── services/          # storage (localStorage), productService, saleService, customerService, settingsService
└── types/             # Tipos compartidos
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
