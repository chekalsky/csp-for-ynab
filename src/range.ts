import type { CachedMonth, DateRange } from "./types";

export function utcMonthStart(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function lastLiveMonth(monthIds: string[], now = new Date()): string {
  const current = utcMonthStart(now);
  const last = monthIds[monthIds.length - 1] ?? current;
  return last < current ? last : current;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

export function monthToInput(month: string): string {
  return month.slice(0, 7);
}

export function inputToMonth(value: string): string {
  if (/^\d{4}-\d{2}-01$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  return value;
}

export function rangeBounds(
  range: DateRange,
  monthIds: string[],
  now = new Date(),
): { start: string; end: string } | null {
  const current = utcMonthStart(now);
  const first = monthIds[0];
  const endCap = lastLiveMonth(monthIds, now);

  switch (range.id) {
    case "all":
      return { start: first ?? current, end: endCap };
    case "this_year": {
      const start = `${now.getUTCFullYear()}-01-01`;
      return { start, end: endCap };
    }
    case "year": {
      const y = range.year ?? now.getUTCFullYear() - 1;
      return { start: `${y}-01-01`, end: `${y}-12-01` };
    }
    case "last_3":
      return { start: shiftMonth(current, -2), end: endCap };
    case "last_6":
      return { start: shiftMonth(current, -5), end: endCap };
    case "last_12":
      return { start: shiftMonth(current, -11), end: endCap };
    case "last_24":
      return { start: shiftMonth(current, -23), end: endCap };
    case "custom": {
      let start = inputToMonth(range.from ?? first ?? current);
      let end = inputToMonth(range.to ?? endCap);
      if (start > end) [start, end] = [end, start];
      if (end > endCap) end = endCap;
      return { start, end };
    }
    default:
      return null;
  }
}

export function monthIdsInRange(
  monthIds: string[],
  range: DateRange,
  now = new Date(),
): string[] {
  const sorted = [...monthIds].sort();
  const bounds = rangeBounds(range, sorted, now);
  if (!bounds) return sorted;
  return sorted.filter((id) => id >= bounds.start && id <= bounds.end);
}

export function cachedMonthIds(months: CachedMonth[]): Set<string> {
  return new Set(
    months.filter((m) => Object.keys(m.amounts).length > 0).map((m) => m.month),
  );
}

export function rangeComplete(
  monthIds: string[],
  months: CachedMonth[],
  range: DateRange,
  now = new Date(),
): boolean {
  const needed = monthIdsInRange(monthIds, range, now);
  if (needed.length === 0) return false;
  const have = cachedMonthIds(months);
  return needed.every((id) => have.has(id));
}

export function filterMonths(
  months: CachedMonth[],
  range: DateRange,
  monthIds: string[] = months.map((m) => m.month),
  now = new Date(),
): CachedMonth[] {
  const live = months.filter((m) => !m.deleted).sort((a, b) => a.month.localeCompare(b.month));
  const allowed = new Set(monthIdsInRange(monthIds, range, now));
  return live.filter((m) => allowed.has(m.month));
}

export function spansYears(months: CachedMonth[]): boolean {
  const years = new Set(months.map((m) => m.month.slice(0, 4)));
  return years.size > 1;
}

export function pastYears(monthIds: string[], now = new Date()): number[] {
  const current = now.getUTCFullYear();
  const years = new Set<number>();
  for (const id of monthIds) {
    const y = Number(id.slice(0, 4));
    if (y > 0 && y < current) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export const RANGE_PRESETS: Array<{ id: DateRange["id"]; label: string }> = [
  { id: "this_year", label: "This year" },
  { id: "year", label: "Year" },
  { id: "last_3", label: "3 months" },
  { id: "last_6", label: "6 months" },
  { id: "last_12", label: "12 months" },
  { id: "last_24", label: "24 months" },
  { id: "all", label: "All" },
  { id: "custom", label: "Custom" },
];
