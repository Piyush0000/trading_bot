"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchBar } from "../components/SearchBar";
import { TokenCard } from "../components/TokenCard";
import { TokenCharts } from "../components/TokenCharts";
import { getLatestData, getTokenData, login, logout, me, signup } from "../lib/api";
import { TokenHistoryPoint, TokenMetrics } from "../lib/types";
import { normalizeTokenInput } from "../lib/utils";

const DASHBOARD_POLL_MS = 8000;
const TOKEN_POLL_MS = 8000;
const HISTORY_LIMIT = 60;

export default function Home() {
  const [searchValue, setSearchValue] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [tokenData, setTokenData] = useState<TokenMetrics | null>(null);
  const [tokenHistory, setTokenHistory] = useState<
    Record<string, TokenHistoryPoint[]>
  >({});
  const [dashboardData, setDashboardData] = useState<
    Record<string, TokenMetrics>
  >({});
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authUser, setAuthUser] = useState<{ email: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const addHistoryPoint = useCallback((symbol: string, point: TokenHistoryPoint) => {
    setTokenHistory((prev) => {
      const existing = prev[symbol] ?? [];
      const next = [...existing, point].slice(-HISTORY_LIMIT);
      return { ...prev, [symbol]: next };
    });
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await getLatestData();
      const normalized = Object.entries(res.data ?? {}).reduce(
        (acc, [key, value]) => {
          acc[key] = { ...value, symbol: key };
          return acc;
        },
        {} as Record<string, TokenMetrics>
      );
      setDashboardData(normalized);
      Object.values(normalized).forEach((item) =>
        addHistoryPoint(item.symbol, {
          timestamp: item.last_updated ?? res.last_updated,
          price: item.price,
          rsi: item.rsi,
        })
      );
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Could not load latest data. Please try again.");
    } finally {
      setDashboardLoading(false);
    }
  }, [addHistoryPoint]);

  const handleSearch = async () => {
    const normalized = normalizeTokenInput(searchValue);
    if (!normalized) {
      setError("Enter a token symbol to search.");
      return;
    }

    setSearchLoading(true);
    try {
      const res = await getTokenData(normalized);
      const entry = Object.entries(res.data ?? {})[0];
      if (!entry) {
        throw new Error("Token not found");
      }
      const [key, value] = entry;
      const merged: TokenMetrics = { ...value, symbol: key };
      setTokenData(merged);
      addHistoryPoint(merged.symbol, {
        timestamp: res.last_updated ?? new Date().toISOString(),
        price: merged.price,
        rsi: merged.rsi,
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Token not found or API error. Try BTC, ETH, SOL, XRP.");
      setTokenData(null);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const id = setInterval(loadDashboard, DASHBOARD_POLL_MS);
    return () => clearInterval(id);
  }, [loadDashboard]);

  useEffect(() => {
    if (!tokenData?.symbol) return;
    const id = setInterval(async () => {
      try {
        const res = await getTokenData(tokenData.symbol);
        const entry = Object.entries(res.data ?? {})[0];
        if (!entry) return;
        const [key, value] = entry;
        const merged: TokenMetrics = { ...value, symbol: key };
        setTokenData(merged);
        addHistoryPoint(merged.symbol, {
          timestamp: res.last_updated ?? new Date().toISOString(),
          price: merged.price,
          rsi: merged.rsi,
        });
      } catch (err) {
        console.error(err);
      }
    }, TOKEN_POLL_MS);

    return () => clearInterval(id);
  }, [tokenData?.symbol, addHistoryPoint]);

  useEffect(() => {
    (async () => {
      try {
        const res = await me();
        if (res.user) setAuthUser({ email: res.user.email });
      } catch {
        setAuthUser(null);
      } finally {
        setAuthChecking(false);
      }
    })();
  }, []);

  const handleAuth = async () => {
    if (!authEmail || !authPassword) {
      setError("Email and password are required.");
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        await signup(authEmail, authPassword);
      } else {
        await login(authEmail, authPassword);
      }
      setAuthUser({ email: authEmail });
      setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Auth failed";
        setError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await logout();
      setAuthUser(null);
    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  const tokenHistoryForActive = useMemo(
    () => (tokenData?.symbol ? tokenHistory[tokenData.symbol] ?? [] : []),
    [tokenData?.symbol, tokenHistory]
  );

  const dashboardList = useMemo(
    () => Object.entries(dashboardData).map(([key, value]) => ({ ...value, symbol: key })),
    [dashboardData]
  );

  if (authChecking || !authUser) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#071407] via-[#0c2210] to-[#041003] px-4 py-10 text-emerald-100">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(74,222,128,0.18), transparent 25%), radial-gradient(circle at 80% 0%, rgba(16,185,129,0.16), transparent 22%), radial-gradient(circle at 50% 80%, rgba(52,211,153,0.14), transparent 28%)",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(52,211,153,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(74,222,128,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
        </div>
        <div className="relative mx-auto flex max-w-3xl flex-col gap-8 pt-8 sm:pt-16">
          <div className="flex flex-col gap-3 text-center">
            <div className="inline-flex self-center items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 backdrop-blur">
              Secure Access · Sign in required
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-emerald-50 sm:text-4xl">
              Welcome back to the Trading Bot dashboard
            </h1>
            <p className="text-sm text-emerald-200/80">
              If this is your first time, choose <span className="font-semibold">Sign up</span> to create an account.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-emerald-500/20 bg-[#0b1a0f]/80 p-6 shadow-2xl shadow-emerald-900/40 backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-50">
                  {authUser ? `Signed in as ${authUser.email}` : "Login or create an account"}
                </div>
                <div className="text-xs text-emerald-200/80">
                  Accounts stored in MongoDB; session via secure httpOnly cookie.
                </div>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`rounded-full px-3 py-1 ${
                    authMode === "login"
                      ? "bg-emerald-500/30 text-emerald-50 border border-emerald-400/40"
                      : "bg-emerald-900/40 text-emerald-200/80 border border-emerald-500/20"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className={`rounded-full px-3 py-1 ${
                    authMode === "signup"
                      ? "bg-emerald-500/30 text-emerald-50 border border-emerald-400/40"
                      : "bg-emerald-900/40 text-emerald-200/80 border border-emerald-500/20"
                  }`}
                >
                  Sign up
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Email"
                className="rounded-xl border border-emerald-500/20 bg-[#0f2a18] px-4 py-3 text-sm text-emerald-100 shadow-inner shadow-emerald-900/40 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 placeholder:text-emerald-200/60"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password (min 6 chars)"
                  className="w-full rounded-xl border border-emerald-500/20 bg-[#0f2a18] px-4 py-3 pr-12 text-sm text-emerald-100 shadow-inner shadow-emerald-900/40 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 placeholder:text-emerald-200/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-2 my-auto rounded-lg px-2 text-xs font-semibold text-emerald-200/80 hover:text-emerald-100"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-emerald-200/80">
                New here? Use <span className="font-semibold">Sign up</span> to get started.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAuth}
                  disabled={authLoading}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authLoading ? "Processing..." : authMode === "signup" ? "Create account" : "Login"}
                </button>
                {authUser ? (
                  <button
                    onClick={handleLogout}
                    disabled={authLoading}
                    className="rounded-xl border border-emerald-500/40 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Logout
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {error ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#071407] via-[#0c2210] to-[#041003] px-4 py-10 text-emerald-100">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(74,222,128,0.18), transparent 25%), radial-gradient(circle at 80% 0%, rgba(16,185,129,0.16), transparent 22%), radial-gradient(circle at 50% 80%, rgba(52,211,153,0.14), transparent 28%)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(52,211,153,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(74,222,128,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 backdrop-blur">
            Demo Trading Bot · Live Signals
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-emerald-50 sm:text-4xl">
            Token signals, live metrics, and quick charts
          </h1>
          <p className="max-w-2xl text-sm text-emerald-200/80">
            Search any token, view signals, and watch the price/RSI evolve in near real-time.
          </p>
        </header>

        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-[#0b1a0f]/80 px-4 py-3 shadow-lg shadow-emerald-900/40">
          <div className="text-sm text-emerald-200/80">Signed in as {authUser.email}</div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/50"
          >
            Logout
          </button>
        </div>

        <section className="flex flex-col gap-4 rounded-3xl border border-emerald-500/20 bg-[#0b1a0f]/80 p-6 shadow-2xl shadow-emerald-900/40 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-emerald-50">Search token</div>
              <div className="text-xs text-emerald-200/80">
                Example: BTC, ETH, SOL, XRP. Adds USDT automatically.
              </div>
            </div>
          </div>
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            onSubmit={handleSearch}
            loading={searchLoading}
          />
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-900/30 dark:text-rose-200">
              {error}
            </div>
          ) : null}
          {tokenData ? <TokenCard data={tokenData} /> : null}
          {tokenData ? (
            <TokenCharts token={tokenData.symbol} history={tokenHistoryForActive} />
          ) : (
            <div className="rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-950/40 p-6 text-sm text-emerald-200/70 shadow-inner">
              Search a token to see its signal card and charts.
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-emerald-50">Live dashboard</div>
              <div className="text-xs text-emerald-200/80">
                Auto-refreshes every {DASHBOARD_POLL_MS / 1000}s.
              </div>
            </div>
            <div className="text-xs text-emerald-200/70">
              {dashboardLoading ? "Loading..." : `Showing ${dashboardList.length} tokens`}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {dashboardLoading && !dashboardList.length ? (
              <div className="col-span-2 rounded-2xl border border-emerald-500/20 bg-[#0b1a0f]/70 p-6 text-center text-sm text-emerald-200/70">
                Fetching live data...
              </div>
            ) : dashboardList.length ? (
              dashboardList.map((item) => <TokenCard key={item.symbol} data={item} />)
            ) : (
              <div className="col-span-2 rounded-2xl border border-amber-500/30 bg-amber-900/40 p-6 text-sm text-amber-100">
                No dashboard data yet. Ensure the backend is reachable.
              </div>
            )}
          </div>
        </section>

        <footer className="pb-4 text-xs text-emerald-200/70"></footer>
      </div>
    </div>
  );
}
