import type { DeliveryStatus } from '@/lib/api/types';
import { formatDeg } from '@/lib/stats';

export interface FatiguePoint {
  trunkTilt: number | null;
  status: DeliveryStatus | null;
}

const WIDTH = 400;
const HEIGHT = 80;
const PAD = 12;

/** Ball-by-ball trunk tilt within a single spell — the PRD's own framing
 *  for fatigue ("a steady drift across a spell is often the first visible
 *  sign") is a within-session pattern, not a week-over-week one, so this is
 *  a separate, smaller chart from DeltaTrendChart rather than the same
 *  component at a different zoom level.
 *
 *  No shaded band here: trunk tilt has no confirmed baseline in this
 *  system (BACKEND_PLAN.md — only front-knee angle is ever scored), so
 *  this plots the raw observed value, not a deviation. The dashed line is
 *  this spell's own mean, not a baseline — it's there so a drift shows up
 *  as the line pulling away from its own average, not just as a wiggle.
 *  The point markers still pick up colour from that ball's overall verdict
 *  status where one exists, since a flag on the delivery is still relevant
 *  context even though it was triggered by the knee metric, not this one. */
export function FatigueChart({ points }: { points: FatiguePoint[] }) {
  const values = points.map((p) => p.trunkTilt).filter((v): v is number => v !== null);
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const pad = range * 0.25;

  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;
  const x = (i: number) => (points.length === 1 ? WIDTH / 2 : PAD + (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD + innerH - ((v - min + pad) / (range + pad * 2)) * innerH;

  const coords = points
    .map((p, i) => (p.trunkTilt !== null ? { x: x(i), y: y(p.trunkTilt) } : null))
    .filter((c): c is { x: number; y: number } => c !== null);

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const meanY = y(mean);
  // A closed polygon under the line, floored at the chart's bottom edge —
  // gives the sparkline visual weight so a drift reads as a shape filling
  // in or draining out, not just a thin wire.
  const areaPoints = [
    { x: coords[0]?.x ?? PAD, y: HEIGHT - PAD },
    ...coords,
    { x: coords[coords.length - 1]?.x ?? WIDTH - PAD, y: HEIGHT - PAD },
  ];

  const STATUS_COLOR: Record<DeliveryStatus, string> = {
    FORM_BENCHMARK: 'var(--color-status-green)',
    MECHANICAL_WATCH: 'var(--color-status-yellow)',
    TECHNICAL_CONCERN: 'var(--color-status-red)',
    DATA_SUPPRESSED: 'var(--color-ink-muted)',
    BENCHMARK_PENDING: 'var(--color-ink-muted)',
  };

  return (
    <div className="mb-1.5">
      <p className="mb-1 text-caption text-ink-secondary">Trunk tilt within this spell, ball by ball</p>
      <div className="flex items-center gap-sm">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-12 w-full max-w-[16rem]"
          role="img"
          aria-label="Trunk tilt within this spell"
        >
          <polygon points={areaPoints.map((c) => `${c.x},${c.y}`).join(' ')} fill="rgba(255,255,255,0.06)" />
          <line
            x1={PAD}
            y1={meanY}
            x2={WIDTH - PAD}
            y2={meanY}
            stroke="var(--color-line)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <polyline
            points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
            fill="none"
            stroke="var(--color-ink-dim)"
            strokeWidth={1.5}
          />
          {points.map((p, i) =>
            p.trunkTilt === null ? null : (
              <circle
                key={i}
                cx={x(i)}
                cy={y(p.trunkTilt)}
                r={3}
                fill={p.status ? STATUS_COLOR[p.status] : 'var(--color-ink-dim)'}
              >
                <title>
                  Ball {i + 1}: {formatDeg(p.trunkTilt)}
                </title>
              </circle>
            ),
          )}
        </svg>
        <span className="shrink-0 text-caption text-ink-secondary">
          {formatDeg(values[0])} → {formatDeg(values[values.length - 1])}
        </span>
      </div>
    </div>
  );
}
