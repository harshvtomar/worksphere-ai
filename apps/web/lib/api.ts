export type User = { id: string; email: string; displayName: string };
export type Session = { user: User | null; csrfToken: string; activeOrganizationId: string | null };
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, options: { method?: string; body?: unknown; csrf?: string } = {}): Promise<T> {
  const response = await fetch(`/v1${path}`, {
    method: options.method ?? 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(options.csrf ? { 'x-csrf-token': options.csrf } : {}) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(typeof data.message === 'string' ? data.message : 'Request failed. Please try again.', response.status);
  return data as T;
}
