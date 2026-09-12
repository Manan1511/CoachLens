import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { GuardianConsentModal } from '@/components/dashboard/GuardianConsentModal';
import { api } from '@/lib/api/client';
import { useAsync } from '@/hooks/useAsync';
import { usePoseLandmarker, POSE_LANDMARK } from '@/lib/pose/usePoseLandmarker';
import { useSessionPool, type PoolMember } from '@/lib/pose/useSessionPool';
import { useDeviceOrientation } from '@/lib/pose/useDeviceOrientation';
import { useDeliveryCapture } from '@/lib/pose/useDeliveryCapture';
import { useSpellCapture, type SpellToast, type CapturedDelivery } from '@/lib/pose/useSpellCapture';
import type { Athlete, BowlingArm } from '@/lib/api/types';

/** CAPTURE_PLAN.md Milestone 1: session-pool setup, then a quick-select
 *  capture screen. Two views in one component rather than two routes -
 *  there's no reason to leave a URL history entry for "picked the pool",
 *  and a coach re-visiting mid-session should land straight on the capture
 *  screen if a pool is already resolved (see useSessionPool's localStorage
 *  persistence).
 *
 *  Updated for Spell Mode (auto-trigger with ring buffer): the manual
 *  "Capture delivery" button is replaced by Start/End Spell controls.
 *  A manual fallback button is preserved for edge cases. */
export function CapturePage() {
  const { pool, resolving, error: poolError, setPoolFromAthletes, addToPool, clearPool } = useSessionPool();

  if (pool.length === 0) {
    return <SessionPoolSetup onStart={setPoolFromAthletes} resolving={resolving} error={poolError} />;
  }

  return (
    <CaptureScreen pool={pool} onAddToPool={addToPool} onEndSession={clearPool} poolResolving={resolving} />
  );
}

function SessionPoolSetup({
  onStart,
  resolving,
  error,
}: {
  onStart: (athletes: Athlete[]) => void;
  resolving: boolean;
  error: string | null;
}) {
  const { data: roster, loading, error: rosterError, reload: reloadRoster } = useAsync(() => api.listAthletes(), []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resolvingConsentAthlete, setResolvingConsentAthlete] = useState<Athlete | null>(null);

  function toggle(athleteId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  }

  const selected = (roster ?? []).filter((a) => selectedIds.has(a.id));

  return (
    <div className="mx-auto max-w-[36rem]">
      <h1 className="mb-xs text-h2">Who's at the nets?</h1>
      <p className="mb-lg text-ink-secondary">
        Pick the players for this session. You can add someone who arrives late without redoing this.
      </p>

      {loading && <p className="text-ink-dim">Loading roster…</p>}
      {rosterError && <p className="text-status-red">Couldn't load the roster.</p>}

      {roster && (
        <div className="mb-lg flex flex-col">
          {roster.map((athlete) => {
            const isSelected = selectedIds.has(athlete.id);
            return (
              <button
                key={athlete.id}
                type="button"
                onClick={() => {
                  if (athlete.consent_blocked) {
                    setResolvingConsentAthlete(athlete);
                  } else {
                    toggle(athlete.id);
                  }
                }}
                className={`-mx-3 flex items-center justify-between gap-sm border-b border-line px-3 py-4 text-left transition-colors duration-200 last:border-b-0 ${
                  isSelected ? 'bg-white/6' : 'hover:bg-white/3'
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
                  {athlete.name}
                </span>
                {athlete.consent_blocked ? (
                  <div className="flex items-center gap-2">
                    <Badge tone="yellow">Consent needed</Badge>
                    <span className="text-[11px] text-ink-dim underline hover:text-ink">Resolve</span>
                  </div>
                ) : (
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                      isSelected ? 'border-accent bg-accent text-canvas' : 'border-line'
                    }`}
                    aria-hidden
                  >
                    {isSelected && '✓'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <GuardianConsentModal
        athlete={resolvingConsentAthlete}
        isOpen={Boolean(resolvingConsentAthlete)}
        onClose={() => setResolvingConsentAthlete(null)}
        onConsentUpdated={() => {
          reloadRoster();
        }}
      />

      {error && <p className="mb-md text-status-red">{error}</p>}

      <button
        type="button"
        disabled={selected.length === 0 || resolving}
        onClick={() => onStart(selected)}
        className="w-full rounded-full bg-accent px-4 py-3 text-body font-semibold text-canvas transition-opacity disabled:opacity-40"
      >
        {resolving ? 'Starting session…' : `Start session (${selected.length})`}
      </button>
    </div>
  );
}

function CaptureScreen({
  pool,
  onAddToPool,
  onEndSession,
  poolResolving,
}: {
  pool: PoolMember[];
  onAddToPool: (athlete: Athlete) => void;
  onEndSession: () => void;
  poolResolving: boolean;
}) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(pool[0]?.athlete.id ?? '');
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showDeliveryLog, setShowDeliveryLog] = useState(false);
  const { videoRef, videoSize, frame, cameraError, modelError, ready } = usePoseLandmarker(true);
  const orientation = useDeviceOrientation();
  const navigate = useNavigate();

  const selected = pool.find((m) => m.athlete.id === selectedAthleteId) ?? pool[0];
  const rightKnee = frame?.landmarks[POSE_LANDMARK.rightKnee];

  // --- Spell Mode (auto-trigger) ---
  const spell = useSpellCapture({
    sessionId: selected?.sessionId ?? '',
    bowlingArm: selected?.athlete.bowling_arm ?? null,
    frame,
    videoSize,
    cameraRollDeg: orientation.reading?.roll ?? null,
  });

  // --- Manual fallback (for edge cases where auto-trigger doesn't fire) ---
  const manualCapture = useDeliveryCapture({
    sessionId: selected?.sessionId ?? '',
    bowlingArm: selected?.athlete.bowling_arm ?? null,
    frame,
    videoSize,
    cameraRollDeg: orientation.reading?.roll ?? null,
  });

  // Navigate to verdict page on manual capture completion
  useEffect(() => {
    if (manualCapture.state.status === 'done') {
      navigate(`/app/deliveries/${manualCapture.state.report.delivery_id}`);
    }
  }, [manualCapture.state, navigate]);

  const spellActive = spell.state.status !== 'idle';
  const canStartSpell = ready && !cameraError && !modelError && !!selected?.athlete.bowling_arm;
  const canManualCapture =
    canStartSpell &&
    !spellActive &&
    manualCapture.state.status !== 'recording' &&
    manualCapture.state.status !== 'submitting';

  return (
    <div className="relative -mx-md -mt-24 h-screen overflow-hidden bg-canvas sm:-mt-28">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

      {/* --- Status Pill (top center) --- */}
      {spellActive && (
        <div className="absolute inset-x-0 top-16 flex justify-center">
          <SpellStatusPill state={spell.state} />
        </div>
      )}

      {/* --- Toast Notifications (below status pill) --- */}
      <div className="absolute inset-x-0 top-28 flex flex-col items-center gap-2 px-md">
        {spell.toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onTap={() => {
              const delivery = spell.deliveryLog[toast.deliveryNumber - 1];
              if (delivery) navigate(`/app/deliveries/${delivery.deliveryId}`);
            }}
          />
        ))}
      </div>

      {/* --- Spell Controls (bottom center, above quick-select) --- */}
      <div className="absolute inset-x-0 bottom-[7.5rem] flex flex-col items-center gap-2 px-md">
        {!selected?.athlete.bowling_arm && (
          <p className="rounded-full bg-black/70 px-4 py-2 text-caption text-ink-dim backdrop-blur-sm">
            Bowling arm not set for {selected?.athlete.name ?? 'this athlete'} (can't determine the front leg).
          </p>
        )}

        {manualCapture.state.status === 'error' && (
          <p className="rounded-full bg-status-red/16 px-4 py-2 text-caption text-status-red backdrop-blur-sm">
            {manualCapture.state.message}
          </p>
        )}

        {/* Primary: Start/End Spell button */}
        {!spellActive ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={spell.startSpell}
              disabled={!canStartSpell}
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-body font-semibold text-white shadow-glow-strong transition-opacity disabled:opacity-40"
            >
              <span className="size-3 rounded-full bg-white" aria-hidden />
              Start Spell
            </button>
            {/* Manual fallback when spell is not active */}
            <button
              type="button"
              onClick={manualCapture.start}
              disabled={!canManualCapture}
              className="rounded-full px-4 py-2 text-caption text-ink-dim underline transition-opacity disabled:opacity-40"
            >
              {manualCapture.state.status === 'recording'
                ? `Capturing… ${manualCapture.state.framesCaptured}`
                : manualCapture.state.status === 'submitting'
                  ? 'Sending…'
                  : 'Manual capture'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Delivery counter badge */}
            <button
              type="button"
              onClick={() => setShowDeliveryLog(true)}
              className="flex items-center gap-1.5 rounded-full bg-black/70 px-4 py-2.5 text-body font-medium text-ink backdrop-blur-sm"
            >
              <span className="text-accent">
                {spell.state.status !== 'idle'
                  ? (spell.state as { deliveriesCaptured: number }).deliveriesCaptured
                  : 0}
              </span>
              <span className="text-ink-dim">deliveries</span>
            </button>

            {/* End Spell button */}
            <button
              type="button"
              onClick={spell.endSpell}
              className="flex items-center gap-2 rounded-full border border-status-red/30 bg-status-red/16 px-5 py-2.5 text-body font-semibold text-status-red backdrop-blur-sm"
            >
              End Spell
            </button>
          </div>
        )}
      </div>

      {/* --- Quick-select strip --- */}
      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-black/70 p-3 backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2 overflow-x-auto">
          {pool.map((member) => (
            <button
              key={member.athlete.id}
              type="button"
              onClick={() => setSelectedAthleteId(member.athlete.id)}
              className={`shrink-0 rounded-full border px-4 py-3 text-body font-medium transition-colors duration-200 ${
                member.athlete.id === selectedAthleteId
                  ? 'border-accent bg-accent text-canvas'
                  : 'border-line text-ink-secondary'
              }`}
            >
              {member.athlete.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAddPicker(true)}
            disabled={poolResolving}
            className="shrink-0 rounded-full border border-line px-4 py-3 text-body text-ink-dim disabled:opacity-40"
          >
            + Add
          </button>
          <button
            type="button"
            onClick={() => setShowEndConfirm(true)}
            className="ml-auto shrink-0 rounded-full border border-line px-4 py-3 text-body text-ink-dim"
          >
            End session
          </button>
        </div>
        {selected && (
          <p className="text-h3 font-medium text-ink">{selected.athlete.name}</p>
        )}
      </div>

      {/* --- End session confirmation --- */}
      {showEndConfirm && (
        <div
          className="absolute inset-0 z-10 flex items-end bg-black/70"
          onClick={() => setShowEndConfirm(false)}
        >
          <div
            className="w-full rounded-t-2xl border-t border-line bg-canvas p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-body font-medium text-ink">End this session?</p>
            <p className="mb-md text-small text-ink-dim">
              You'll need to re-pick who's at the nets to capture again. Nothing already recorded is affected.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-full border border-line px-4 py-3 text-body font-medium text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  spell.endSpell();
                  onEndSession();
                }}
                className="flex-1 rounded-full bg-status-red/16 px-4 py-3 text-body font-semibold text-status-red"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Diagnostics overlay (top left) --- */}
      <div className="absolute left-4 top-4 rounded-xl border border-line bg-black/55 p-3 backdrop-blur-sm">
        <DiagnosticRow label="Video" value={videoSize ? `${videoSize.width}x${videoSize.height}` : '-'} />
        <DiagnosticRow label="Landmarks" value={frame ? frame.landmarks.length : '-'} />
        <DiagnosticRow
          label="Right knee visibility"
          value={rightKnee ? rightKnee.visibility.toFixed(2) : '-'}
        />
        <DiagnosticRow
          label="Inference time"
          value={frame ? `${frame.inferenceMs.toFixed(1)}ms` : '-'}
        />
        {spellActive && (
          <DiagnosticRow label="Ring buffer" value={`${spell.ringBuffer.size()} frames`} />
        )}
        {!ready && !cameraError && !modelError && <DiagnosticRow label="Status" value="Loading…" />}
        {cameraError && <DiagnosticRow label="Camera error" value={cameraError} isError />}
        {modelError && <DiagnosticRow label="Model error" value={modelError} isError />}
      </div>

      <AlignmentOverlay bowlingArm={selected?.athlete.bowling_arm ?? null} orientation={orientation} />

      {/* --- Delivery Log slide-up panel --- */}
      {showDeliveryLog && (
        <DeliveryLogPanel
          deliveries={spell.deliveryLog}
          onClose={() => setShowDeliveryLog(false)}
          onTapDelivery={(deliveryId) => navigate(`/app/deliveries/${deliveryId}`)}
        />
      )}

      {showAddPicker && (
        <AddToPoolPicker
          excludeIds={new Set(pool.map((m) => m.athlete.id))}
          onPick={(athlete) => {
            onAddToPool(athlete);
            setShowAddPicker(false);
          }}
          onClose={() => setShowAddPicker(false)}
        />
      )}
    </div>
  );
}

// --- Spell Status Pill ---

function SpellStatusPill({ state }: { state: ReturnType<typeof useSpellCapture>['state'] }) {
  const statusConfig = {
    watching: { label: '● WATCHING', color: 'text-emerald-400', bg: 'bg-emerald-900/60', animate: 'animate-pulse' },
    'post-trigger': { label: '● CAPTURING…', color: 'text-amber-400', bg: 'bg-amber-900/60', animate: '' },
    submitting: { label: '● SENDING…', color: 'text-amber-400', bg: 'bg-amber-900/60', animate: '' },
    cooldown: { label: '● COOLDOWN', color: 'text-zinc-400', bg: 'bg-zinc-800/60', animate: '' },
    idle: { label: '', color: '', bg: '', animate: '' },
  } as const;

  const config = statusConfig[state.status];
  if (state.status === 'idle') return null;

  return (
    <span
      className={`rounded-full px-4 py-1.5 text-caption font-bold uppercase tracking-widest backdrop-blur-sm ${config.bg} ${config.color} ${config.animate}`}
    >
      {config.label}
    </span>
  );
}

// --- Toast Notification ---

function ToastNotification({ toast, onTap }: { toast: SpellToast; onTap: () => void }) {
  const statusColors: Record<string, string> = {
    FORM_BENCHMARK: 'border-emerald-500/40 bg-emerald-900/70 text-emerald-300',
    MECHANICAL_WATCH: 'border-amber-500/40 bg-amber-900/70 text-amber-300',
    TECHNICAL_CONCERN: 'border-status-red/40 bg-red-900/70 text-status-red',
    DATA_SUPPRESSED: 'border-zinc-500/40 bg-zinc-800/70 text-zinc-400',
    BENCHMARK_PENDING: 'border-blue-500/40 bg-blue-900/70 text-blue-300',
    ERROR: 'border-status-red/40 bg-red-900/70 text-status-red',
  };

  const statusEmoji: Record<string, string> = {
    FORM_BENCHMARK: '✓',
    MECHANICAL_WATCH: '⚠',
    TECHNICAL_CONCERN: '⚠️',
    DATA_SUPPRESSED: '-',
    BENCHMARK_PENDING: '⏳',
    ERROR: '✗',
  };

  const colorClass = statusColors[toast.status] ?? statusColors.ERROR;
  const emoji = statusEmoji[toast.status] ?? '?';

  return (
    <button
      type="button"
      onClick={onTap}
      className={`rounded-full border px-4 py-2 text-caption font-semibold backdrop-blur-sm transition-all ${colorClass}`}
    >
      Delivery #{toast.deliveryNumber} · {toast.status.replace(/_/g, ' ')} {emoji}
    </button>
  );
}

// --- Delivery Log Panel ---

function DeliveryLogPanel({
  deliveries,
  onClose,
  onTapDelivery,
}: {
  deliveries: CapturedDelivery[];
  onClose: () => void;
  onTapDelivery: (deliveryId: string) => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-end bg-black/70" onClick={onClose}>
      <div
        className="max-h-[60vh] w-full overflow-y-auto rounded-t-2xl border-t border-line bg-canvas p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-md text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">
          Deliveries this spell ({deliveries.length})
        </p>
        {deliveries.length === 0 && (
          <p className="text-ink-dim">No deliveries captured yet.</p>
        )}
        {deliveries.map((d, i) => (
          <button
            key={d.deliveryId}
            type="button"
            onClick={() => onTapDelivery(d.deliveryId)}
            className="-mx-1 flex w-[calc(100%+0.5rem)] items-center justify-between rounded-lg px-3 py-3 text-left transition-colors duration-200 hover:bg-white/6"
          >
            <div>
              <p className="text-body font-medium text-ink">Delivery #{i + 1}</p>
              <p className="text-caption text-ink-dim">
                {d.kneeAngleDeg !== null ? `Knee: ${d.kneeAngleDeg.toFixed(1)}°` : ''}
                {d.kneeAngleDeg !== null && d.trunkTiltDeg !== null ? ' · ' : ''}
                {d.trunkTiltDeg !== null ? `Trunk: ${d.trunkTiltDeg.toFixed(1)}°` : ''}
              </p>
            </div>
            <Badge
              tone={
                d.status === 'FORM_BENCHMARK'
                  ? 'green'
                  : d.status === 'MECHANICAL_WATCH'
                    ? 'yellow'
                    : d.status === 'TECHNICAL_CONCERN'
                      ? 'red'
                      : 'muted'
              }
            >
              {d.status.replace(/_/g, ' ')}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Remaining components (unchanged) ---

function tripodSideFor(bowlingArm: BowlingArm | null): string {
  if (bowlingArm === 'RIGHT') return "bowler's left side";
  if (bowlingArm === 'LEFT') return "bowler's right side";
  return 'bowling arm not set on this athlete (front leg side unknown)';
}

function AlignmentOverlay({
  bowlingArm,
  orientation,
}: {
  bowlingArm: BowlingArm | null;
  orientation: ReturnType<typeof useDeviceOrientation>;
}) {
  const { reading, permissionState, requestPermission, supported } = orientation;
  const [pitchBaseline, setPitchBaseline] = useState<number | null>(null);

  const rollOk = reading !== null && Math.abs(reading.roll) < 3;
  const pitchDelta = reading !== null && pitchBaseline !== null ? reading.pitch - pitchBaseline : null;
  const pitchOk = pitchDelta !== null && Math.abs(pitchDelta) < 3;

  return (
    <div className="absolute right-4 top-4 w-52 rounded-xl border border-line bg-black/55 p-3 backdrop-blur-sm">
      <p className="mb-2 text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">Alignment</p>

      <DiagnosticRow label="Tripod side" value={tripodSideFor(bowlingArm)} />
      <DiagnosticRow label="Distance" value="2.8–3.2m, side-on" />
      <DiagnosticRow label="Height" value="1.1m (hip height)" />

      {permissionState === 'unknown' && !supported && (
        <DiagnosticRow label="Level" value="Not supported by this browser" isError />
      )}

      {permissionState === 'unknown' && supported && (
        <button
          type="button"
          onClick={requestPermission}
          className="mt-2 w-full rounded-full border border-line px-3 py-2 text-caption font-semibold text-ink"
        >
          Enable tilt sensor
        </button>
      )}

      {permissionState === 'denied' && (
        <DiagnosticRow label="Level" value="Tilt permission denied" isError />
      )}

      {(permissionState === 'granted' || permissionState === 'not-required') && (
        <>
          <DiagnosticRow
            label="Roll"
            value={reading ? `${reading.roll.toFixed(1)}°` : '-'}
            isError={reading !== null && !rollOk}
          />
          <DiagnosticRow
            label="Pitch drift"
            value={pitchDelta !== null ? `${pitchDelta.toFixed(1)}°` : 'not set'}
            isError={pitchDelta !== null && !pitchOk}
          />
          <button
            type="button"
            disabled={!reading}
            onClick={() => reading && setPitchBaseline(reading.pitch)}
            className="mt-2 w-full rounded-full border border-line px-3 py-2 text-caption font-semibold text-ink disabled:opacity-40"
          >
            {pitchBaseline === null ? 'Set level' : 'Re-set level'}
          </button>
        </>
      )}
    </div>
  );
}

function AddToPoolPicker({
  excludeIds,
  onPick,
  onClose,
}: {
  excludeIds: Set<string>;
  onPick: (athlete: Athlete) => void;
  onClose: () => void;
}) {
  const { data: roster, loading } = useAsync(() => api.listAthletes(), []);
  const available = (roster ?? []).filter((a) => !excludeIds.has(a.id) && !a.consent_blocked);

  return (
    <div className="absolute inset-0 z-10 flex items-end bg-black/70" onClick={onClose}>
      <div
        className="max-h-[60vh] w-full overflow-y-auto rounded-t-2xl border-t border-line bg-canvas p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-md text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">
          Add a late arrival
        </p>
        {loading && <p className="text-ink-dim">Loading…</p>}
        {available.length === 0 && !loading && (
          <p className="text-ink-dim">Everyone on the roster is already in this session.</p>
        )}
        {available.map((athlete) => (
          <button
            key={athlete.id}
            type="button"
            onClick={() => onPick(athlete)}
            className="-mx-1 block w-[calc(100%+0.5rem)] rounded-lg px-3 py-3 text-left text-body text-ink transition-colors duration-200 hover:bg-white/6"
          >
            {athlete.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function DiagnosticRow({
  label,
  value,
  isError = false,
}: {
  label: string;
  value: string | number;
  isError?: boolean;
}) {
  return (
    <div className="mt-2 first:mt-0">
      <p className="text-caption font-bold uppercase tracking-[0.1em] text-ink-dim">{label}</p>
      <p className={`text-body ${isError ? 'text-status-red' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
