// Utilidades de persistencia local (localStorage).
// Esta capa permite migrar a un backend real en el futuro manteniendo
// la misma interfaz de servicios.

const PREFIX = 'farmacia_pos_';

export function loadData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // almacenamiento lleno o no disponible: ignorar
  }
}

export function nextId(items: { id: number }[]): number {
  return items.reduce((max, it) => Math.max(max, it.id), 0) + 1;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function todayISO(): string {
  return new Date().toISOString();
}
