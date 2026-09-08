import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, ensureMonths, listPlans, loadPlan, pickInitialPlanId, type ApiKind } from "./api";
import { isPlaceholderClientId, loadConfig } from "./config";
import { Dashboard } from "./Dashboard";
import { resolveCategory } from "./mapping";
import { buildAuthorizeUrl, captureOauthHash, tokenIsFresh } from "./oauth";
import { BootError, ConnectPage, PrivacyPage } from "./pages";
import { filterMonths, monthIdsInRange } from "./range";
import {
  emptyOverrides,
  getCache,
  getOverrides,
  getSelectedPlanId,
  getToken,
  setCache,
  setPlanOverrides,
  setSelectedPlanId,
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

export function App() {
  if (window.location.pathname.replace(/\/$/, "") === "/privacy") {
    return <PrivacyPage />;
  }
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
  const [range, setRange] = useState<DateRange>({ id: "this_year" });
  const [loading, setLoading] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fromOauthRef = useRef(false);
  const fetchKeyRef = useRef("");

  useEffect(() => {
    fetchKeyRef.current = "";
  }, [planId]);

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
        wipeAll();
        setToken(null);
        setOauthError("Session expired. Connect again.");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not list plans.");
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
      const cached = force ? null : getCache(summary.id);
      if (cached) {
        setPlan(cached);
        return cached;
      }
      const loaded = await loadPlan(access.accessToken, kind, summary);
      setCache(loaded);
      setPlan(loaded);
      return loaded;
    },
    [kind],
  );

  useEffect(() => {
    if (!token || !planId) return;
    const summary = plans.find((p) => p.id === planId);
    if (!summary) return;
    setSelectedPlanId(planId);
    setOverrides(getOverrides()[planId] ?? emptyOverrides());
    setLoading(true);
    setError(null);
    void hydratePlan(token, summary, false)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load plan.");
      })
      .finally(() => setLoading(false));
  }, [token, planId, plans, hydratePlan]);

  useEffect(() => {
    if (!token || !plan) return;
    const needed = monthIdsInRange(plan.monthIds, range);
    const have = new Set(
      plan.months.filter((m) => Object.keys(m.amounts).length > 0).map((m) => m.month),
    );
    const missing = needed.filter((id) => !have.has(id));
    if (missing.length === 0) return;
    const key = `${plan.planId}:${missing.join(",")}`;
    if (fetchKeyRef.current === key) return;
    let cancelled = false;
    fetchKeyRef.current = key;
    setFetchingMore(true);
    void ensureMonths(token.accessToken, kind, plan.planId, missing, plan.months)
      .then((months) => {
        if (cancelled) return;
        const next = { ...plan, months };
        setCache(next);
        setPlan(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load older months.");
        }
      })
      .finally(() => {
        if (!cancelled) setFetchingMore(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, plan, range, kind]);

  const categories = useMemo(() => {
    if (!plan || !config) return [];
    return plan.categories.map((c) => resolveCategory(c, config.markers, overrides));
  }, [plan, config, overrides]);

  const visibleMonths = useMemo(() => {
    if (!plan) return [];
    return filterMonths(plan.months, range, plan.monthIds);
  }, [plan, range]);

  function resetAll() {
    if (
      !window.confirm(
        "Clear all local data on this device and sign out?",
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
  }

  function saveOverrides(next: PlanOverrides) {
    if (!planId) return;
    setOverrides(next);
    setPlanOverrides(planId, next);
  }

  async function refresh() {
    if (!token || !planId) return;
    const summary = plans.find((p) => p.id === planId);
    if (!summary) return;
    setRefreshing(true);
    setError(null);
    try {
      await hydratePlan(token, summary, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }

  if (bootError) return <BootError message={bootError} />;
  if (!config) {
    return (
      <main className="connect">
        <p className="lede">Loading…</p>
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
          <span className="eyebrow">Conscious Spending Plan for YNAB</span>
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
            <strong>{plan?.planName ?? plans[0]?.name ?? "YNAB"}</strong>
          )}
        </div>
        <nav className="top-nav">
          <a href="/privacy">Privacy</a>
          <button type="button" className="text-btn" onClick={resetAll}>
            Reset all
          </button>
        </nav>
      </header>
      {error && <p className="banner err">{error}</p>}
      {loading && !plan && (
        <main className="connect">
          <p className="lede">Loading plan…</p>
        </main>
      )}
      {plan && (
        <Dashboard
          plan={plan}
          categories={categories}
          months={visibleMonths}
          monthIds={plan.monthIds}
          range={range}
          onRange={setRange}
          fetchingMore={fetchingMore}
          overrides={overrides}
          onOverrides={saveOverrides}
          onRefresh={() => void refresh()}
          refreshing={refreshing}
        />
      )}
      {isPlaceholderClientId(config.ynabClientId) && (
        <p className="fine center">
          Client ID is still the placeholder. Set it in config.json.
        </p>
      )}
    </div>
  );
}
