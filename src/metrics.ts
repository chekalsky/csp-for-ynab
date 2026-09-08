import { type CachedMonth, type Metric, type ShownBucket } from "./types";
import { isShownBucket, type ResolvedCategory } from "./mapping";

export function amountFor(
  budgeted: number,
  activity: number,
  metric: Metric,
): number {
  return metric === "assigned" ? budgeted : -activity;
}

/** Untagged cats use Assigned or Spent, whichever is larger, so they show up. */
export function visibleAmount(
  bucket: ShownBucket,
  budgeted: number,
  activity: number,
  metric: Metric,
): number {
  if (bucket === "unmapped") {
    return Math.max(budgeted, -activity, 0);
  }
  return amountFor(budgeted, activity, metric);
}

export type BucketTotals = Record<ShownBucket, number>;

export function emptyTotals(): BucketTotals {
  return { fixed: 0, investments: 0, savings: 0, guilt_free: 0, unmapped: 0 };
}

export function bucketsTotal(t: BucketTotals, keys: ShownBucket[]): number {
  return keys.reduce((sum, k) => sum + t[k], 0);
}

export type MonthSeries = {
  month: string;
  buckets: BucketTotals;
};

export function monthSeries(
  months: CachedMonth[],
  categories: ResolvedCategory[],
): MonthSeries[] {
  const mapped = categories.filter((c) => isShownBucket(c.bucket));
  return months.map((m) => {
    const buckets = emptyTotals();
    for (const cat of mapped) {
      if (!isShownBucket(cat.bucket)) continue;
      const row = m.amounts[cat.id] ?? { budgeted: 0, activity: 0 };
      buckets[cat.bucket] += visibleAmount(
        cat.bucket,
        row.budgeted,
        row.activity,
        cat.metric,
      );
    }
    return { month: m.month, buckets };
  });
}

export function rangeTotals(
  months: CachedMonth[],
  categories: ResolvedCategory[],
): BucketTotals {
  const buckets = emptyTotals();
  const mapped = categories.filter((c) => isShownBucket(c.bucket));
  for (const m of months) {
    for (const cat of mapped) {
      if (!isShownBucket(cat.bucket)) continue;
      const row = m.amounts[cat.id] ?? { budgeted: 0, activity: 0 };
      buckets[cat.bucket] += visibleAmount(
        cat.bucket,
        row.budgeted,
        row.activity,
        cat.metric,
      );
    }
  }
  return buckets;
}

export function meanBuckets(series: MonthSeries[], keys: ShownBucket[]): number {
  if (series.length === 0) return 0;
  return series.reduce((s, row) => s + bucketsTotal(row.buckets, keys), 0) / series.length;
}
