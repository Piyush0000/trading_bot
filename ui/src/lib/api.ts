import {
  LatestDataResponse,
  PositionsResponse,
  TokenDataResponse,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://trading-bot-822203960978.us-east1.run.app";

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const getLatestData = () => fetchJson<LatestDataResponse>("/latest_data");

export const getTokenData = (token: string) =>
  fetchJson<TokenDataResponse>(`/token_data?token=${encodeURIComponent(token)}`);

export const getPositions = () => fetchJson<PositionsResponse>("/positions");

// Auth (same-origin)
const authFetch = async <T>(path: string, init?: RequestInit) => {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Auth request failed");
  }
  return res.json() as Promise<T>;
};

export const signup = (email: string, password: string) =>
  authFetch<{ user: { email: string; id: string } }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const login = (email: string, password: string) =>
  authFetch<{ user: { email: string; id: string } }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const logout = () =>
  authFetch<{ success: boolean }>("/api/auth/logout", { method: "POST" });

export const me = () => authFetch<{ user: { email: string; userId?: string } | null }>("/api/auth/me");
