import type {
  CachedPlan,
  PlanOverrides,
  TokenRecord,
} from "./types";

const PREFIX = "csp-for-ynab.";
const TOKEN = `${PREFIX}token`;
const PLAN = `${PREFIX}planId`;
const OVERRIDES_PREFIX = `${PREFIX}overrides.`;
const CACHE_PREFIX = `${PREFIX}cache.`;
const OAUTH_STATE = `${PREFIX}oauthState`;
const EXCLUDE_INVEST = `${PREFIX}excludeInvestments`;

function readJson<T>(store: Storage, key: string): T | null {
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function asToken(rec: TokenRecord | null): TokenRecord | null {
  if (!rec?.accessToken || typeof rec.expiresAt !== "number") return null;
  return rec;
}

export function getToken(): TokenRecord | null {
  return asToken(readJson<TokenRecord>(sessionStorage, TOKEN));
}

export function setToken(rec: TokenRecord): void {
  sessionStorage.setItem(TOKEN, JSON.stringify(rec));
}

export function getSelectedPlanId(): string | null {
  return localStorage.getItem(PLAN);
}

export function setSelectedPlanId(id: string): void {
  localStorage.setItem(PLAN, id);
}

export function emptyOverrides(): PlanOverrides {
  return { buckets: {}, groups: {}, metrics: {}, bucketMetrics: {} };
}

function asOverrides(rec: PlanOverrides | null): PlanOverrides {
  if (!rec) return emptyOverrides();
  return {
    buckets: rec.buckets ?? {},
    groups: rec.groups ?? {},
    metrics: rec.metrics ?? {},
    bucketMetrics: rec.bucketMetrics ?? {},
  };
}

export function getPlanOverrides(planId: string): PlanOverrides {
  return asOverrides(readJson<PlanOverrides>(localStorage, OVERRIDES_PREFIX + planId));
}

export function setPlanOverrides(planId: string, overrides: PlanOverrides): void {
  localStorage.setItem(OVERRIDES_PREFIX + planId, JSON.stringify(overrides));
}

export function getExcludeInvestments(): boolean {
  return localStorage.getItem(EXCLUDE_INVEST) === "1";
}

export function setExcludeInvestments(value: boolean): void {
  localStorage.setItem(EXCLUDE_INVEST, value ? "1" : "0");
}

export function getCache(planId: string): CachedPlan | null {
  const rec = readJson<CachedPlan>(localStorage, CACHE_PREFIX + planId);
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
  sessionStorage.removeItem(TOKEN);
  sessionStorage.removeItem(OAUTH_STATE);
}
