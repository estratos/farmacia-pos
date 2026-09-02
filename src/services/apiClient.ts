/**
 * Cliente HTTP para el backend central.
 *
 * Preparado para la integración con la API documentada (ver docs/central-api-design.md).
 * Base URL configurable vía VITE_API_BASE_URL (por defecto http://localhost:8080).
 * Detección de offline: si fetch falla por red, se lanza OfflineError y la operación
 * debe encolarse en el outbox (el mapeo de endpoints se hará cuando llegue la
 * documentación de la API).
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined ?? 'http://localhost:8080').replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 10_000;

/** Error de red/offline: la operación debe ir al outbox. */
export class OfflineError extends Error {
  constructor(message = 'Sin conexión con el servidor central') {
    super(message);
    this.name = 'OfflineError';
  }
}

/** Error de la API (4xx/5xx) con código y detalle del servidor. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function getApiBaseUrl(): string {
  return API_BASE;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * Ejecuta una petición a la API. Lanza OfflineError si no hay red y ApiError en
 * errores HTTP. Devuelve el JSON parseado.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, timeoutMs = REQUEST_TIMEOUT_MS } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    // TypeError (network) o timeout → sin conexión
    throw new OfflineError(err instanceof Error ? err.message : 'Fallo de red');
  }

  if (!res.ok) {
    let detail: unknown = null;
    let message = res.statusText || `Error ${res.status}`;
    try {
      const parsed = (await res.json()) as { message?: string; detail?: unknown };
      if (parsed?.message) message = parsed.message;
      detail = parsed?.detail ?? parsed;
    } catch {
      // cuerpo no JSON
    }
    throw new ApiError(res.status, message, detail);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
