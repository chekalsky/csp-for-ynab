export type BucketId =
  | "fixed"
  | "investments"
  | "savings"
  | "guilt_free"
  | "ignore"
  | "unmapped";

export type ChartBucket = "fixed" | "investments" | "savings" | "guilt_free";

export type ShownBucket = ChartBucket | "unmapped";

export type Metric = "assigned" | "spent";

export type Marker = {
  bucket: Exclude<BucketId, "unmapped">;
  patterns: string[];
};

export type AppConfig = {
  ynabClientId: string;
  redirectUri: string;
  markers: Marker[];
};

export type CurrencyFormat = {
  iso_code: string;
  example_format: string;
  decimal_digits: number;
  decimal_separator: string;
  symbol_first: boolean;
  group_separator: string;
  currency_symbol: string;
  display_symbol: boolean;
};

export type PlanSummary = {
  id: string;
  name: string;
  first_month?: string;
  last_month?: string;
  currency_format: CurrencyFormat | null;
};

export type CachedCategory = {
  id: string;
  name: string;
  groupId: string;
  groupName: string;
  note: string;
  hidden: boolean;
  internal: boolean;
  deleted: boolean;
};

export type MonthAmounts = Record<string, { budgeted: number; activity: number }>;

export type CachedMonth = {
  month: string;
  deleted: boolean;
  amounts: MonthAmounts;
};

export type CachedPlan = {
  planId: string;
  planName: string;
  currency: CurrencyFormat;
  fetchedAt: number;
  categories: CachedCategory[];
  months: CachedMonth[];
  monthIds: string[];
};

export type TokenRecord = {
  accessToken: string;
  expiresAt: number;
};

export type PlanOverrides = {
  buckets: Record<string, BucketId>;
  groups: Record<string, BucketId>;
  metrics: Record<string, Metric>;
  bucketMetrics: Partial<Record<ChartBucket, Metric>>;
};

export type DateRangeId =
  | "this_year"
  | "last_year"
  | "last_3"
  | "last_6"
  | "last_12"
  | "last_24"
  | "all"
  | "custom";

export type DateRange = {
  id: DateRangeId;
  from?: string;
  to?: string;
};

export const CHART_BUCKETS: ChartBucket[] = [
  "fixed",
  "investments",
  "savings",
  "guilt_free",
];

export const LIFESTYLE_BUCKETS: ChartBucket[] = [
  "fixed",
  "savings",
  "guilt_free",
];

export const SHOWN_BUCKETS: ShownBucket[] = [
  ...CHART_BUCKETS,
  "unmapped",
];

export const LIFESTYLE_SHOWN: ShownBucket[] = [
  ...LIFESTYLE_BUCKETS,
  "unmapped",
];

export const DEFAULT_METRIC: Record<ChartBucket, Metric> = {
  fixed: "spent",
  investments: "assigned",
  savings: "assigned",
  guilt_free: "spent",
};

export const BUCKET_LABEL: Record<BucketId, string> = {
  fixed: "Fixed Costs",
  investments: "Investments",
  savings: "Savings",
  guilt_free: "Guilt-free spending",
  ignore: "Ignore",
  unmapped: "Needs a bucket",
};

export const PLACEHOLDER_CLIENT_ID = "YOUR_PUBLIC_CLIENT_ID";
