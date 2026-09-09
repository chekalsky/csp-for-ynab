import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LineChart, PieChart, StackedBars } from "./charts";
import { formatCompact, formatMoney, formatPct, monthFull, monthLabel, monthSpanLabel } from "./format";
import {
  bucketsTotal,
  monthSeries,
  rangeTotals,
  visibleAmount,
} from "./metrics";
import { resolveCategory, type ResolvedCategory } from "./mapping";
import { inputToMonth, lastLiveMonth, monthToInput, pastYears, RANGE_PRESETS, rangeComplete, spansYears, utcMonthStart } from "./range";
import {
  getExcludeCurrentMonth,
  getExcludeInvestments,
  getIgnoreHidden,
  getShowIgnored,
  setExcludeCurrentMonth,
  setExcludeInvestments,
  setIgnoreHidden,
  setShowIgnored,
} from "./storage";
import { Tagging } from "./Tagging";
import { Loader } from "./pages";
import {
  BUCKET_LABEL,
  DEFAULT_METRIC,
  SHOWN_BUCKETS,
  type CachedMonth,
  type CachedPlan,
  type DateRange,
  type DateRangeId,
  type Marker,
  type PlanOverrides,
  type ShownBucket,
} from "./types";

const COLORS: Record<ShownBucket, string> = {
  fixed: "#2a4a5f",
  investments: "#1a6758",
  savings: "#4c733d",
  guilt_free: "#c24e1f",
  unmapped: "#6b3fa0",
  ignore: "#6a7a72",
};

export function Dashboard(props: {
  plan: CachedPlan;
  markers: Marker[];
  months: CachedMonth[];
  monthIds: string[];
  range: DateRange;
  onRange: (range: DateRange) => void;
  fetchingMore: boolean;
  rangeReady: boolean;
  rangeMessage: string | null;
  error: string | null;
  rateLimited: boolean;
  overrides: PlanOverrides;
  onOverrides: (next: PlanOverrides) => void;
}) {
  const {
    plan,
    markers,
    months: rangeMonths,
    monthIds,
    range,
    onRange,
    fetchingMore,
    rangeReady,
    rangeMessage,
    error,
    rateLimited,
    overrides,
    onOverrides,
  } = props;
  const [excludeInvestments, setExclude] = useState(getExcludeInvestments);
  const [excludeCurrentMonth, setExcludeCurrent] = useState(getExcludeCurrentMonth);
  const [ignoreHidden, setIgnoreHiddenState] = useState(getIgnoreHidden);
  const [showIgnored, setShowIgnoredState] = useState(getShowIgnored);
  const [hideAmounts, setHideAmounts] = useState(false);
  const categories = useMemo(
    () =>
      plan.categories.map((c) =>
        resolveCategory(c, markers, overrides, ignoreHidden),
      ),
    [plan.categories, markers, overrides, ignoreHidden],
  );
  const months = excludeCurrentMonth
    ? rangeMonths.filter((m) => m.month !== utcMonthStart())
    : rangeMonths;
  const chartCategories = categories.filter((c) => {
    if (c.bucket === "ignore" && !showIgnored) return false;
    if (excludeInvestments && c.bucket === "investments") return false;
    return true;
  });
  const money = (n: number) => formatMoney(n, plan.currency);
  const mixMoney = (n: number) => (hideAmounts ? "****" : money(n));
  const withYear = spansYears(months);
  const labels = months.map((m) => monthLabel(m.month, withYear));
  const series = useMemo(
    () => monthSeries(months, chartCategories),
    [months, chartCategories],
  );
  const ytd = rangeTotals(months, chartCategories);
  const mixBuckets = SHOWN_BUCKETS.filter((bucket) => {
    if (excludeInvestments && bucket === "investments") return false;
    if (bucket === "unmapped") return ytd.unmapped !== 0;
    if (bucket === "ignore") return showIgnored && ytd.ignore !== 0;
    return true;
  });
  const total = bucketsTotal(ytd, mixBuckets);
  const unmapped = categories.filter((c) => c.bucket === "unmapped").length;
  const mixDates =
    months.length > 0
      ? monthSpanLabel(months[0].month, months[months.length - 1].month)
      : "";
  const tagAnchor = useRef<{ el: HTMLElement; top: number } | null>(null);
  const [monthId, setMonthId] = useState(
    () => months[months.length - 1]?.month ?? "",
  );

  function saveOverrides(next: PlanOverrides) {
    const el = document.activeElement;
    if (el instanceof HTMLElement && el.closest("#tagging")) {
      tagAnchor.current = { el, top: el.getBoundingClientRect().top };
    }
    onOverrides(next);
  }

  useLayoutEffect(() => {
    const lock = tagAnchor.current;
    if (!lock) return;
    tagAnchor.current = null;
    if (!lock.el.isConnected) return;
    const delta = lock.el.getBoundingClientRect().top - lock.top;
    if (Math.abs(delta) >= 1) window.scrollBy(0, delta);
  }, [overrides]);
  useEffect(() => {
    if (!months.some((m) => m.month === monthId)) {
      setMonthId(months[months.length - 1]?.month ?? "");
    }
  }, [months, monthId]);
  const month = months.find((m) => m.month === monthId) ?? months[months.length - 1];
  const liveTo = lastLiveMonth(monthIds);
  const chartSeries = mixBuckets.map((id) => ({
    id,
    name: BUCKET_LABEL[id],
    color: COLORS[id],
    data: series.map((row) => row.buckets[id]),
  }));

  function toggleInvestments(checked: boolean) {
    setExclude(checked);
    setExcludeInvestments(checked);
  }

  function toggleCurrentMonth(checked: boolean) {
    setExcludeCurrent(checked);
    setExcludeCurrentMonth(checked);
  }

  function toggleIgnoreHidden(checked: boolean) {
    setIgnoreHiddenState(checked);
    setIgnoreHidden(checked);
  }

  function toggleShowIgnored(checked: boolean) {
    setShowIgnoredState(checked);
    setShowIgnored(checked);
  }

  function pickRange(id: DateRangeId) {
    if (id === "custom") {
      const to = lastLiveMonth(monthIds);
      const live = monthIds.filter((month) => month <= to);
      const from = live[Math.max(0, live.length - 12)] ?? to;
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
            {RANGE_PRESETS.map(({ id, label }) => {
              if (id === "year") {
                const years = pastYears(monthIds);
                if (years.length === 0) return null;
                const selected =
                  range.id === "year" && years.includes(range.year ?? 0);
                return (
                  <select
                    key={id}
                    className={selected ? "chip-select on" : "chip-select"}
                    aria-label="Year"
                    value={selected ? String(range.year) : ""}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      if (!y) return;
                      onRange({ id: "year", year: y });
                    }}
                  >
                    <option value="" disabled>
                      Year
                    </option>
                    {years.map((y) => {
                      const cached = rangeComplete(monthIds, plan.months, {
                        id: "year",
                        year: y,
                      });
                      const isOn = range.id === "year" && range.year === y;
                      return (
                        <option
                          key={y}
                          value={y}
                          disabled={!cached && !isOn && rateLimited}
                        >
                          {y}
                        </option>
                      );
                    })}
                  </select>
                );
              }
              const cached =
                id === "custom" || rangeComplete(monthIds, plan.months, { id });
              return (
                <button
                  key={id}
                  type="button"
                  className={range.id === id ? "chip on" : "chip"}
                  disabled={!cached && range.id !== id && rateLimited}
                  onClick={() => pickRange(id)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {range.id === "custom" && (
            <div className="custom-range">
              <label>
                From
                <input
                  type="month"
                  value={monthToInput(range.from ?? monthIds[0] ?? "")}
                  min={monthToInput(monthIds[0] ?? "")}
                  max={monthToInput(liveTo)}
                  onChange={(e) =>
                    onRange({
                      id: "custom",
                      from: inputToMonth(e.target.value),
                      to: range.to && range.to <= liveTo ? range.to : liveTo,
                    })
                  }
                />
              </label>
              <label>
                To
                <input
                  type="month"
                  value={monthToInput(
                    range.to && range.to <= liveTo ? range.to : liveTo,
                  )}
                  min={monthToInput(monthIds[0] ?? "")}
                  max={monthToInput(liveTo)}
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
              checked={excludeCurrentMonth}
              onChange={(e) => toggleCurrentMonth(e.target.checked)}
            />
            Exclude current month
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={ignoreHidden}
              onChange={(e) => toggleIgnoreHidden(e.target.checked)}
            />
            Ignore hidden
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={excludeInvestments}
              onChange={(e) => toggleInvestments(e.target.checked)}
            />
            Hide investments
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={showIgnored}
              onChange={(e) => toggleShowIgnored(e.target.checked)}
            />
            Show ignored
          </label>
        </div>
        {(error || rangeMessage || (rangeReady && unmapped > 0)) && (
          <div className="notices">
            {error && <p className="banner err">{error}</p>}
            {rangeMessage && <p className="banner err">{rangeMessage}</p>}
            {rangeReady && unmapped > 0 && (
              <a className="banner" href="#tagging">
                {unmapped} {unmapped === 1 ? "category needs" : "categories need"} a bucket
              </a>
            )}
          </div>
        )}
      </div>

      {fetchingMore || (!rangeReady && !error && !rangeMessage) ? (
        <Loader fill label="Loading months…" />
      ) : null}

      {rangeReady && months.length === 0 && (
        <p className="lede">No months in this range yet.</p>
      )}

      {rangeReady && (
        <>
      <section>
        <header className="panel-head mix-head">
          <h1>Your Conscious Spending</h1>
          <button
            type="button"
            className="icon-btn"
            aria-pressed={hideAmounts}
            aria-label={hideAmounts ? "Show amounts" : "Hide amounts"}
            onClick={() => setHideAmounts((v) => !v)}
          >
            <EyeIcon slash={hideAmounts} />
          </button>
        </header>
        {mixDates && <p className="mix-dates">{mixDates}</p>}
        <p className="lede">
          {ytd.unmapped !== 0
            ? "Untagged categories sit in \"Needs a bucket\" until you map them."
            : ""}{" "}
          You can set up whether to use Money Assigned or Money Spent below.
        </p>
        {months.length > 0 && (
          <div className="mix-layout">
            <div className="mix-buckets">
              {mixBuckets.map((bucket) => (
                <div
                  key={bucket}
                  className={`mix-row stat-${
                    bucket === "guilt_free"
                      ? "guilt"
                      : bucket === "unmapped"
                        ? "unmapped"
                        : bucket
                  }`}
                >
                  <i className={`swatch swatch-${bucket}`} aria-hidden />
                  <div>
                    <strong>{BUCKET_LABEL[bucket]}</strong>
                    <div className="mix-amt">{mixMoney(ytd[bucket])}</div>
                    <div className="mix-meta">
                      {formatPct(ytd[bucket], total)} ·{" "}
                      {mixMetric(bucket, chartCategories)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <PieChart
              slices={mixBuckets.map((id) => ({
                id,
                name: BUCKET_LABEL[id],
                color: COLORS[id],
                value: ytd[id],
              }))}
              formatValue={mixMoney}
              formatShare={formatPct}
              center={mixMoney(total)}
              centerLabel="in this range"
            />
          </div>
        )}
      </section>

      <section>
        <h2>Mix of the month</h2>
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
        <LineChart
          labels={labels}
          series={chartSeries}
          formatValue={(n) => money(n)}
          formatTick={(n) => formatCompact(n, plan.currency)}
        />
      </section>

      {month && (
        <MonthDrill
          month={month}
          months={months}
          categories={chartCategories}
          buckets={mixBuckets}
          money={money}
          monthId={month.month}
          onMonth={setMonthId}
        />
      )}

      <Tagging
        categories={categories}
        overrides={overrides}
        onChange={saveOverrides}
        markers={markers}
      />
        </>
      )}
    </div>
  );
}

function EyeIcon(props: { slash?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {props.slash ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

function mixMetric(
  bucket: ShownBucket,
  categories: ResolvedCategory[],
): string {
  if (bucket === "unmapped" || bucket === "ignore") return "Assigned or Spent";
  const used = new Set(
    categories.filter((c) => c.bucket === bucket).map((c) => c.metric),
  );
  if (used.size === 0) {
    return DEFAULT_METRIC[bucket] === "assigned" ? "Assigned" : "Spent";
  }
  const [only] = used;
  if (used.size > 1) return "Mixed";
  return only === "assigned" ? "Assigned" : "Spent";
}

function Stat(props: { value: string; label: string; tone?: string }) {
  return (
    <div className={`stat ${props.tone ? `stat-${props.tone}` : ""}`}>
      <div className="stat-value">{props.value}</div>
      <div className="stat-label">{props.label}</div>
    </div>
  );
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
            value={money(r.total)}
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
      {rows.some((r) => r.cats.length > 0) && (
        <div className="group-block">
          <table className="cat-table month-table">
            <colgroup>
              <col className="col-group" />
              <col />
              <col className="col-metric" />
              <col className="col-amt" />
            </colgroup>
            <thead>
              <tr>
                <th>Group</th>
                <th>Category</th>
                <th>Metric</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            {rows
              .filter((r) => r.cats.length > 0)
              .map((r) => (
                <tbody key={r.bucket}>
                  <tr className="bucket-row">
                    <th colSpan={4}>
                      {BUCKET_LABEL[r.bucket]} — {money(r.total)}
                    </th>
                  </tr>
                  {r.cats.map((c) => (
                    <tr key={c.id}>
                      <td>{c.groupName}</td>
                      <td className={c.hidden ? "is-hidden" : undefined}>{c.name}</td>
                      <td className="metric">
                        {c.bucket === "unmapped" || c.bucket === "ignore"
                          ? "Assigned or Spent"
                          : c.metric === "assigned"
                            ? "Assigned"
                            : "Spent"}
                      </td>
                      <td className="num">{money(c.value)}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
          </table>
        </div>
      )}
    </section>
  );
}
