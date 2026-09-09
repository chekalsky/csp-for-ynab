import { afterEach, expect, test, vi } from "vitest";
import {
  ensureMonths,
  fetchMonthDetails,
  listPlans,
  loadPlan,
  pickInitialPlanId,
} from "./api";
import type { CachedMonth, PlanSummary } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
});

function json(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const a: PlanSummary = {
  id: "a",
  name: "A",
  currency_format: null,
};
const b: PlanSummary = {
  id: "b",
  name: "B",
  currency_format: null,
};

test("pickInitialPlanId: oauth default, else saved, else default, else first", () => {
  expect(pickInitialPlanId([a, b], b, "a", true)).toBe("b");
  expect(pickInitialPlanId([a, b], b, "a", false)).toBe("a");
  expect(pickInitialPlanId([a, b], b, "missing", false)).toBe("b");
  expect(pickInitialPlanId([a, b], null, null, false)).toBe("a");
  expect(pickInitialPlanId([], null, null, false)).toBeNull();
});

test("listPlans falls back from /plans 404 to /budgets and prepends default", async () => {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/plans")) return json(404, { error: { detail: "gone" } });
    if (url.endsWith("/budgets")) {
      return json(200, {
        data: {
          budgets: [a],
          default_budget: b,
        },
      });
    }
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetch);
  const listed = await listPlans("tok");
  expect(listed.kind).toBe("budgets");
  expect(listed.plans.map((p) => p.id)).toEqual(["b", "a"]);
  expect(listed.defaultPlan?.id).toBe("b");
});

test("ensureMonths skips months that already have amounts", async () => {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/months/2026-02-01")) {
      return json(200, {
        data: {
          month: {
            month: "2026-02-01",
            categories: [{ id: "c", budgeted: 10, activity: -3 }],
          },
        },
      });
    }
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetch);
  const existing: CachedMonth[] = [
    { month: "2026-01-01", deleted: false, amounts: { c: { budgeted: 1, activity: 0 } } },
    { month: "2026-02-01", deleted: false, amounts: {} },
  ];
  const result = await ensureMonths(
    "tok",
    "plans",
    "p1",
    ["2026-01-01", "2026-02-01"],
    existing,
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(result.rateLimited).toBe(false);
  expect(result.months.find((m) => m.month === "2026-01-01")?.amounts.c.budgeted).toBe(1);
  expect(result.months.find((m) => m.month === "2026-02-01")?.amounts.c).toEqual({
    budgeted: 10,
    activity: -3,
  });
});

test("429 marks the month fetch as rate-limited", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json(429, { error: { detail: "slow down" } })),
  );
  const result = await fetchMonthDetails("tok", "plans", "p1", ["2026-01-01"]);
  expect(result.rateLimited).toBe(true);
  expect(result.months).toEqual([]);
});

const USD = {
  iso_code: "USD",
  example_format: "123,456.78",
  decimal_digits: 2,
  decimal_separator: ".",
  symbol_first: true,
  group_separator: ",",
  currency_symbol: "$",
  display_symbol: true,
};

test("listPlans keeps currency_format from the plan", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      json(200, {
        data: {
          plans: [{ id: "p1", name: "USD Plan", currency_format: USD }],
        },
      }),
    ),
  );
  const listed = await listPlans("tok");
  expect(listed.plans[0].currency_format).toEqual(USD);
});

test("loadPlan uses the plan's currency and skips settings", async () => {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/categories")) {
      return json(200, { data: { category_groups: [] } });
    }
    if (url.endsWith("/months")) {
      return json(200, { data: { months: [] } });
    }
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetch);
  const loaded = await loadPlan("tok", "plans", {
    id: "p1",
    name: "USD Plan",
    currency_format: USD,
  });
  expect(loaded.plan.currency.iso_code).toBe("USD");
  expect(loaded.plan.currency.currency_symbol).toBe("$");
  expect(fetch.mock.calls.some((c) => String(c[0]).includes("/settings"))).toBe(
    false,
  );
});

test("loadPlan falls back to settings, then EUR", async () => {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/categories")) {
      return json(200, { data: { category_groups: [] } });
    }
    if (url.endsWith("/months")) {
      return json(200, { data: { months: [] } });
    }
    if (url.endsWith("/settings")) {
      return json(404, { error: { detail: "gone" } });
    }
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetch);
  const usdSettings = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/categories")) {
      return json(200, { data: { category_groups: [] } });
    }
    if (url.endsWith("/months")) {
      return json(200, { data: { months: [] } });
    }
    if (url.endsWith("/settings")) {
      return json(200, { data: { settings: { currency_format: USD } } });
    }
    throw new Error(url);
  });
  vi.stubGlobal("fetch", usdSettings);
  const fromSettings = await loadPlan("tok", "plans", {
    id: "p1",
    name: "USD Plan",
    currency_format: null,
  });
  expect(fromSettings.plan.currency.iso_code).toBe("USD");
  vi.stubGlobal("fetch", fetch);
  const fallback = await loadPlan("tok", "plans", {
    id: "p1",
    name: "No currency",
    currency_format: null,
  });
  expect(fallback.plan.currency.iso_code).toBe("EUR");
});
