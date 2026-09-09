import { expect, test } from "vitest";
import { FALLBACK_CURRENCY } from "./format";
import {
  getCache,
  planForId,
  getDateRange,
  getToken,
  setCache,
  setDateRange,
  setToken,
  withPlanCurrency,
  wipeAll,
} from "./storage";

test("bad JSON and incomplete tokens are null", () => {
  sessionStorage.setItem("csp-for-ynab.token", "{");
  expect(getToken()).toBeNull();
  setToken({ accessToken: "t", expiresAt: 1 });
  sessionStorage.setItem("csp-for-ynab.token", JSON.stringify({ accessToken: "t" }));
  expect(getToken()).toBeNull();
});

test("invalid range ids fall back to last_12; last_year migrates", () => {
  localStorage.setItem("csp-for-ynab.range", JSON.stringify({ id: "nope" }));
  expect(getDateRange()).toEqual({ id: "last_12" });
  localStorage.setItem("csp-for-ynab.range", JSON.stringify({ id: "last_year" }));
  expect(getDateRange()).toEqual({
    id: "year",
    year: new Date().getUTCFullYear() - 1,
  });
  setDateRange({ id: "custom", from: "2026-01-01", to: "2026-03-01" });
  expect(getDateRange()).toEqual({
    id: "custom",
    from: "2026-01-01",
    to: "2026-03-01",
  });
});

test("switching plans does not keep another plan's dashboard", () => {
  const a = {
    planId: "a",
    planName: "A",
    currency: FALLBACK_CURRENCY,
    fetchedAt: 1,
    categories: [],
    months: [],
    monthIds: [],
  };
  setCache(a);
  expect(planForId("b", a)).toBeNull();
  const b = { ...a, planId: "b", planName: "B" };
  setCache(b);
  expect(planForId("b", a)?.planId).toBe("b");
  expect(planForId("a", a)).toBe(a);
});

test("cached plan takes currency from the selected plan", () => {
  const cached = {
    planId: "a",
    planName: "A",
    currency: FALLBACK_CURRENCY,
    fetchedAt: 1,
    categories: [],
    months: [],
    monthIds: [],
  };
  const usd = {
    ...FALLBACK_CURRENCY,
    iso_code: "USD",
    currency_symbol: "$",
    decimal_separator: ".",
    group_separator: ",",
  };
  expect(withPlanCurrency(cached, usd).currency.iso_code).toBe("USD");
  expect(withPlanCurrency(cached, null).currency.iso_code).toBe("EUR");
});

test("cache backfills monthIds from months", () => {
  localStorage.setItem(
    "csp-for-ynab.cache.p1",
    JSON.stringify({
      planId: "p1",
      planName: "Main",
      currency: FALLBACK_CURRENCY,
      fetchedAt: 1,
      categories: [],
      months: [{ month: "2026-01-01", deleted: false, amounts: {} }],
    }),
  );
  expect(getCache("p1")?.monthIds).toEqual(["2026-01-01"]);
  expect(getCache("missing")).toBeNull();
});

test("wipeAll only removes csp-for-ynab keys", () => {
  localStorage.setItem("other", "keep");
  localStorage.setItem("csp-for-ynab.planId", "p1");
  setCache({
    planId: "p1",
    planName: "Main",
    currency: FALLBACK_CURRENCY,
    fetchedAt: 1,
    categories: [],
    months: [],
    monthIds: [],
  });
  setToken({ accessToken: "t", expiresAt: 9 });
  wipeAll();
  expect(localStorage.getItem("other")).toBe("keep");
  expect(localStorage.getItem("csp-for-ynab.planId")).toBeNull();
  expect(getCache("p1")).toBeNull();
  expect(getToken()).toBeNull();
});
