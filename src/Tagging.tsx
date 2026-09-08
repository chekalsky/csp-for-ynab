import {
  BUCKET_LABEL,
  CHART_BUCKETS,
  DEFAULT_METRIC,
  type BucketId,
  type ChartBucket,
  type Metric,
  type PlanOverrides,
} from "./types";
import { isShownBucket, type ResolvedCategory } from "./mapping";

const BUCKET_OPTIONS: BucketId[] = [
  "unmapped",
  "fixed",
  "investments",
  "savings",
  "guilt_free",
  "ignore",
];

export function Tagging(props: {
  categories: ResolvedCategory[];
  overrides: PlanOverrides;
  onChange: (next: PlanOverrides) => void;
}) {
  const { categories, overrides, onChange } = props;
  const visible = categories.filter((c) => !c.deleted);
  const groups = new Map<string, { name: string; cats: ResolvedCategory[] }>();
  for (const cat of visible) {
    const key = cat.groupId || cat.groupName;
    const g = groups.get(key) ?? { name: cat.groupName, cats: [] };
    g.cats.push(cat);
    groups.set(key, g);
  }

  function setBucket(id: string, value: string) {
    const buckets = { ...overrides.buckets };
    if (value === "auto") delete buckets[id];
    else buckets[id] = value as BucketId;
    onChange({ ...overrides, buckets });
  }

  function setGroupBucket(groupId: string, cats: ResolvedCategory[], value: string) {
    const groupMap = { ...overrides.groups };
    const buckets = { ...overrides.buckets };
    for (const cat of cats) delete buckets[cat.id];
    if (value === "auto") delete groupMap[groupId];
    else groupMap[groupId] = value as BucketId;
    onChange({ ...overrides, groups: groupMap, buckets });
  }

  function setMetric(id: string, metric: Metric) {
    onChange({
      ...overrides,
      metrics: { ...overrides.metrics, [id]: metric },
    });
  }

  function bulkMetric(bucket: ChartBucket, metric: Metric) {
    const metrics = { ...overrides.metrics };
    for (const cat of visible) {
      if (cat.bucket === bucket) metrics[cat.id] = metric;
    }
    onChange({
      ...overrides,
      metrics,
      bucketMetrics: { ...overrides.bucketMetrics, [bucket]: metric },
    });
  }

  const unmapped = visible.filter((c) => c.bucket === "unmapped").length;

  return (
    <section className="panel" id="tagging">
      <header className="panel-head">
        <div>
          <h2>Map categories</h2>
          <p className="lede">
            Set a whole YNAB group, then override a category if it does not
            belong with the rest. Markers in <code>config.json</code> guess a
            bucket. Overrides stay in this browser — nothing is written back to
            YNAB.
          </p>
        </div>
        {unmapped > 0 && (
          <span className="pill warn">
            {unmapped} need{unmapped === 1 ? "s" : ""} a bucket
          </span>
        )}
      </header>

      <div className="bulk-metrics">
        {CHART_BUCKETS.map((bucket) => {
          const metric = overrides.bucketMetrics[bucket] ?? DEFAULT_METRIC[bucket];
          return (
            <div key={bucket} className="bulk-row">
              <span className={`swatch swatch-${bucket}`} />
              <span>{BUCKET_LABEL[bucket]}</span>
              <Segmented
                value={metric}
                onChange={(v) => bulkMetric(bucket, v)}
              />
            </div>
          );
        })}
      </div>

      {[...groups.entries()].map(([groupId, group]) => {
        const groupValue = overrides.groups[groupId] ?? "auto";
        const mixed = new Set(group.cats.map((c) => c.bucket)).size > 1;
        const sample = group.cats[0];
        const autoLabel = mixed
          ? "mixed"
          : sample
            ? BUCKET_LABEL[sample.inherited]
            : "Needs a bucket";
        return (
          <div key={groupId} className="group-block">
            <div className="group-head">
              <h3>{group.name}</h3>
              <label className="group-bucket">
                <span className="sr-only">Bucket for group {group.name}</span>
                <select
                  value={groupValue}
                  onChange={(e) => setGroupBucket(groupId, group.cats, e.target.value)}
                >
                  <option value="auto">Whole group — {autoLabel}</option>
                  {BUCKET_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      Whole group — {BUCKET_LABEL[b]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <table className="cat-table">
              <colgroup>
                <col />
                <col className="col-bucket" />
                <col className="col-metric" />
              </colgroup>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Bucket</th>
                  <th>Metric</th>
                </tr>
              </thead>
              <tbody>
                {group.cats.map((cat) => (
                  <tr key={cat.id} className={cat.bucket === "unmapped" ? "needs" : ""}>
                    <td>
                      <div className={cat.hidden ? "cat-name is-hidden" : "cat-name"}>
                        {cat.name}
                      </div>
                      <span className="muted">
                        {[
                          cat.hidden ? "Hidden" : null,
                          cat.source === "override"
                            ? "Override"
                            : cat.source === "group"
                              ? "Group"
                              : "Automatic",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </td>
                    <td>
                      <select
                        value={overrides.buckets[cat.id] ?? "auto"}
                        onChange={(e) => setBucket(cat.id, e.target.value)}
                        aria-label={`Bucket for ${cat.name}`}
                      >
                        <option value="auto">
                          Automatic — {BUCKET_LABEL[cat.inherited]}
                        </option>
                        {BUCKET_OPTIONS.map((b) => (
                          <option key={b} value={b}>
                            {BUCKET_LABEL[b]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {isShownBucket(cat.bucket) ? (
                        <Segmented
                          value={cat.metric}
                          onChange={(v) => setMetric(cat.id, v)}
                        />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}

function Segmented(props: { value: Metric; onChange: (v: Metric) => void }) {
  return (
    <div className="seg" role="group">
      <button
        type="button"
        className={props.value === "assigned" ? "on" : ""}
        onClick={() => props.onChange("assigned")}
      >
        Assigned
      </button>
      <button
        type="button"
        className={props.value === "spent" ? "on" : ""}
        onClick={() => props.onChange("spent")}
      >
        Spent
      </button>
    </div>
  );
}
