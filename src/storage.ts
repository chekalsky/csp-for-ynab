import type {
  CachedPlan,
  PlanOverrides,
  TokenRecord,
} from "./types";

const TOKEN = "ynab-csp.token";
const PLAN = "ynab-csp.planId";
const OVERRIDES = "ynab-csp.overrides";
const CACHE_PREFIX = "ynab-csp.cache.";
const OAUTH_STATE = "ynab-csp.oauthState";
const EXCLUDE_INVEST = "ynab-csp.excludeInvestments";
const PREFIX = "ynab-csp.";

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getToken(): TokenRecord | null {
  const rec = readJson<TokenRecord>(TOKEN);
  if (!rec?.accessToken || typeof rec.expiresAt !== "number") return null;
  return rec;
}

export function setToken(rec: TokenRecord): void {
  localStorage.setItem(TOKEN, JSON.stringify(rec));
}

export function getSelectedPlanId(): string | null {
  return localStorage.getItem(PLAN);
}

export function setSelectedPlanId(id: string): void {
  localStorage.setItem(PLAN, id);
}

export function getOverrides(): Record<string, PlanOverrides> {
  const raw = readJson<Record<string, PlanOverrides>>(OVERRIDES) ?? {};
  for (const rec of Object.values(raw)) {
    if (!rec.groups) rec.groups = {};
    if (!rec.buckets) rec.buckets = {};
    if (!rec.metrics) rec.metrics = {};
    if (!rec.bucketMetrics) rec.bucketMetrics = {};
  }
  return raw;
}

export function setPlanOverrides(planId: string, overrides: PlanOverrides): void {
  const all = getOverrides();
  all[planId] = overrides;
  localStorage.setItem(OVERRIDES, JSON.stringify(all));
}

export function emptyOverrides(): PlanOverrides {
  return { buckets: {}, groups: {}, metrics: {}, bucketMetrics: {} };
}

export function getExcludeInvestments(): boolean {
  return localStorage.getItem(EXCLUDE_INVEST) === "1";
}

export function setExcludeInvestments(value: boolean): void {
  localStorage.setItem(EXCLUDE_INVEST, value ? "1" : "0");
}

export function getCache(planId: string): CachedPlan | null {
  const rec = readJson<CachedPlan>(CACHE_PREFIX + planId);
  if (!rec?.planId || !Array.isArray(rec.months) || !Array.isArray(rec.categories)) {
    return null;
  }
  if (!Array.isArray(rec.monthIds)) rec.monthIds = rec.months.map((m) => m.month);
  return rec;
}

export function setCache(plan: CachedPlan): void {
  localStorage.setItem(CACHE_PREFIX + plan.planId, JSON.stringify(plan));
}

export function getOauthState(): string | null {
  return sessionStorage.getItem(OAUTH_STATE);
}

export function setOauthState(state: string): void {
  sessionStorage.setItem(OAUTH_STATE, state);
}

export function clearOauthState(): void {
  sessionStorage.removeItem(OAUTH_STATE);
}

export function wipeAll(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
  sessionStorage.removeItem(OAUTH_STATE);
}

/** Clears cache, overrides, and prefs. Keeps the OAuth token. */
export function clearLocalData(): void {
  const token = getToken();
  wipeAll();
  if (token) setToken(token);
}
