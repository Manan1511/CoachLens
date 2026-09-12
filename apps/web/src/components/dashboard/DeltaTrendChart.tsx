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

const WIDTH = 620;
const HEIGHT = 230;
const PAD_X = 24;
const PAD_Y = 24;
const PAD_RIGHT = 60; // room for the band's +/- degree labels
const PAD_BOTTOM = 36; // room for ball/date labels along the x-axis

/** Improved readable SVG line chart plotting delta-from-baseline over the
 *  athlete's deliveries. Shaded baseline tolerance zone is clearly contrasted
 *  with dashed boundaries, each ball carries clear delta labels, y-axis thresholds
 *  are crisp and readable, and x-axis labels show delivery numbers when dates match. */
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

  const maxAbs = Math.max(uncertaintyBand, ...validDeltas.map(Math.abs)) * 1.25;
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

  // Check if all deliveries belong to the same day
  const uniqueDates = Array.from(new Set(points.map((p) => p.date)));
  const singleDate = uniqueDates.length <= 1;

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredX = hoverIndex !== null ? x(hoverIndex) : 0;
  const hoveredY = hovered?.delta !== null && hovered !== null ? y(hovered.delta) : 0;
  const TOOLTIP_W = 140;
  const tooltipFlipped = hoveredX > WIDTH - PAD_RIGHT - TOOLTIP_W;

  return (
    <div className="space-y-3">
      {/* Visual Chart Card */}
      <div className="rounded-xl border border-line bg-black/40 p-3.5 backdrop-blur-sm shadow-inner">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full overflow-visible"
          role="img"
          aria-label="Baseline delta trend"
        >
          {/* Shaded Personal Baseline Zone */}
          <rect
            x={PAD_X}
            y={bandTop}
            width={innerW}
            height={Math.max(4, bandBottom - bandTop)}
            fill="rgba(255, 255, 255, 0.08)"
            stroke="rgba(255, 255, 255, 0.22)"
            strokeDasharray="4 4"
            strokeWidth={1}
            rx={4}
          />

          {/* Zero baseline reference line */}
          <line
            x1={PAD_X}
            y1={zeroY}
            x2={PAD_X + innerW}
            y2={zeroY}
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth={1.2}
          />

          {/* Y-Axis Degree Threshold Labels (Clear & High-Contrast) */}
          <g className="font-mono text-[11px] font-medium select-none">
            <text x={PAD_X + innerW + 8} y={bandTop} dy="0.32em" fill="#34d399">
              +{formatDeg(uncertaintyBand)}
            </text>
            <text x={PAD_X + innerW + 8} y={zeroY} dy="0.32em" fill="#e4e4e7" fontWeight="bold">
              0°
            </text>
            <text x={PAD_X + innerW + 8} y={bandBottom} dy="0.32em" fill="#f87171">
              -{formatDeg(uncertaintyBand)}
            </text>
          </g>

          {/* Connecting Trend Line */}
          {segments.map((seg, i) => (
            <polyline
              key={i}
              points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#a1a1aa"
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* X-Axis Ticks: Delivery # or Date */}
          {points.map((p, i) => {
            const label = singleDate ? `Ball ${i + 1}` : p.date;
            return (
              <text
                key={i}
                x={x(i)}
                y={HEIGHT - 10}
                textAnchor="middle"
                className="fill-ink-secondary font-mono text-[10px] font-medium select-none"
              >
                {label}
              </text>
            );
          })}

          {/* Data Points and Delta Labels */}
          {points.map((p, i) => {
            if (p.delta === null) return null;
            const isLast = i === lastMeasuredIndex;
            const isHovered = i === hoverIndex;
            const pointX = x(i);
            const pointY = y(p.delta);
            const color = p.status ? STATUS_COLOR[p.status] : 'var(--color-ink-muted)';
            const deltaSign = p.delta > 0 ? '+' : '';

            return (
              <g key={i}>
                {/* Hit area */}
                <circle
                  cx={pointX}
                  cy={pointY}
                  r={14}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex((h) => (h === i ? null : h))}
                />

                {/* Outer ring for selected or latest */}
                {isLast && (
                  <circle
                    cx={pointX}
                    cy={pointY}
                    r={9}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={pointX}
                  cy={pointY}
                  r={isHovered ? 7 : isLast ? 6 : 5}
                  fill={color}
                  stroke="#18181b"
                  strokeWidth={2}
                  className="pointer-events-none transition-all duration-150"
                />

                {/* Always-visible numerical delta label */}
                <text
                  x={pointX}
                  y={p.delta >= 0 ? pointY - 10 : pointY + 16}
                  textAnchor="middle"
                  className="font-mono text-[10px] font-bold select-none"
                  fill={color}
                >
                  {`${deltaSign}${p.delta.toFixed(1)}°`}
                </text>
              </g>
            );
          })}

          {/* Hover Tooltip */}
          {hovered && hovered.delta !== null && (
            <g
              transform={`translate(${tooltipFlipped ? hoveredX - TOOLTIP_W - 8 : hoveredX + 8}, ${Math.max(hoveredY - 38, 6)})`}
            >
              <rect
                width={TOOLTIP_W}
                height={46}
                rx={6}
                fill="#18181b"
                stroke="#3f3f46"
                strokeWidth={1}
                className="shadow-xl"
              />
              <text x={8} y={18} fill="#ffffff" className="font-mono text-[11px] font-semibold">
                {formatDeg(hovered.delta)} · {singleDate ? `Delivery #${(hoverIndex ?? 0) + 1}` : hovered.date}
              </text>
              <text x={8} y={34} fill="#a1a1aa" className="text-[10px]">
                {hovered.status ? VERDICT_COPY[hovered.status].label : 'No verdict'}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Caption & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-ink-secondary">
        <p className="flex items-center gap-1.5 font-medium">
          <span className="inline-block size-2.5 rounded-sm border border-white/40 bg-white/10" />
          <span>Shaded band = within baseline (±{formatDeg(uncertaintyBand)})</span>
        </p>
        {singleDate && uniqueDates[0] && (
          <p className="font-mono text-[11px] text-ink-dim">Session: {uniqueDates[0]}</p>
        )}
      </div>

      {statusesPresent.length > 0 && <StatusLegend statuses={statusesPresent} />}
    </div>
  );
}
