import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, ensureMonths, fetchMonthDetails, listPlans, loadPlan, pickInitialPlanId, type ApiKind } from "./api";
import { isPlaceholderClientId, loadConfig } from "./config";
import { Dashboard } from "./Dashboard";
import { buildAuthorizeUrl, captureOauthHash, tokenIsFresh } from "./oauth";
import { BootError, ConnectPage, PrivacyPage, Attribution, Loader } from "./pages";
import { cachedMonthIds, filterMonths, monthIdsInRange, rangeComplete, utcMonthStart } from "./range";
import {
  emptyOverrides,
  getCache,
  planForId,
  withPlanCurrency,
  getDateRange,
  getPlanOverrides,
  getSelectedPlanId,
  getToken,
  setCache,
  setDateRange,
  setPlanOverrides,
  setSelectedPlanId,
  clearToken,
  wipeAll,
} from "./storage";
import type {
  AppConfig,
  CachedPlan,
  DateRange,
  PlanOverrides,
  PlanSummary,
  TokenRecord,
} from "./types";

const CURRENT_MONTH_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WAIT =
  "YNAB rate-limited this tab. Nothing is cached here yet. Wait a few minutes, then Refresh.";
const RATE_LIMIT_CACHED =
  "YNAB rate-limited this tab. Showing what’s already cached. Wait a few minutes, then Refresh.";
const NO_CACHE_WAIT =
  "Couldn’t load your plan. Nothing is cached here yet. Wait a few minutes, then Refresh.";

function noCacheError(err: unknown): string {
  if (err instanceof ApiError && err.status === 429) return RATE_LIMIT_WAIT;
  return NO_CACHE_WAIT;
}

const SITE = "https://csp-for-ynab.chekalsky.com";

export function App() {
  const privacy = window.location.pathname.replace(/\/$/, "") === "/privacy";
  useEffect(() => {
    document.title = privacy
      ? "Privacy · Conscious Spending Plan for YNAB"
      : "Conscious Spending Plan for YNAB";
    const canonical =
      document.querySelector<HTMLLinkElement>("link[rel='canonical']") ??
      document.head.appendChild(document.createElement("link"));
    canonical.rel = "canonical";
    canonical.href = privacy ? `${SITE}/privacy` : `${SITE}/`;
  }, [privacy]);
  if (privacy) return <PrivacyPage />;
  return <Shell />;
}

function Shell() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [token, setToken] = useState<TokenRecord | null>(null);
  const [kind, setKind] = useState<ApiKind>("plans");
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<CachedPlan | null>(null);
  const [overrides, setOverrides] = useState<PlanOverrides>(emptyOverrides());
  const [range, setRange] = useState<DateRange>(getDateRange);
  const [loading, setLoading] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const fromOauthRef = useRef(false);
  const fillAttempt = useRef("");
  const planIdRef = useRef(planId);
  planIdRef.current = planId;

  useEffect(() => {
    const captured = captureOauthHash();
    if (captured && !captured.ok) setOauthError(captured.error);
    if (captured?.ok) fromOauthRef.current = true;
    const existing = getToken();
    setToken(existing && tokenIsFresh(existing) ? existing : null);
    loadConfig()
      .then(setConfig)
      .catch((err: unknown) => {
        setBootError(err instanceof Error ? err.message : "Failed to load config.json");
      });
  }, []);

  const loadPlans = useCallback(async (access: TokenRecord, oauthPick: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const listed = await listPlans(access.accessToken);
      setKind(listed.kind);
      setPlans(listed.plans);
      const next = pickInitialPlanId(
        listed.plans,
        listed.defaultPlan,
        oauthPick ? null : getSelectedPlanId(),
        oauthPick,
      );
      setPlanId(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        setToken(null);
        setOauthError("Session expired. Connect again.");
        return;
      }
      setError(noCacheError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const oauthPick = fromOauthRef.current;
    fromOauthRef.current = false;
    void loadPlans(token, oauthPick);
  }, [token, loadPlans]);

  const hydratePlan = useCallback(
    async (access: TokenRecord, summary: PlanSummary, force: boolean) => {
      const selected = () => planIdRef.current === summary.id;
      if (!force) {
        const cached = getCache(summary.id);
        if (cached) {
          const plan = withPlanCurrency(cached, summary.currency_format);
          if (selected()) {
            if (plan !== cached) setCache(plan);
            setPlan(plan);
          }
          return plan;
        }
      }
      try {
        const loaded = await loadPlan(access.accessToken, kind, summary);
        const cached = getCache(summary.id);
        const byId = new Map((cached?.months ?? []).map((m) => [m.month, m]));
        for (const row of loaded.plan.months) byId.set(row.month, row);
        const plan = {
          ...loaded.plan,
          months: [...byId.values()].sort((a, b) => a.month.localeCompare(b.month)),
        };
        setCache(plan);
        if (!selected()) return plan;
        setPlan(plan);
        if (loaded.rateLimited) {
          setRateLimited(true);
          setError(RATE_LIMIT_CACHED);
        } else {
          setRateLimited(false);
        }
        return plan;
      } catch (err) {
        const cached = getCache(summary.id);
        if (cached && err instanceof ApiError && err.status === 429) {
          const plan = withPlanCurrency(cached, summary.currency_format);
          if (selected()) {
            if (plan !== cached) setCache(plan);
            setPlan(plan);
            setRateLimited(true);
            setError(RATE_LIMIT_CACHED);
          }
          return plan;
        }
        throw err;
      }
    },
    [kind],
  );

  useEffect(() => {
    if (!token || !planId) return;
    const summary = plans.find((p) => p.id === planId);
    if (!summary) return;
    setSelectedPlanId(planId);
    setOverrides(getPlanOverrides(planId));
    setPlan((prev) => planForId(planId, prev));
    setRateLimited(false);
    setLoading(true);
    setError(null);
    void hydratePlan(token, summary, false)
      .catch((err: unknown) => {
        if (planIdRef.current !== summary.id) return;
        setError(noCacheError(err));
      })
      .finally(() => {
        if (planIdRef.current === summary.id) setLoading(false);
      });
  }, [token, planId, plans, hydratePlan]);

  useEffect(() => {
    if (!token || !plan) return;
    const current = utcMonthStart();
    const haveCurrent = plan.months.some(
      (m) => m.month === current && Object.keys(m.amounts).length > 0,
    );
    if (
      haveCurrent &&
      Date.now() - (plan.fetchedAt || 0) < CURRENT_MONTH_TTL_MS
    ) {
      return;
    }
    const id = plan.planId;
    let cancelled = false;
    void fetchMonthDetails(token.accessToken, kind, id, [current]).then(
      (result) => {
        if (result.rateLimited) setRateLimited(true);
        if (cancelled || result.months.length === 0) return;
        setPlan((prev) => {
          if (!prev || prev.planId !== id) return prev;
          const byId = new Map(prev.months.map((m) => [m.month, m]));
          for (const row of result.months) byId.set(row.month, row);
          const months = [...byId.values()].sort((a, b) =>
            a.month.localeCompare(b.month),
          );
          const monthIds = prev.monthIds.includes(current)
            ? prev.monthIds
            : [...prev.monthIds, current].sort();
          const next = { ...prev, months, monthIds, fetchedAt: Date.now() };
          setCache(next);
          return next;
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, plan?.planId, kind]);

  useEffect(() => {
    fillAttempt.current = "";
  }, [plan?.planId]);

  const visibleMonths = useMemo(() => {
    if (!plan) return [];
    return filterMonths(plan.months, range, plan.monthIds);
  }, [plan, range]);

  const rangeReady = Boolean(
    plan && rangeComplete(plan.monthIds, plan.months, range),
  );
  const rangeMessage =
    plan && !fetchingMore && !rangeReady && rateLimited && !error
      ? "YNAB rate-limited this tab. This range isn’t fully cached. Wait a few minutes, then Refresh."
      : null;

  useEffect(() => {
    if (!token || !plan) return;
    if (loading || fetchingMore || refreshing || rateLimited) return;
    const missing = monthIdsInRange(plan.monthIds, range).filter(
      (id) => !cachedMonthIds(plan.months).has(id),
    );
    if (missing.length === 0) return;
    const key = `${plan.planId}:${missing.join(",")}`;
    if (fillAttempt.current === key) return;
    fillAttempt.current = key;
    const id = plan.planId;
    setFetchingMore(true);
    void ensureMonths(token.accessToken, kind, id, missing, plan.months)
      .then((result) => {
        setPlan((prev) => {
          if (!prev || prev.planId !== id) return prev;
          const next = { ...prev, months: result.months };
          setCache(next);
          return next;
        });
        if (result.rateLimited) {
          setRateLimited(true);
          setError(RATE_LIMIT_CACHED);
        } else {
          setRateLimited(false);
        }
      })
      .finally(() => setFetchingMore(false));
  }, [token, kind, plan, range, loading, fetchingMore, refreshing, rateLimited]);

  function resetAll() {
    if (
      !window.confirm(
        "Log out and erase everything stored in this browser, including the YNAB cache and your category bucket overrides?",
      )
    ) {
      return;
    }
    wipeAll();
    setToken(null);
    setPlan(null);
    setPlans([]);
    setPlanId(null);
    setOverrides(emptyOverrides());
    setRange({ id: "last_12" });
    setRateLimited(false);
  }

  function saveOverrides(next: PlanOverrides) {
    if (!planId) return;
    setOverrides(next);
    setPlanOverrides(planId, next);
  }

  function saveRange(next: DateRange) {
    setRange(next);
    setDateRange(next);
  }

  async function refresh() {
    if (!token) return;
    setRefreshing(true);
    setError(null);
    try {
      if (!planId) {
        await loadPlans(token, false);
        return;
      }
      const summary = plans.find((p) => p.id === planId);
      if (!summary) {
        await loadPlans(token, false);
        return;
      }
      if (plan) {
        const missing = monthIdsInRange(plan.monthIds, range).filter(
          (id) => !cachedMonthIds(plan.months).has(id),
        );
        if (missing.length > 0) {
          setFetchingMore(true);
          try {
            const result = await ensureMonths(
              token.accessToken,
              kind,
              plan.planId,
              missing,
              plan.months,
            );
            const next = { ...plan, months: result.months };
            setCache(next);
            setPlan(next);
            if (result.rateLimited) {
              setRateLimited(true);
              setError(RATE_LIMIT_CACHED);
            } else {
              setRateLimited(false);
            }
          } finally {
            setFetchingMore(false);
          }
          return;
        }
      }
      await hydratePlan(token, summary, true);
    } catch (err) {
      if (plan) {
        if (err instanceof ApiError && err.status === 429) {
          setRateLimited(true);
          setError(RATE_LIMIT_CACHED);
          return;
        }
        setError(err instanceof Error ? err.message : "Refresh failed.");
        return;
      }
      setError(noCacheError(err));
    } finally {
      setRefreshing(false);
    }
  }

  if (bootError) return <BootError message={bootError} />;
  if (!config) {
    return (
      <main className="connect loader-page">
        <Loader label="Loading…" />
      </main>
    );
  }

  if (!token) {
    const authorizeUrl = isPlaceholderClientId(config.ynabClientId)
      ? "#"
      : buildAuthorizeUrl(config.ynabClientId, config.redirectUri);
    return (
      <ConnectPage
        config={config}
        authorizeUrl={authorizeUrl}
        error={oauthError}
      />
    );
  }

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="eyebrow">
            Conscious Spending Plan for YNAB
          </span>
          {plans.length > 1 ? (
            <label>
              <span className="sr-only">Plan</span>
              <select
                value={planId ?? ""}
                onChange={(e) => setPlanId(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            (plan?.planName ?? plans[0]?.name) && (
              <strong>{plan?.planName ?? plans[0]?.name}</strong>
            )
          )}
        </div>
        <nav className="top-nav">
          <a href="/privacy">Privacy</a>
          <button
            type="button"
            className="text-btn"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            <RefreshIcon />
            Refresh
          </button>
          <button type="button" className="text-btn" onClick={resetAll}>
            <ResetIcon />
            Log out
          </button>
        </nav>
      </header>
      {loading && !plan && (
        <Loader fill label="Loading plan…" />
      )}
      {error && !plan && !loading && (
        <main className="connect">
          <h1>Wait a few minutes</h1>
          <p className="lede">{error}</p>
        </main>
      )}
      {plan && (
        <Dashboard
          plan={plan}
          markers={config.markers}
          months={visibleMonths}
          monthIds={plan.monthIds}
          range={range}
          onRange={saveRange}
          fetchingMore={fetchingMore}
          rangeReady={rangeReady}
          rangeMessage={rangeMessage}
          error={error}
          rateLimited={rateLimited}
          overrides={overrides}
          onOverrides={saveOverrides}
        />
      )}
      {isPlaceholderClientId(config.ynabClientId) && (
        <p className="fine center">
          Client ID is still the placeholder. Set it in config.json.
        </p>
      )}
      <Attribution />
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="currentColor"
    >
      <path d="M6.2 2h3.6l.45 1.1H13.5V4.5h-11V3.1h3.25L6.2 2ZM3.7 5.5h8.6l-.65 8.2H4.35L3.7 5.5Zm2.55 1.4v5.2h1.2V6.9H6.25Zm2.3 0v5.2h1.2V6.9H8.55Z" />
    </svg>
  );
}
