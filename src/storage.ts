import type {
  CachedPlan,
  DateRange,
  DateRangeId,
  PlanOverrides,
  TokenRecord,
} from "./types";
import { RANGE_PRESETS } from "./range";

const PREFIX = "csp-for-ynab.";
const TOKEN = `${PREFIX}token`;
const PLAN = `${PREFIX}planId`;
const OVERRIDES_PREFIX = `${PREFIX}overrides.`;
const CACHE_PREFIX = `${PREFIX}cache.`;
const OAUTH_STATE = `${PREFIX}oauthState`;
const EXCLUDE_INVEST = `${PREFIX}excludeInvestments`;
const EXCLUDE_CURRENT = `${PREFIX}excludeCurrentMonth`;
const IGNORE_HIDDEN = `${PREFIX}ignoreHidden`;
const RANGE = `${PREFIX}range`;

const RANGE_IDS = new Set<DateRangeId>(RANGE_PRESETS.map((p) => p.id));

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

function getFlag(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v === "1";
}

function setFlag(key: string, value: boolean): void {
  localStorage.setItem(key, value ? "1" : "0");
}

export function getExcludeInvestments(): boolean {
  return getFlag(EXCLUDE_INVEST, false);
}

export function setExcludeInvestments(value: boolean): void {
  setFlag(EXCLUDE_INVEST, value);
}

export function getExcludeCurrentMonth(): boolean {
  return getFlag(EXCLUDE_CURRENT, false);
}

export function setExcludeCurrentMonth(value: boolean): void {
  setFlag(EXCLUDE_CURRENT, value);
}

export function getIgnoreHidden(): boolean {
  return getFlag(IGNORE_HIDDEN, true);
}

export function setIgnoreHidden(value: boolean): void {
  setFlag(IGNORE_HIDDEN, value);
}

function asDateRange(rec: DateRange | null): DateRange {
  if (!rec) return { id: "last_12" };
  const currentYear = new Date().getUTCFullYear();
  const id = (rec as { id?: string }).id;
  if (id === "last_year") {
    return { id: "year", year: currentYear - 1 };
  }
  if (!RANGE_IDS.has(rec.id)) return { id: "last_12" };
  if (rec.id === "year") {
    const year = typeof rec.year === "number" ? rec.year : Number(rec.year);
    if (!Number.isInteger(year) || year < 1970) return { id: "last_12" };
    return { id: "year", year: year >= currentYear ? currentYear - 1 : year };
  }
  if (rec.id !== "custom") return { id: rec.id };
  return {
    id: "custom",
    from: typeof rec.from === "string" ? rec.from : undefined,
    to: typeof rec.to === "string" ? rec.to : undefined,
  };
}

export function getDateRange(): DateRange {
  return asDateRange(readJson<DateRange>(localStorage, RANGE));
}

export function setDateRange(range: DateRange): void {
  localStorage.setItem(RANGE, JSON.stringify(asDateRange(range)));
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
