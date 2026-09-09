import { expect, test } from "vitest";
import {
  filterMonths,
  monthIdsInRange,
  rangeBounds,
  rangeComplete,
  shiftMonth,
} from "./range";
import type { CachedMonth } from "./types";

const NOW = new Date("2026-09-09T12:00:00Z");
const IDS = [
  "2025-11-01",
  "2025-12-01",
  "2026-01-01",
  "2026-07-01",
  "2026-08-01",
  "2026-09-01",
  "2026-10-01",
];

function month(id: string, amounts: CachedMonth["amounts"] = { x: { budgeted: 1, activity: 0 } }): CachedMonth {
  return { month: id, deleted: false, amounts };
}

test("last_n is an inclusive window capped at the current month", () => {
  expect(rangeBounds({ id: "last_3" }, IDS, NOW)).toEqual({
    start: "2026-07-01",
    end: "2026-09-01",
  });
  expect(monthIdsInRange(IDS, { id: "last_3" }, NOW)).toEqual([
    "2026-07-01",
    "2026-08-01",
    "2026-09-01",
  ]);
  expect(shiftMonth("2026-01-01", -1)).toBe("2025-12-01");
});

test("this_year and all stop at the current month, not future plan months", () => {
  expect(rangeBounds({ id: "this_year" }, IDS, NOW)).toEqual({
    start: "2026-01-01",
    end: "2026-09-01",
  });
  expect(rangeBounds({ id: "all" }, IDS, NOW)).toEqual({
    start: "2025-11-01",
    end: "2026-09-01",
  });
  expect(rangeBounds({ id: "year", year: 2025 }, IDS, NOW)).toEqual({
    start: "2025-01-01",
    end: "2025-12-01",
  });
});

test("custom swaps from/to when inverted", () => {
  expect(
    rangeBounds({ id: "custom", from: "2026-08-01", to: "2026-01-01" }, IDS, NOW),
  ).toEqual({ start: "2026-01-01", end: "2026-08-01" });
});

test("filterMonths drops deleted rows", () => {
  const months: CachedMonth[] = [
    month("2026-07-01"),
    { month: "2026-08-01", deleted: true, amounts: { x: { budgeted: 1, activity: 0 } } },
    month("2026-09-01"),
  ];
  expect(filterMonths(months, { id: "last_3" }, IDS, NOW).map((m) => m.month)).toEqual([
    "2026-07-01",
    "2026-09-01",
  ]);
});

test("rangeComplete is false when a needed month has no amounts, or none are needed", () => {
  const months = [month("2026-07-01"), month("2026-08-01", {}), month("2026-09-01")];
  expect(rangeComplete(IDS, months, { id: "last_3" }, NOW)).toBe(false);
  expect(
    rangeComplete(
      IDS,
      [month("2026-07-01"), month("2026-08-01"), month("2026-09-01")],
      { id: "last_3" },
      NOW,
    ),
  ).toBe(true);
  expect(rangeComplete([], [], { id: "last_3" }, NOW)).toBe(false);
});
