# Diseño: Cortes de caja (POS)

> Corte de caja = cierre del turno de una caja: se resumen las ventas por método de
> pago, el cajero cuenta el efectivo físico, el sistema calcula la diferencia
> (sobrante/faltante) y se registra el corte (traza de auditoría, imprimible).
> Alineado con la arquitectura del proyecto: **offline-first** (localStorage + outbox)
> con **write-through** al backend central (`docs/central-api-design.md`).

---

## 1. Conceptos

| Concepto | Descripción |
|---|---|
| **Sesión de caja (turno)** | Apertura de la caja en un dispositivo: registra fecha, cajero y **fondo inicial**. Se cierra con un corte. |
| **Métodos de pago** | `efectivo` (se cuenta físicamente en la caja), `tarjeta` y `transferencia` (electrónicos; no se cuentan, se verifican contra el sistema). |
| **Movimiento de caja** | Registro append-only que afecta el saldo esperado: apertura, venta (automático por método), retiro, ingreso, ajuste. |
| **Corte** | Cierre del turno: ventas por método, efectivo esperado vs. contado, diferencia (sobrante/faltante), notas, estado. |
| **Sobrante / Faltante** | `diferencia = contado − esperado`; positiva = sobrante, negativa = faltante. |

## 2. Flujo principal

```
Apertura (fondo inicial)
   │
   ▼
Ventas del turno (efectivo/tarjeta/transferencia)  ← se registran automáticamente
   │        (opcional: retiros / ingresos de caja)
   ▼
CORTE DE CAJA
   ├── Resumen por método (ventas, tickets, totales)
   ├── Efectivo esperado = fondo + ventas efectivo + ingresos − retiros
   ├── Conteo físico del efectivo (el cajero lo ingresa)
   ├── Diferencia (sobrante/faltante) calculada en vivo
   ├── Notas (opcional)
   └── Confirmar → se guarda (append-only), se cierra la sesión, se imprime el resumen
   ▼
Historial de cortes (consultable, reimprimible)
```

## 3. Reglas de cálculo

```
efectivo_esperado   = fondo_inicial + Σ(ventas efectivo)  + Σ(ingresos) − Σ(retiros)
tarjeta_esperado    = Σ(ventas tarjeta)
transferencia_esperado = Σ(ventas transferencia)

diferencia_efectivo = efectivo_contado − efectivo_esperado
diferencia_total    = (efectivo_contado − efectivo_esperado)
                    + (tarjeta_verificada − tarjeta_esperado)
                    + (transferencia_verificada − transferencia_esperado)
```

- Solo el **efectivo** se cuenta físicamente; tarjeta/transferencia se pueden marcar
  como "verificadas" (coinciden con el sistema) o ingresar un monto verificado.
- Un **corte cerrado no se edita** (auditoría); un error se corrige con un ajuste o
  abriendo un nuevo turno.
- Sin sesión abierta: se puede vender (la venta queda registrada) y el corte asume
  fondo 0 si no hubo apertura — o bien, **apertura obligatoria** para vender
  (decisión, ver §7).

## 4. UI (Punto de Venta)

### 4.1 Estado de caja
- **Indicador en el Header/TitleBar**: caja **abierta** (verde, con fondo y tiempo) /
  **cerrada** (gris) — visible en todo el POS.
- **Página "Caja"** (nueva, en el Sidebar bajo "Gestión"): estado actual, apertura,
  corte e historial.

### 4.2 Apertura
- Modal o vista: fecha/hora automáticas, **cajero** (usuario actual), **fondo inicial**
  (efectivo, opcional si no es obligatoria).
- Al abrir: se crea la sesión local (+ outbox si hay red) y el indicador pasa a
  "abierta".

### 4.3 Corte de caja (modal)
1. **Resumen**: ventas por método (nº de tickets y total), total general.
2. **Efectivo esperado** con desglose (fondo + ventas + ingresos − retiros).
3. **Conteo**: entrada del efectivo contado (por total o por denominación — decisión
   §7); verificación opcional de tarjeta/transferencia.
4. **Diferencia** en vivo (sobrante verde / faltante rojo) y total.
5. **Notas** (opcional).
6. Botones: **Guardar corte** (cierra sesión) y **Guardar e imprimir** (ticket 80mm).
   Aviso si hay ventas sin sincronizar (pendientes del outbox) — se incluyen igual
   en el cálculo local.

### 4.4 Historial de cortes
- Tabla: fecha, cajero, fondo, ventas por método, esperado, contado, diferencia,
  estado; reimprimir cada corte.

### 4.5 Movimientos de caja (opcional en MVP)
- **Retiro** (efectivo entregado a gerencia) e **ingreso** (efectivo extra) durante el
  turno, con motivo — afectan el esperado.

## 5. Datos

### 5.1 Local (offline-first)
Nuevo servicio `cashService` con el patrón existente (localStorage + `subscribe*`/
`get*Revision` para reactividad + `write*` con write-through/outbox):

```
CashSession {
  id: uuid; store_id: uuid; caja: string;        // dispositivo/caja
  fondo: number;                                  // efectivo inicial
  cajero: string;
  abierta_el: ISO; cerrada_el?: ISO|null;
  cliente_op_id: uuid;                            // idempotencia
  rev?: number;
}
CashCut {
  id: uuid; session_id: uuid;
  ventas_por_metodo: { efectivo: {tickets,total}, tarjeta: {...}, transferencia: {...} };
  esperado: { efectivo, tarjeta, transferencia };
  contado: { efectivo?, tarjeta?, transferencia? }; // verificado
  diferencia: { efectivo, tarjeta, transferencia, total };
  notas?: string; cajero: string;
  cerrado_el: ISO; cliente_op_id: uuid; rev?: number;
}
CashMovement (opcional) {
  id: uuid; session_id: uuid; tipo: apertura|venta|retiro|ingreso|ajuste;
  monto: number; metodo?: efectivo|tarjeta|transferencia;
  referencia?: sale_id; motivo?: string; fecha: ISO; usuario: string;
}
```

- Las **ventas** alimentan el corte leyendo `saleService` (método + total) dentro del
  rango de la sesión; no se duplica estado.

### 5.2 Backend central (write-through)
Endpoints nuevos en `/api/v1/cash` (con `client_op_id`, scoping por `store_id`):

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/cash/open` | Abre sesión: `{fondo, cajero, caja}` → sesión |
| POST | `/cash/close` | Corte: `{session_id, contado_por_metodo, notas}` → corte + sesión cerrada |
| POST | `/cash/withdrawal` | Retiro de caja (opcional) |
| POST | `/cash/ingress` | Ingreso de caja (opcional) |
| GET | `/cash/current?store_id=` | Sesión abierta actual |
| GET | `/cash/cuts?store_id=&cursor=` | Historial de cortes |

- Nuevas entidades en el `change_log`: `cash_session`, `cash_cut` (para que otros
  dispositivos de la tienda vean el corte).
- El corte se valida server-side (ventas de la sesión en el servidor = fuente de
  verdad cuando hay conexión; local es la fuente cuando offline).

### 5.3 Impresión
- Ticket térmico 80mm reutilizando el patrón del `Receipt` (CSS `@media print`):
  cabecera (farmacia, caja, fecha/cajero), tabla por método, esperado/contado/
  diferencia, total, notas, **firmas** (cajero y encargado).

## 6. Alcance propuesto (MVP)

1. Apertura de caja (fondo) + indicador de estado.
2. Corte de caja: resumen por método, esperado, conteo de efectivo, diferencia,
   notas, guardar + imprimir.
3. Historial de cortes (con reimpresión).
4. Write-through al backend (`/cash/open`, `/cash/close`) con outbox offline.
5. Ventas sin sincronizar se incluyen en el cálculo local con aviso.

Fuera del MVP: retiros/ingresos, conteo por denominación, múltiples cajas por
dispositivo, arqueos intermedios.

## 7. Decisiones confirmadas

1. **Apertura**: **obligatoria para vender** — el POS pide abrir caja (fondo inicial)
   antes de procesar una venta si no hay sesión abierta.
2. **Conteo de efectivo**: **total de efectivo contado** (un solo monto); tarjeta y
   transferencia se consideran electrónicas (verificadas contra el sistema, diferencia 0).
3. **Retiros/ingresos**: **incluidos en el MVP** (con motivo, afectan el esperado).
4. **Alcance del corte**: **por dispositivo/caja** (cada caja cierra su turno; sumable
   por tienda en reportes después).
5. **Sincronización con el backend (implementada en el cliente)**: todos los
   movimientos de caja (apertura, cierre/corte, retiros, ingresos) se **persisten
   siempre en local** (`cashService` → localStorage) y un handler inyectado
   (`remoteApi`) los sincroniza: una **sonda** detecta si el backend ya expone
   `/cash/*`; si sí, envía write-through y, sin red, encola en el outbox
   (`cash_open`, `cash_close`, `cash_withdrawal`, `cash_ingress`); si aún no los
   expone, los movimientos se conservan en local hasta que el backend los active
   (tras un reinicio de la app la sonda lo detecta y sincroniza de ahí en adelante).
   **Pendiente del backend**: endpoints `/cash/open`, `/cash/close`,
   `/cash/withdrawal`, `/cash/ingress`, `/cash/current` y entidades
   `cash_session`/`cash_cut` en el change_log (contrato en §5.2).
