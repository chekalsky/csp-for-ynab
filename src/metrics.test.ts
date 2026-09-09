import { expect, test } from "vitest";
import { resolveCategory, type ResolvedCategory } from "./mapping";
import {
  amountFor,
  meanBuckets,
  monthSeries,
  rangeTotals,
  visibleAmount,
} from "./metrics";
import { emptyOverrides } from "./storage";
import type { CachedCategory, CachedMonth, Marker } from "./types";

const MARKERS: Marker[] = [
  { bucket: "fixed", patterns: ["[CSP-Fixed]"] },
  { bucket: "ignore", patterns: ["[CSP-Ignore]"] },
];

function cat(partial: Partial<CachedCategory> & Pick<CachedCategory, "id" | "name">) {
  return {
    groupId: "g",
    groupName: "G",
    note: "",
    hidden: false,
    internal: false,
    deleted: false,
    ...partial,
  };
}

function resolved(
  partial: Partial<CachedCategory> & Pick<CachedCategory, "id" | "name">,
): ResolvedCategory {
  return resolveCategory(cat(partial), MARKERS, emptyOverrides());
}

test("assigned is budgeted; spent is -activity", () => {
  expect(amountFor(1000, -400, "assigned")).toBe(1000);
  expect(amountFor(1000, -400, "spent")).toBe(400);
});

test("unmapped and ignore use the larger of assigned or spent, never negative", () => {
  expect(visibleAmount("unmapped", 100, -400, "assigned")).toBe(400);
  expect(visibleAmount("unmapped", 500, -100, "spent")).toBe(500);
  expect(visibleAmount("ignore", -50, 80, "assigned")).toBe(0);
  expect(visibleAmount("fixed", 1000, -400, "spent")).toBe(400);
});

test("series and totals skip missing rows as zero; ignore stays in its bucket", () => {
  const cats = [
    resolved({ id: "rent", name: "Rent [CSP-Fixed]" }),
    resolved({ id: "skip", name: "Old [CSP-Ignore]" }),
    resolved({ id: "loose", name: "Untagged" }),
  ];
  const months: CachedMonth[] = [
    {
      month: "2026-01-01",
      deleted: false,
      amounts: {
        rent: { budgeted: 1000, activity: -200 },
        skip: { budgeted: 50, activity: 0 },
      },
    },
  ];
  const series = monthSeries(months, cats);
  expect(series[0].buckets.fixed).toBe(200);
  expect(series[0].buckets.ignore).toBe(50);
  expect(series[0].buckets.unmapped).toBe(0);
  expect(rangeTotals(months, cats).fixed).toBe(200);
});

test("meanBuckets is 0 for an empty series", () => {
  expect(meanBuckets([], ["fixed"])).toBe(0);
});
