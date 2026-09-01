# Farmacia POS 💊

Sistema de punto de venta (POS) para farmacias, construido con **React + TypeScript + Vite + Tailwind CSS + Electron**.

Los datos se guardan **localmente** en el equipo (localStorage), sin necesidad de servidor. La capa de servicios está diseñada para poder migrarse a un backend real en el futuro.

## Características

- **Punto de Venta**: búsqueda por nombre o código de barras (soporta lector de código de barras: escanea y presiona Enter), carrito con IVA configurable, validación de stock, aviso de medicamentos que requieren receta.
- **Cobro**: efectivo (con cálculo de cambio), tarjeta o transferencia.
- **Recibo / Ticket**: vista previa en formato térmico de 80mm e impresión (impresora del sistema o térmica con controlador genérico).
- **Inventario**: alta, edición, baja y búsqueda de productos; alertas de stock bajo; campos de lote y fecha de expiración.
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

Todos los datos (productos, ventas, clientes, configuración) se persisten en `localStorage` bajo el prefijo `farmacia_pos_`. La primera vez se cargan productos de ejemplo. Para restablecer los datos, borra el almacenamiento del sitio o usa las herramientas de desarrollador.

## Licencia

MIT — ver `licence.txt`.
