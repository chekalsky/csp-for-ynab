import {
  DEFAULT_METRIC,
  type BucketId,
  type CachedCategory,
  type ChartBucket,
  type Marker,
  type Metric,
  type PlanOverrides,
  type ShownBucket,
} from "./types";

const INTERNAL_GROUPS = new Set(["Internal Master Category", "Credit Card Payments"]);

function haystack(value: string): string {
  return value.toLocaleLowerCase();
}

function matchesPattern(text: string, pattern: string): boolean {
  if (!pattern) return false;
  return haystack(text).includes(haystack(pattern));
}

function firstMarkerHit(texts: string[], markers: Marker[]): Marker["bucket"] | null {
  for (const marker of markers) {
    for (const pattern of marker.patterns) {
      if (texts.some((t) => matchesPattern(t, pattern))) return marker.bucket;
    }
  }
  return null;
}

function markerBucket(
  cat: CachedCategory,
  markers: Marker[],
  ignoreHidden: boolean,
): BucketId {
  if (cat.deleted) return "ignore";
  if (cat.internal) return "ignore";
  if (ignoreHidden && cat.hidden) return "ignore";
  if (INTERNAL_GROUPS.has(cat.groupName)) return "ignore";
  if (cat.name === "Inflow: Ready to Assign") return "ignore";

  const fromCategory = firstMarkerHit([cat.name, cat.note], markers);
  if (fromCategory) return fromCategory;
  const fromGroup = firstMarkerHit([cat.groupName], markers);
  if (fromGroup) return fromGroup;
  return "unmapped";
}

export type ResolvedCategory = CachedCategory & {
  bucket: BucketId;
  inferred: BucketId;
  inherited: BucketId;
  metric: Metric;
  source: "override" | "group" | "hidden" | "marker" | "unmapped";
};

export function resolveCategory(
  cat: CachedCategory,
  markers: Marker[],
  overrides: PlanOverrides,
  ignoreHidden = true,
): ResolvedCategory {
  const inferred = markerBucket(cat, markers, ignoreHidden);
  const locked = cat.internal || (ignoreHidden && cat.hidden);
  const groupOverride = locked ? undefined : overrides.groups[cat.groupId];
  const inherited = groupOverride ?? inferred;
  const catOverride = overrides.buckets[cat.id];
  const bucket = catOverride ?? inherited;
  const source = catOverride
    ? "override"
    : groupOverride
      ? "group"
      : inferred === "ignore" && (cat.hidden || cat.internal || INTERNAL_GROUPS.has(cat.groupName))
        ? "hidden"
        : inferred === "unmapped"
          ? "unmapped"
          : "marker";
  return {
    ...cat,
    bucket,
    inferred,
    inherited,
    metric: metricFor(cat.id, bucket, overrides),
    source,
  };
}

export function metricFor(
  categoryId: string,
  bucket: BucketId,
  overrides: PlanOverrides,
): Metric {
  const perCat = overrides.metrics[categoryId];
  if (perCat) return perCat;
  if (bucket === "fixed" || bucket === "investments" || bucket === "savings" || bucket === "guilt_free") {
    return overrides.bucketMetrics[bucket] ?? DEFAULT_METRIC[bucket];
  }
  return "assigned";
}

export function isChartBucket(bucket: BucketId): bucket is ChartBucket {
  return (
    bucket === "fixed" ||
    bucket === "investments" ||
    bucket === "savings" ||
    bucket === "guilt_free"
  );
}

export function isShownBucket(bucket: BucketId): bucket is ShownBucket {
  return (
    bucket === "fixed" ||
    bucket === "investments" ||
    bucket === "savings" ||
    bucket === "guilt_free" ||
    bucket === "unmapped" ||
    bucket === "ignore"
  );
}
