import type { ApiErrorResponse, ApiSuccessResponse } from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

let currentCsrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  currentCsrfToken = token;
}

export function getCsrfToken(): string | null {
  return currentCsrfToken;
}

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    message: string,
    statusCode: number,
    code = 'API_ERROR',
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Ensures we have a valid CSRF token before making a state-changing request.
 */
async function ensureCsrfToken(): Promise<string | null> {
  if (currentCsrfToken) {
    return currentCsrfToken;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const json = (await res.json()) as ApiSuccessResponse<{
        csrfToken: string;
      }>;
      if (json.data?.csrfToken) {
        currentCsrfToken = json.data.csrfToken;
        return currentCsrfToken;
      }
    }
  } catch {
    // Ignore network failures here; the main request will surface the error
  }
  return null;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiSuccessResponse<T>> {
  const { body, params, headers: customHeaders, ...restOptions } = options;
  const method = (restOptions.method || 'GET').toUpperCase();

  let url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers = new Headers(customHeaders);
  headers.set('Accept', 'application/json');

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (isMutating) {
    const token = await ensureCsrfToken();
    if (token) {
      headers.set('X-CSRF-Token', token);
    }
  }

  const response = await fetch(url, {
    ...restOptions,
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccessResponse<T>
    | ApiErrorResponse
    | null;

  if (!response.ok || !payload || !payload.success) {
    const errPayload = payload as ApiErrorResponse | null;
    throw new ApiClientError(
      errPayload?.error?.message ||
        `Request failed with status ${response.status}`,
      response.status,
      errPayload?.error?.code || 'HTTP_ERROR',
      errPayload?.error?.details
    );
  }

  // Automatically capture rotated CSRF token if returned in auth responses
  const dataRecord = payload.data as unknown as Record<string, unknown> | null;
  if (dataRecord && typeof dataRecord.csrfToken === 'string') {
    currentCsrfToken = dataRecord.csrfToken;
  }

  return payload;
}
