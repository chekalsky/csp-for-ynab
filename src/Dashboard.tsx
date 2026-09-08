import { useEffect, useMemo, useState } from "react";
import { LineChart, StackedBars } from "./charts";
import { formatMoney, formatPct, monthFull, monthLabel } from "./format";
import {
  bucketsTotal,
  meanBuckets,
  monthSeries,
  rangeTotals,
  visibleAmount,
} from "./metrics";
import { type ResolvedCategory } from "./mapping";
import { inputToMonth, monthToInput, RANGE_PRESETS, spansYears } from "./range";
import { getExcludeInvestments, setExcludeInvestments } from "./storage";
import { Tagging } from "./Tagging";
import {
  BUCKET_LABEL,
  LIFESTYLE_SHOWN,
  SHOWN_BUCKETS,
  type CachedMonth,
  type CachedPlan,
  type DateRange,
  type DateRangeId,
  type PlanOverrides,
  type ShownBucket,
} from "./types";

const COLORS: Record<ShownBucket, string> = {
  fixed: "#2a4a5f",
  investments: "#1a6758",
  savings: "#4c733d",
  guilt_free: "#c24e1f",
  unmapped: "#6b3fa0",
};

export function Dashboard(props: {
  plan: CachedPlan;
  categories: ResolvedCategory[];
  months: CachedMonth[];
  monthIds: string[];
  range: DateRange;
  onRange: (range: DateRange) => void;
  fetchingMore: boolean;
  overrides: PlanOverrides;
  onOverrides: (next: PlanOverrides) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const {
    plan,
    categories,
    months,
    monthIds,
    range,
    onRange,
    fetchingMore,
    overrides,
    onOverrides,
    onRefresh,
    refreshing,
  } = props;
  const [excludeInvestments, setExclude] = useState(getExcludeInvestments);
  const shownBuckets = excludeInvestments ? LIFESTYLE_SHOWN : SHOWN_BUCKETS;
  const chartCategories = categories.filter((c) => {
    if (c.bucket === "ignore") return false;
    if (excludeInvestments && c.bucket === "investments") return false;
    return true;
  });
  const money = (n: number, digits = 0) => formatMoney(n, plan.currency, digits);
  const withYear = spansYears(months);
  const labels = months.map((m) => monthLabel(m.month, withYear));
  const series = useMemo(
    () => monthSeries(months, chartCategories),
    [months, chartCategories],
  );
  const ytd = rangeTotals(months, chartCategories);
  const total = bucketsTotal(ytd, shownBuckets);
  const avg = meanBuckets(series, shownBuckets);
  const unmapped = categories.filter((c) => c.bucket === "unmapped").length;
  const [monthId, setMonthId] = useState(
    () => months[months.length - 1]?.month ?? "",
  );
  useEffect(() => {
    if (!months.some((m) => m.month === monthId)) {
      setMonthId(months[months.length - 1]?.month ?? "");
    }
  }, [months, monthId]);
  const month = months.find((m) => m.month === monthId) ?? months[months.length - 1];
  const chartSeries = shownBuckets.map((id) => ({
    id,
    name: BUCKET_LABEL[id],
    color: COLORS[id],
    data: series.map((row) => row.buckets[id]),
  }));

  function toggleInvestments(checked: boolean) {
    setExclude(checked);
    setExcludeInvestments(checked);
  }

  function pickRange(id: DateRangeId) {
    if (id === "custom") {
      const to = monthIds[monthIds.length - 1];
      const from = monthIds[Math.max(0, monthIds.length - 12)] ?? to;
      onRange({ id, from, to });
      return;
    }
    onRange({ id });
  }

  return (
    <div className="dash">
      <div className="toolbar">
        <div className="range-block">
          <div className="chips" role="group" aria-label="Date range">
            {RANGE_PRESETS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={range.id === id ? "chip on" : "chip"}
                onClick={() => pickRange(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {range.id === "custom" && (
            <div className="custom-range">
              <label>
                From
                <input
                  type="month"
                  value={monthToInput(range.from ?? monthIds[0] ?? "")}
                  min={monthToInput(monthIds[0] ?? "")}
                  max={monthToInput(monthIds[monthIds.length - 1] ?? "")}
                  onChange={(e) =>
                    onRange({
                      id: "custom",
                      from: inputToMonth(e.target.value),
                      to: range.to ?? monthIds[monthIds.length - 1],
                    })
                  }
                />
              </label>
              <label>
                To
                <input
                  type="month"
                  value={monthToInput(range.to ?? monthIds[monthIds.length - 1] ?? "")}
                  min={monthToInput(monthIds[0] ?? "")}
                  max={monthToInput(monthIds[monthIds.length - 1] ?? "")}
                  onChange={(e) =>
                    onRange({
                      id: "custom",
                      from: range.from ?? monthIds[0],
                      to: inputToMonth(e.target.value),
                    })
                  }
                />
              </label>
            </div>
          )}
        </div>
        <div className="toolbar-right">
          <label className="check">
            <input
              type="checkbox"
              checked={excludeInvestments}
              onChange={(e) => toggleInvestments(e.target.checked)}
            />
            Exclude investments
          </label>
          {fetchingMore && <span className="muted">Loading months…</span>}
          <button type="button" className="text-btn" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {unmapped > 0 && (
        <a className="banner" href="#tagging">
          {unmapped} {unmapped === 1 ? "category needs" : "categories need"} a bucket
        </a>
      )}

      {months.length === 0 && (
        <p className="lede">No months in this range yet.</p>
      )}

      <section>
        <h1>The mix</h1>
        <p className="lede">
          Every category except Ignore. Untagged ones sit in Needs a bucket until
          you map them. Assigned or Spent follows the tags below.
        </p>
        <div className="stats">
          <Stat value={money(total)} label="Total in range" />
          {shownBuckets.map((bucket) => (
            <Stat
              key={bucket}
              value={money(ytd[bucket])}
              label={`${BUCKET_LABEL[bucket]} · ${formatPct(ytd[bucket], total)}`}
              tone={
                bucket === "guilt_free"
                  ? "guilt"
                  : bucket === "unmapped"
                    ? "unmapped"
                    : bucket
              }
            />
          ))}
        </div>
        <StackedBars
          labels={labels}
          series={chartSeries}
          formatValue={(n) => money(n)}
          reference={
            avg
              ? { value: avg, label: `Avg ${money(avg)}` }
              : undefined
          }
        />
      </section>

      <section>
        <h2>Mix of the month</h2>
        <p className="lede">Share of each month, 100% stacked.</p>
        <StackedBars
          labels={labels}
          series={chartSeries}
          formatValue={(n) => money(n)}
          normalized
          height={220}
        />
      </section>

      <section>
        <h2>Spending over time</h2>
        <p className="lede">Fixed, guilt-free, and anything still untagged.</p>
        <LineChart
          labels={labels}
          series={[
            {
              id: "fixed",
              name: "Fixed",
              color: COLORS.fixed,
              data: months.map((m) =>
                sumActivity(m, chartCategories, "fixed"),
              ),
            },
            {
              id: "guilt_free",
              name: "Guilt-free",
              color: COLORS.guilt_free,
              data: months.map((m) =>
                sumActivity(m, chartCategories, "guilt_free"),
              ),
            },
            {
              id: "unmapped",
              name: BUCKET_LABEL.unmapped,
              color: COLORS.unmapped,
              data: series.map((row) => row.buckets.unmapped),
            },
          ]}
          formatValue={(n) => money(n)}
        />
      </section>

      {month && (
        <MonthDrill
          month={month}
          months={months}
          categories={chartCategories}
          buckets={shownBuckets}
          money={money}
          monthId={month.month}
          onMonth={setMonthId}
        />
      )}

      <Tagging
        categories={categories}
        overrides={overrides}
        onChange={onOverrides}
      />
    </div>
  );
}

function Stat(props: { value: string; label: string; tone?: string }) {
  return (
    <div className={`stat ${props.tone ? `stat-${props.tone}` : ""}`}>
      <div className="stat-value">{props.value}</div>
      <div className="stat-label">{props.label}</div>
    </div>
  );
}

function sumActivity(
  month: CachedMonth,
  categories: ResolvedCategory[],
  bucket: ShownBucket,
): number {
  let n = 0;
  for (const cat of categories) {
    if (cat.bucket !== bucket) continue;
    n += -(month.amounts[cat.id]?.activity ?? 0);
  }
  return n;
}

function MonthDrill(props: {
  month: CachedMonth;
  months: CachedMonth[];
  categories: ResolvedCategory[];
  buckets: ShownBucket[];
  money: (n: number, digits?: number) => string;
  monthId: string;
  onMonth: (id: string) => void;
}) {
  const { month, months, categories, buckets, money, onMonth } = props;
  const rows = buckets.map((bucket) => {
    const cats = categories
      .filter((c) => c.bucket === bucket)
      .map((c) => {
        const amt = month.amounts[c.id] ?? { budgeted: 0, activity: 0 };
        const value = visibleAmount(
          bucket,
          amt.budgeted,
          amt.activity,
          c.metric,
        );
        return { ...c, value };
      })
      .filter((c) => c.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const total = cats.reduce((s, c) => s + c.value, 0);
    return { bucket, cats, total };
  });
  const life = rows.reduce((s, r) => s + r.total, 0);

  return (
    <section>
      <header className="panel-head">
        <h2>Month</h2>
        <label className="month-pick">
          <span className="sr-only">Month</span>
          <select value={month.month} onChange={(e) => onMonth(e.target.value)}>
            {months.map((m) => (
              <option key={m.month} value={m.month}>
                {monthFull(m.month)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="stats">
        {rows.map((r) => (
          <Stat
            key={r.bucket}
            value={money(r.total, 2)}
            label={`${BUCKET_LABEL[r.bucket]} · ${formatPct(r.total, life)}`}
            tone={
              r.bucket === "guilt_free"
                ? "guilt"
                : r.bucket === "unmapped"
                  ? "unmapped"
                  : r.bucket
            }
          />
        ))}
      </div>
      {rows
        .filter((r) => r.cats.length > 0)
        .map((r) => (
        <div key={r.bucket} className="group-block">
          <h3>
            {BUCKET_LABEL[r.bucket]} — {money(r.total, 2)}
          </h3>
          <table className="cat-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Category</th>
                <th>Metric</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {r.cats.map((c) => (
                <tr key={c.id}>
                  <td>{c.groupName}</td>
                  <td>{c.name}</td>
                  <td>
                    {c.bucket === "unmapped"
                      ? "Assigned or Spent"
                      : c.metric === "assigned"
                        ? "Assigned"
                        : "Spent"}
                  </td>
                  <td className="num">{money(c.value, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
