import { expect, test } from "vitest";
import { metricFor, resolveCategory } from "./mapping";
import { emptyOverrides } from "./storage";
import type { CachedCategory, Marker, PlanOverrides } from "./types";

const MARKERS: Marker[] = [
  { bucket: "ignore", patterns: ["[CSP-Ignore]"] },
  { bucket: "fixed", patterns: ["[CSP-Fixed]", "Fixed Expenses", "Fixed Costs"] },
  { bucket: "guilt_free", patterns: ["[CSP-GuiltFree]", "Guilt-Free"] },
  { bucket: "investments", patterns: ["[CSP-Investments]", "Investments", "📈"] },
  { bucket: "savings", patterns: ["[CSP-Savings]", "Savings", "💰"] },
];

function cat(
  partial: Partial<CachedCategory> & Pick<CachedCategory, "id" | "name">,
): CachedCategory {
  return {
    groupId: "g",
    groupName: "Everyday",
    note: "",
    hidden: false,
    internal: false,
    deleted: false,
    ...partial,
  };
}

function resolve(
  partial: Partial<CachedCategory> & Pick<CachedCategory, "id" | "name">,
  overrides: PlanOverrides = emptyOverrides(),
  ignoreHidden = true,
) {
  return resolveCategory(cat(partial), MARKERS, overrides, ignoreHidden);
}

test("first marker wins; name and note beat group", () => {
  expect(resolve({ id: "1", name: "Rent [CSP-Ignore] [CSP-Fixed]" }).bucket).toBe(
    "ignore",
  );
  expect(resolve({ id: "2", name: "Rent", note: "[CSP-Savings]" }).bucket).toBe(
    "savings",
  );
  expect(
    resolve({ id: "3", name: "Rent", groupName: "Fixed Costs" }).bucket,
  ).toBe("fixed");
  expect(
    resolve({
      id: "4",
      name: "[CSP-Savings] Broker",
      groupName: "Fixed Costs",
    }).bucket,
  ).toBe("savings");
});

test("markers match case-insensitively; empty pattern never hits", () => {
  expect(resolve({ id: "1", name: "fixed costs" }).bucket).toBe("fixed");
  const marked = resolveCategory(
    cat({ id: "2", name: "abc" }),
    [{ bucket: "fixed", patterns: ["", "nope"] }],
    emptyOverrides(),
  );
  expect(marked.bucket).toBe("unmapped");
});

test("hidden, internal, deleted, inflow, and credit-card groups are ignored", () => {
  expect(resolve({ id: "1", name: "Rent", hidden: true }).bucket).toBe("ignore");
  expect(resolve({ id: "2", name: "Rent", internal: true }).bucket).toBe(
    "ignore",
  );
  expect(resolve({ id: "3", name: "Rent", deleted: true }).bucket).toBe(
    "ignore",
  );
  expect(resolve({ id: "4", name: "Inflow: Ready to Assign" }).bucket).toBe(
    "ignore",
  );
  expect(
    resolve({
      id: "5",
      name: "Visa",
      groupName: "Credit Card Payments",
    }).bucket,
  ).toBe("ignore");
});

test("hidden cats map when ignoreHidden is off", () => {
  expect(
    resolve({ id: "1", name: "Rent [CSP-Fixed]", hidden: true }, emptyOverrides(), false)
      .bucket,
  ).toBe("fixed");
});

test("override beats group beats marker", () => {
  const group: PlanOverrides = {
    ...emptyOverrides(),
    groups: { g: "savings" },
  };
  expect(resolve({ id: "1", name: "Rent [CSP-Fixed]" }, group).bucket).toBe(
    "savings",
  );
  expect(resolve({ id: "1", name: "Rent [CSP-Fixed]" }, group).source).toBe(
    "group",
  );
  const both: PlanOverrides = {
    ...group,
    buckets: { "1": "guilt_free" },
  };
  expect(resolve({ id: "1", name: "Rent [CSP-Fixed]" }, both).bucket).toBe(
    "guilt_free",
  );
  expect(resolve({ id: "1", name: "Rent [CSP-Fixed]" }, both).source).toBe(
    "override",
  );
});

test("hidden cats do not inherit group overrides", () => {
  const group: PlanOverrides = {
    ...emptyOverrides(),
    groups: { g: "savings" },
  };
  const hidden = resolve({ id: "1", name: "Old", hidden: true }, group);
  expect(hidden.bucket).toBe("ignore");
  expect(hidden.source).toBe("hidden");
});

test("metricFor: per-category, then bucket, then default", () => {
  expect(metricFor("c", "fixed", emptyOverrides())).toBe("spent");
  expect(metricFor("c", "savings", emptyOverrides())).toBe("assigned");
  expect(
    metricFor("c", "fixed", {
      ...emptyOverrides(),
      bucketMetrics: { fixed: "assigned" },
    }),
  ).toBe("assigned");
  expect(
    metricFor("c", "fixed", {
      ...emptyOverrides(),
      bucketMetrics: { fixed: "assigned" },
      metrics: { c: "spent" },
    }),
  ).toBe("spent");
  expect(metricFor("c", "unmapped", emptyOverrides())).toBe("assigned");
});
