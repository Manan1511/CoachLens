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
};

const WIDTH = 600;
const HEIGHT = 140;
const PAD_X = 16;
const PAD_Y = 16;

/** A hand-rolled SVG line chart — no charting library, matching the site's
 *  existing custom-SVG approach (the marketing page's step arc) rather than
 *  adding a dependency for one chart. Plots delta-from-baseline over the
 *  athlete's recent deliveries, oldest to newest, with the uncertainty band
 *  shaded so a coach can see at a glance how often — and how far — a
 *  delivery has sat outside it. Suppressed deliveries (no measurement)
 *  break the line rather than plotting as zero. */
export function DeltaTrendChart({
  points,
  uncertaintyBand,
}: {
  points: TrendPoint[];
  uncertaintyBand: number;
}) {
  const validDeltas = points.map((p) => p.delta).filter((d): d is number => d !== null);

  if (validDeltas.length === 0) {
    return <p className="text-small text-ink-dim">Not enough measured deliveries yet to chart.</p>;
  }

  const maxAbs = Math.max(uncertaintyBand, ...validDeltas.map(Math.abs)) * 1.15;
  const innerH = HEIGHT - PAD_Y * 2;
  const innerW = WIDTH - PAD_X * 2;

  const x = (i: number) =>
    points.length === 1 ? WIDTH / 2 : PAD_X + (i / (points.length - 1)) * innerW;
  const y = (delta: number) => PAD_Y + innerH / 2 - (delta / maxAbs) * (innerH / 2);

  const bandTop = y(uncertaintyBand);
  const bandBottom = y(-uncertaintyBand);
  const zeroY = y(0);

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

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Baseline delta trend">
      <rect
        x={PAD_X}
        y={bandTop}
        width={innerW}
        height={bandBottom - bandTop}
        fill="rgba(255,255,255,0.05)"
      />
      <line
        x1={PAD_X}
        y1={zeroY}
        x2={WIDTH - PAD_X}
        y2={zeroY}
        stroke="var(--color-line)"
        strokeWidth={1}
      />

      {segments.map((seg, i) => (
        <polyline
          key={i}
          points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="var(--color-ink-dim)"
          strokeWidth={1.5}
        />
      ))}

      {points.map((p, i) =>
        p.delta === null ? null : (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.delta)}
            r={4}
            fill={p.status ? STATUS_COLOR[p.status] : 'var(--color-ink-dim)'}
          >
            <title>
              {p.date}: {formatDeg(p.delta)}
            </title>
          </circle>
        ),
      )}
    </svg>
  );
}
