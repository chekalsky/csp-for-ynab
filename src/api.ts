import { FALLBACK_CURRENCY } from "./format";
import { utcMonthStart } from "./range";
import type {
  CachedCategory,
  CachedMonth,
  CachedPlan,
  CurrencyFormat,
  MonthAmounts,
  PlanSummary,
} from "./types";

const API = "https://api.ynab.com/v1";

export type ApiKind = "plans" | "budgets";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function apiGet(token: string, path: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const rec = asRecord(body);
    const err = rec ? asRecord(rec.error) : null;
    const detail =
      (err && typeof err.detail === "string" && err.detail) ||
      `YNAB API ${res.status} on ${path}`;
    throw new ApiError(res.status, detail);
  }
  return body;
}

function parseCurrency(raw: unknown): CurrencyFormat | null {
  const rec = asRecord(raw);
  if (!rec || typeof rec.iso_code !== "string") return null;
  return {
    iso_code: rec.iso_code,
    example_format: typeof rec.example_format === "string" ? rec.example_format : "",
    decimal_digits: typeof rec.decimal_digits === "number" ? rec.decimal_digits : 2,
    decimal_separator:
      typeof rec.decimal_separator === "string" ? rec.decimal_separator : ".",
    symbol_first: Boolean(rec.symbol_first),
    group_separator: typeof rec.group_separator === "string" ? rec.group_separator : ",",
    currency_symbol: typeof rec.currency_symbol === "string" ? rec.currency_symbol : "",
    display_symbol: rec.display_symbol !== false,
  };
}

function parsePlanSummary(raw: unknown): PlanSummary | null {
  const rec = asRecord(raw);
  if (!rec || typeof rec.id !== "string" || typeof rec.name !== "string") return null;
  return {
    id: rec.id,
    name: rec.name,
    first_month: typeof rec.first_month === "string" ? rec.first_month : undefined,
    last_month: typeof rec.last_month === "string" ? rec.last_month : undefined,
    currency_format: parseCurrency(rec.currency_format),
  };
}

export async function listPlans(
  token: string,
): Promise<{ kind: ApiKind; plans: PlanSummary[]; defaultPlan: PlanSummary | null }> {
  const parseList = (
    key: "plans" | "budgets",
    body: unknown,
  ): { plans: PlanSummary[]; defaultPlan: PlanSummary | null } => {
    const data = asRecord(asRecord(body)?.data);
    const plans = asArray(data?.[key])
      .map(parsePlanSummary)
      .filter((p): p is PlanSummary => p !== null);
    const defaultPlan =
      parsePlanSummary(data?.default_plan) ?? parsePlanSummary(data?.default_budget);
    if (defaultPlan && !plans.some((p) => p.id === defaultPlan.id)) {
      return { plans: [defaultPlan, ...plans], defaultPlan };
    }
    return { plans, defaultPlan };
  };

  try {
    const body = await apiGet(token, "/plans");
    const listed = parseList("plans", body);
    if (listed.plans.length > 0) return { kind: "plans", ...listed };
  } catch (err) {
    if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 400)) {
      throw err;
    }
  }
  const body = await apiGet(token, "/budgets");
  return { kind: "budgets", ...parseList("budgets", body) };
}

export function pickInitialPlanId(
  plans: PlanSummary[],
  defaultPlan: PlanSummary | null,
  savedId: string | null,
  fromOauth: boolean,
): string | null {
  const defaultId = defaultPlan?.id ?? null;
  if (fromOauth && defaultId) return defaultId;
  if (savedId && plans.some((p) => p.id === savedId)) return savedId;
  if (defaultId) return defaultId;
  return plans[0]?.id ?? null;
}

function parseCategory(
  raw: unknown,
  fallbackGroup: { id: string; name: string },
): CachedCategory | null {
  const rec = asRecord(raw);
  if (!rec || typeof rec.id !== "string" || typeof rec.name !== "string") return null;
  if (rec.deleted === true) return null;
  const groupId =
    typeof rec.category_group_id === "string" ? rec.category_group_id : fallbackGroup.id;
  const groupName =
    typeof rec.category_group_name === "string"
      ? rec.category_group_name
      : fallbackGroup.name;
  return {
    id: rec.id,
    name: rec.name,
    groupId,
    groupName,
    note: typeof rec.note === "string" ? rec.note : "",
    hidden: rec.hidden === true,
    internal: rec.internal === true,
    deleted: false,
  };
}

function parseMonthAmounts(raw: unknown): MonthAmounts {
  const amounts: MonthAmounts = {};
  for (const item of asArray(raw)) {
    const rec = asRecord(item);
    if (!rec || typeof rec.id !== "string") continue;
    if (rec.deleted === true) continue;
    amounts[rec.id] = {
      budgeted: typeof rec.budgeted === "number" ? rec.budgeted : 0,
      activity: typeof rec.activity === "number" ? rec.activity : 0,
    };
  }
  return amounts;
}

function parseMonth(raw: unknown): CachedMonth | null {
  const rec = asRecord(raw);
  if (!rec || typeof rec.month !== "string") return null;
  if (rec.deleted === true) return null;
  return {
    month: rec.month.slice(0, 10),
    deleted: false,
    amounts: parseMonthAmounts(rec.categories),
  };
}

function categoriesFromGroups(raw: unknown): CachedCategory[] {
  const out: CachedCategory[] = [];
  for (const groupRaw of asArray(raw)) {
    const group = asRecord(groupRaw);
    if (!group || group.deleted === true) continue;
    const fallback = {
      id: typeof group.id === "string" ? group.id : "",
      name: typeof group.name === "string" ? group.name : "",
    };
    const groupHidden = group.hidden === true;
    for (const catRaw of asArray(group.categories)) {
      const cat = parseCategory(catRaw, fallback);
      if (cat) out.push(groupHidden ? { ...cat, hidden: true } : cat);
    }
  }
  return out;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

export type MonthFetch = {
  months: CachedMonth[];
  rateLimited: boolean;
};

export async function fetchMonthDetails(
  token: string,
  kind: ApiKind,
  planId: string,
  months: string[],
): Promise<MonthFetch> {
  const prefix = kind === "plans" ? "/plans" : "/budgets";
  let rateLimited = false;
  const rows = await mapPool(months, 2, async (month) => {
    if (rateLimited) return null;
    try {
      const body = await apiGet(token, `${prefix}/${planId}/months/${month}`);
      const data = asRecord(asRecord(body)?.data);
      return parseMonth(data?.month);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) rateLimited = true;
      return null;
    }
  });
  return {
    months: rows.filter((m): m is CachedMonth => m !== null),
    rateLimited,
  };
}

export async function ensureMonths(
  token: string,
  kind: ApiKind,
  planId: string,
  monthIds: string[],
  existing: CachedMonth[],
): Promise<MonthFetch> {
  const have = new Set(
    existing.filter((m) => Object.keys(m.amounts).length > 0).map((m) => m.month),
  );
  const missing = monthIds.filter((id) => !have.has(id));
  if (missing.length === 0) return { months: existing, rateLimited: false };
  const fetched = await fetchMonthDetails(token, kind, planId, missing);
  const byId = new Map(existing.map((m) => [m.month, m]));
  for (const row of fetched.months) byId.set(row.month, row);
  return {
    months: [...byId.values()].sort((a, b) => a.month.localeCompare(b.month)),
    rateLimited: fetched.rateLimited,
  };
}

const EAGER_MONTHS = 12;

export async function loadPlan(
  token: string,
  kind: ApiKind,
  summary: PlanSummary,
): Promise<{ plan: CachedPlan; rateLimited: boolean }> {
  const prefix = kind === "plans" ? "/plans" : "/budgets";
  const [catBody, monthsBody, settingsBody] = await Promise.all([
    apiGet(token, `${prefix}/${summary.id}/categories`),
    apiGet(token, `${prefix}/${summary.id}/months`),
    summary.currency_format
      ? Promise.resolve(null)
      : apiGet(token, `${prefix}/${summary.id}/settings`).catch(() => null),
  ]);

  const catData = asRecord(asRecord(catBody)?.data);
  const categories = categoriesFromGroups(catData?.category_groups);

  const monthData = asRecord(asRecord(monthsBody)?.data);
  const monthIds = asArray(monthData?.months)
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null && row.deleted !== true)
    .map((row) => (typeof row.month === "string" ? row.month.slice(0, 10) : ""))
    .filter(Boolean)
    .sort();

  const current = utcMonthStart();
  const throughNow = monthIds.filter((id) => id <= current);
  const eager = (throughNow.length > 0 ? throughNow : monthIds).slice(-EAGER_MONTHS);
  const fetched = await fetchMonthDetails(token, kind, summary.id, eager);

  const settings = asRecord(asRecord(asRecord(settingsBody)?.data)?.settings);
  const currency =
    summary.currency_format ??
    parseCurrency(settings?.currency_format) ??
    FALLBACK_CURRENCY;

  return {
    plan: {
      planId: summary.id,
      planName: summary.name,
      currency,
      fetchedAt: Date.now(),
      categories,
      months: fetched.months,
      monthIds,
    },
    rateLimited: fetched.rateLimited,
  };
}
