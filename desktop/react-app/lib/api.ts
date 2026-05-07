export const API_BASE = "";

export async function apiFetch<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers ?? {})
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
  return res.json() as Promise<T>;
}
