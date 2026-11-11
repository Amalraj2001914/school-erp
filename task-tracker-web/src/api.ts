const ACCESS = "accessToken";
const REFRESH = "refreshToken";

export const getAccessToken = () => localStorage.getItem(ACCESS);
export const getRefreshToken = () => localStorage.getItem(REFRESH);

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

async function rawFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`/api${path}`, { ...options, headers });
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  const json = await res.json();
  setTokens(json.data.accessToken, json.data.refreshToken);
  return true;
}

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res = await rawFetch(path, options);

  // Access token expired: refresh once and retry
  if (res.status === 401 && !PUBLIC_PATHS.includes(path) && (await tryRefresh())) {
    res = await rawFetch(path, options);
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();
  if (!res.ok) {
    const detail = json.errors
      ?.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`)
      .join(", ");
    throw new Error(detail ? `${json.message} (${detail})` : json.message);
  }
  return json.data as T;
}