import { formatDeg } from '@/lib/stats';

/** A single-value visual for "how far outside the uncertainty band is this
 *  delivery" — a shaded centre zone for the band, a marker for the observed
 *  delta. Div-based rather than SVG since it's one value, not a series;
 *  DeltaTrendChart (the athlete page's history chart) is the SVG one. */
export function DeltaGauge({
  delta,
  band,
  showValue = true,
}: {
  delta: number;
  band: number;
  /** Off when the delta's already spelled out in text right next to the
   *  gauge (e.g. FlagHistory's row) — no point printing the same number
   *  twice in one row. */
  showValue?: boolean;
}) {
  const range = Math.max(band, Math.abs(delta)) * 1.3;
  const toPercent = (v: number) => 50 + (v / range) * 50;

  const bandStart = toPercent(-band);
  const bandEnd = toPercent(band);
  const markerPos = toPercent(delta);
  const withinBand = Math.abs(delta) <= band;

  return (
    <div className="flex items-center gap-sm">
      <div className="relative h-1.5 flex-1 rounded-full bg-white/8">
        <div
          className="absolute inset-y-0 rounded-full bg-white/12"
          style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
        />
        {/* Zero tick — without it the shaded band reads as "the safe zone"
            but gives no sense of which direction is which, or where the
            athlete's own baseline actually sits. */}
        <div
          className="absolute inset-y-0 w-px bg-line-strong"
          style={{ left: '50%' }}
        />
        <div
          className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            withinBand ? 'bg-status-green' : 'bg-status-red'
          }`}
          style={{ left: `${markerPos}%` }}
        />
      </div>
      {showValue && (
        <span className="w-12 shrink-0 text-right font-medium text-ink">{formatDeg(delta)}</span>
      )}
    </div>
  );
}
