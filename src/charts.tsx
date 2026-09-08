import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

export type Series = {
  id: string;
  name: string;
  color: string;
  data: number[];
};

type Tooltip = { x: number; y: number; label: string; lines: string[] };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const frac = value / 10 ** exp;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * 10 ** exp;
}

function formatAxis(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (abs >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

export function StackedBars(props: {
  labels: string[];
  series: Series[];
  formatValue: (milliOrUnits: number) => string;
  height?: number;
  normalized?: boolean;
  reference?: { value: number; label: string };
  valuesAreMilliunits?: boolean;
}) {
  const {
    labels,
    series,
    formatValue,
    height = 280,
    normalized = false,
    reference,
    valuesAreMilliunits = true,
  } = props;
  const [tip, setTip] = useState<Tooltip | null>(null);
  const width = 720;
  const pad = { l: 44, r: 12, t: 16, b: 36 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const n = labels.length || 1;
  const gap = innerW / n;
  const barW = Math.min(36, gap * 0.62);

  const units = (v: number) => (valuesAreMilliunits ? v / 1000 : v);

  const stacks = useMemo(() => {
    return labels.map((_, i) => {
      const parts = series.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        raw: Math.max(0, s.data[i] ?? 0),
      }));
      const total = parts.reduce((sum, p) => sum + p.raw, 0);
      return { parts, total };
    });
  }, [labels, series]);

  const maxRaw = Math.max(0, ...stacks.map((s) => s.total), reference?.value ?? 0);
  const max = normalized ? 1 : niceMax(units(maxRaw));

  if (labels.length === 0) return null;

  const y = (value: number) => {
    const v = normalized ? value : units(value);
    return pad.t + innerH - (v / max) * innerH;
  };

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        className="chart"
        onMouseLeave={() => setTip(null)}
      >
        {[0, 0.5, 1].map((t) => {
          const yy = pad.t + innerH * (1 - t);
          const label = normalized ? `${Math.round(t * 100)}%` : formatAxis(max * t);
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={width - pad.r}
                y1={yy}
                y2={yy}
                className="chart-grid"
              />
              <text x={pad.l - 8} y={yy + 3} className="chart-axis" textAnchor="end">
                {label}
              </text>
            </g>
          );
        })}
        {reference && !normalized && (
          <g>
            <line
              x1={pad.l}
              x2={width - pad.r}
              y1={y(reference.value)}
              y2={y(reference.value)}
              className="chart-ref"
            />
            <text
              x={width - pad.r}
              y={y(reference.value) - 4}
              className="chart-ref-label"
              textAnchor="end"
            >
              {reference.label}
            </text>
          </g>
        )}
        {stacks.map((stack, i) => {
          const x = pad.l + gap * i + (gap - barW) / 2;
          let acc = 0;
          const total = stack.total || 1;
          return (
            <g key={labels[i]}>
              {stack.parts.map((p) => {
                const value = normalized ? p.raw / total : p.raw;
                const y1 = y(acc + value);
                const y2 = y(acc);
                acc += value;
                const h = Math.max(0, y2 - y1);
                return (
                  <rect
                    key={p.id}
                    x={x}
                    y={y1}
                    width={barW}
                    height={h}
                    fill={p.color}
                    rx={1.5}
                    onMouseMove={(ev) => {
                      const rect = ev.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      if (!rect) return;
                      setTip({
                        x: ev.clientX - rect.left,
                        y: ev.clientY - rect.top,
                        label: labels[i],
                        lines: stack.parts
                          .filter((q) => q.raw !== 0)
                          .map((q) => `${q.name} · ${formatValue(q.raw)}`),
                      });
                    }}
                  />
                );
              })}
              <text
                x={x + barW / 2}
                y={height - 10}
                className="chart-tick"
                textAnchor="middle"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
      {tip && (
        <div
          className="chart-tip"
          style={{ left: tip.x, top: tip.y } as CSSProperties}
        >
          <strong>{tip.label}</strong>
          {tip.lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      )}
      <ChartLegend series={series} />
    </div>
  );
}

export function ChartLegend(props: { series: Series[] }) {
  return (
    <ul className="chart-legend">
      {props.series.map((s) => (
        <li key={s.id}>
          <i style={{ background: s.color }} aria-hidden />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

export function LineChart(props: {
  labels: string[];
  series: Series[];
  formatValue: (v: number) => string;
  height?: number;
}) {
  const { labels, series, formatValue, height = 240 } = props;
  const [tip, setTip] = useState<Tooltip | null>(null);
  const width = 720;
  const pad = { l: 44, r: 12, t: 16, b: 36 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const n = Math.max(1, labels.length - 1);
  const max = niceMax(
    Math.max(0, ...series.flatMap((s) => s.data.map((v) => v / 1000))),
  );
  const x = (i: number) => pad.l + (labels.length <= 1 ? innerW / 2 : (innerW * i) / n);
  const y = (milli: number) => pad.t + innerH - (milli / 1000 / max) * innerH;

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="chart"
        onMouseLeave={() => setTip(null)}
      >
        {[0, 0.5, 1].map((t) => {
          const yy = pad.t + innerH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={width - pad.r}
                y1={yy}
                y2={yy}
                className="chart-grid"
              />
              <text x={pad.l - 8} y={yy + 3} className="chart-axis" textAnchor="end">
                {formatAxis(max * t)}
              </text>
            </g>
          );
        })}
        {series.map((s) => {
          const pts = s.data.map((v, i) => `${x(i)},${y(Math.max(0, v))}`).join(" ");
          const area = `${x(0)},${pad.t + innerH} ${pts} ${x(s.data.length - 1)},${pad.t + innerH}`;
          return (
            <g key={s.id}>
              <polygon points={area} fill={s.color} opacity={0.12} />
              <polyline
                points={pts}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          );
        })}
        {labels.map((label, i) => (
          <g key={label}>
            <rect
              x={x(i) - innerW / labels.length / 2}
              y={pad.t}
              width={innerW / labels.length}
              height={innerH}
              fill="transparent"
              onMouseMove={(ev) => {
                const rect = ev.currentTarget.ownerSVGElement?.getBoundingClientRect();
                if (!rect) return;
                setTip({
                  x: ev.clientX - rect.left,
                  y: ev.clientY - rect.top,
                  label,
                  lines: series.map((s) => `${s.name} · ${formatValue(s.data[i] ?? 0)}`),
                });
              }}
            />
            <text x={x(i)} y={height - 10} className="chart-tick" textAnchor="middle">
              {label}
            </text>
          </g>
        ))}
      </svg>
      {tip && (
        <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.label}</strong>
          {tip.lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      )}
      <ChartLegend series={series} />
    </div>
  );
}
