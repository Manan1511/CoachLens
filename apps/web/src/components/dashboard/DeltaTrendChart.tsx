import { useState } from 'react';
import { StatusLegend } from './StatusLegend';
import { VERDICT_COPY } from '@/content/verdict-copy';
import type { DeliveryStatus } from '@/lib/api/types';
import { formatDeg } from '@/lib/stats';

export interface TrendPoint {
  date: string;
  delta: number | null;
  status: DeliveryStatus | null;
}

const STATUS_COLOR: Record<DeliveryStatus, string> = {
  FORM_BENCHMARK: 'var(--color-status-green)',
  MECHANICAL_WATCH: 'var(--color-status-yellow)',
  TECHNICAL_CONCERN: 'var(--color-status-red)',
  DATA_SUPPRESSED: 'var(--color-ink-muted)',
  BENCHMARK_PENDING: 'var(--color-ink-muted)',
};

const WIDTH = 600;
const HEIGHT = 180;
const PAD_X = 16;
const PAD_Y = 16;
const PAD_RIGHT = 40; // room for the band's +/- degree labels
const PAD_BOTTOM = 28; // room for date labels along the x-axis

/** A hand-rolled SVG line chart — no charting library, matching the site's
 *  existing custom-SVG approach (the marketing page's step arc) rather than
 *  adding a dependency for one chart. Plots delta-from-baseline over the
 *  athlete's recent deliveries, oldest to newest, with the uncertainty band
 *  shaded and labelled in degrees so a coach can read actual magnitude, not
 *  just "in or out of the zone". Suppressed deliveries (no measurement)
 *  break the line rather than plotting as zero. The most recent measured
 *  point is drawn larger — it's the one answer most likely to matter right
 *  now — and hovering any point swaps in its exact date/delta/status. */
export function DeltaTrendChart({
  points,
  uncertaintyBand,
}: {
  points: TrendPoint[];
  uncertaintyBand: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const validDeltas = points.map((p) => p.delta).filter((d): d is number => d !== null);

  if (validDeltas.length === 0) {
    return <p className="text-small text-ink-secondary">Not enough measured deliveries yet to chart.</p>;
  }

  const maxAbs = Math.max(uncertaintyBand, ...validDeltas.map(Math.abs)) * 1.15;
  const innerW = WIDTH - PAD_X - PAD_RIGHT;
  const innerH = HEIGHT - PAD_Y - PAD_BOTTOM;

  const x = (i: number) =>
    points.length === 1 ? PAD_X + innerW / 2 : PAD_X + (i / (points.length - 1)) * innerW;
  const y = (delta: number) => PAD_Y + innerH / 2 - (delta / maxAbs) * (innerH / 2);

  const bandTop = y(uncertaintyBand);
  const bandBottom = y(-uncertaintyBand);
  const zeroY = y(0);

  const lastMeasuredIndex = points.reduce(
    (last, p, i) => (p.delta !== null ? i : last),
    -1,
  );

  // Break the line wherever a delivery has no delta (suppressed / no verdict)
  // instead of interpolating across a gap that isn't real data.
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  points.forEach((p, i) => {
    if (p.delta === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push({ x: x(i), y: y(p.delta) });
    }
  });
  if (current.length) segments.push(current);

  const statusesPresent = Array.from(
    new Set(points.map((p) => p.status).filter((s): s is DeliveryStatus => s !== null)),
  );

  // A handful of evenly-spaced x-axis date labels rather than one per point
  // — with more than a few deliveries, every label would overlap.
  const tickCount = Math.min(points.length, 4);
  const tickIndices =
    points.length <= 1
      ? [0]
      : Array.from({ length: tickCount }, (_, i) => Math.round((i / (tickCount - 1)) * (points.length - 1)));

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredX = hoverIndex !== null ? x(hoverIndex) : 0;
  const hoveredY = hovered?.delta !== null && hovered !== null ? y(hovered.delta) : 0;
  const TOOLTIP_W = 132;
  const tooltipFlipped = hoveredX > WIDTH - PAD_RIGHT - TOOLTIP_W;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Baseline delta trend"
      >
        <rect x={PAD_X} y={bandTop} width={innerW} height={bandBottom - bandTop} fill="rgba(255,255,255,0.05)" />
        <line x1={PAD_X} y1={zeroY} x2={PAD_X + innerW} y2={zeroY} stroke="var(--color-line)" strokeWidth={1} />

        {/* Degree labels for the band's edges and the zero line — the shaded
            rectangle alone tells a coach "in vs out" but not by how much. */}
        <text x={PAD_X + innerW + 6} y={bandTop} dy="0.32em" className="fill-ink-dim text-[10px]">
          +{formatDeg(uncertaintyBand)}
        </text>
        <text x={PAD_X + innerW + 6} y={zeroY} dy="0.32em" className="fill-ink-dim text-[10px]">
          0°
        </text>
        <text x={PAD_X + innerW + 6} y={bandBottom} dy="0.32em" className="fill-ink-dim text-[10px]">
          −{formatDeg(uncertaintyBand)}
        </text>

        {/* X-axis date ticks */}
        {tickIndices.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={HEIGHT - 8}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            className="fill-ink-dim text-[10px]"
          >
            {points[i].date}
          </text>
        ))}

        {segments.map((seg, i) => (
          <polyline
            key={i}
            points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="var(--color-ink-dim)"
            strokeWidth={1.5}
          />
        ))}

        {points.map((p, i) => {
          if (p.delta === null) return null;
          const isLast = i === lastMeasuredIndex;
          const isHovered = i === hoverIndex;
          return (
            <g key={i}>
              {/* Invisible larger hit target so hovering near a small dot
                  doesn't require pixel-perfect aim. */}
              <circle
                cx={x(i)}
                cy={y(p.delta)}
                r={10}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((h) => (h === i ? null : h))}
              />
              <circle
                cx={x(i)}
                cy={y(p.delta)}
                r={isHovered ? 6 : isLast ? 5 : 4}
                fill={p.status ? STATUS_COLOR[p.status] : 'var(--color-ink-dim)'}
                stroke={isLast ? 'var(--color-canvas)' : 'none'}
                strokeWidth={isLast ? 2 : 0}
                className="pointer-events-none transition-[r] duration-150"
              />
            </g>
          );
        })}

        {hovered && hovered.delta !== null && (
          <g
            transform={`translate(${tooltipFlipped ? hoveredX - TOOLTIP_W - 8 : hoveredX + 8}, ${Math.max(hoveredY - 34, 4)})`}
          >
            <rect width={TOOLTIP_W} height={44} rx={6} fill="var(--color-surface)" stroke="var(--color-line)" />
            <text x={8} y={17} className="fill-ink text-[11px] font-medium">
              {formatDeg(hovered.delta)} · {hovered.date}
            </text>
            <text x={8} y={31} className="fill-ink-dim text-[10px]">
              {hovered.status ? VERDICT_COPY[hovered.status].label : 'No verdict'}
            </text>
          </g>
        )}
      </svg>

      <p className="mt-1.5 mb-1 text-caption text-ink-secondary">Shaded band = within personal baseline</p>
      {statusesPresent.length > 0 && <StatusLegend statuses={statusesPresent} />}
    </div>
  );
}
