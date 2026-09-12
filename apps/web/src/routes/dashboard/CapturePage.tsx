import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api/client';
import { useAsync } from '@/hooks/useAsync';
import { usePoseLandmarker, POSE_LANDMARK } from '@/lib/pose/usePoseLandmarker';
import { useSessionPool, type PoolMember } from '@/lib/pose/useSessionPool';
import { useDeviceOrientation } from '@/lib/pose/useDeviceOrientation';
import type { Athlete, BowlingArm } from '@/lib/api/types';

/** CAPTURE_PLAN.md Milestone 1: session-pool setup, then a quick-select
 *  capture screen. Two views in one component rather than two routes -
 *  there's no reason to leave a URL history entry for "picked the pool",
 *  and a coach re-visiting mid-session should land straight on the capture
 *  screen if a pool is already resolved (see useSessionPool's localStorage
 *  persistence).
 *
 *  Milestone 0.5 (real WASM inference cost on target hardware) is done -
 *  see CAPTURE_PLAN.md. The diagnostic readout stays visible on the capture
 *  screen since it's cheap to keep and useful for any future regression
 *  (e.g. a browser update changing WASM/GPU-delegate behavior). */
export function CapturePage() {
  const { pool, resolving, error: poolError, setPoolFromAthletes, addToPool } = useSessionPool();

  if (pool.length === 0) {
    return <SessionPoolSetup onStart={setPoolFromAthletes} resolving={resolving} error={poolError} />;
  }

  return <CaptureScreen pool={pool} onAddToPool={addToPool} poolResolving={resolving} />;
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
  const { data: roster, loading, error: rosterError } = useAsync(() => api.listAthletes(), []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
                disabled={athlete.consent_blocked}
                onClick={() => toggle(athlete.id)}
                className={`-mx-3 flex items-center justify-between gap-sm border-b border-line px-3 py-4 text-left transition-colors duration-200 last:border-b-0 disabled:opacity-40 ${
                  isSelected ? 'bg-white/6' : 'hover:bg-white/3'
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">
                  {athlete.name}
                </span>
                {athlete.consent_blocked ? (
                  <Badge tone="yellow">Consent needed</Badge>
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
  poolResolving,
}: {
  pool: PoolMember[];
  onAddToPool: (athlete: Athlete) => void;
  poolResolving: boolean;
}) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(pool[0]?.athlete.id ?? '');
  const [showAddPicker, setShowAddPicker] = useState(false);
  const { videoRef, videoSize, frame, cameraError, modelError, ready } = usePoseLandmarker(true);
  const orientation = useDeviceOrientation();

  const selected = pool.find((m) => m.athlete.id === selectedAthleteId) ?? pool[0];
  const rightKnee = frame?.landmarks[POSE_LANDMARK.rightKnee];

  return (
    <div className="relative -mx-md -mt-24 h-screen overflow-hidden bg-canvas sm:-mt-28">
      {/* No mirroring here - that's a front/selfie-camera convention (so the
          preview matches what looking in a real mirror feels like). This is
          the rear ("environment") camera filming a bowler from the side;
          mirroring it would show the delivery reversed left-right, which is
          actively misleading for a coach checking framing. Confirmed as a
          real bug on-device during the Milestone 0.5 spike (2026-09-13) -
          doesn't affect the actual keypoint data sent to the backend, since
          CSS transforms never touch what detectForVideo reads from the
          <video> element, only the on-screen preview. */}
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

      {/* Quick-select strip: pool members only, one tap, no search - see
          CAPTURE_PLAN.md §6. Selected name rendered large enough that a
          wrong pick is obvious before recording, not after. */}
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
        </div>
        {selected && (
          <p className="text-h3 font-medium text-ink">{selected.athlete.name}</p>
        )}
      </div>

      <div className="absolute left-4 top-4 rounded-xl border border-line bg-black/55 p-3 backdrop-blur-sm">
        <DiagnosticRow label="Video" value={videoSize ? `${videoSize.width}x${videoSize.height}` : '—'} />
        <DiagnosticRow label="Landmarks" value={frame ? frame.landmarks.length : '—'} />
        <DiagnosticRow
          label="Right knee visibility"
          value={rightKnee ? rightKnee.visibility.toFixed(2) : '—'}
        />
        <DiagnosticRow
          label="Inference time"
          value={frame ? `${frame.inferenceMs.toFixed(1)}ms` : '—'}
        />
        {!ready && !cameraError && !modelError && <DiagnosticRow label="Status" value="Loading…" />}
        {cameraError && <DiagnosticRow label="Camera error" value={cameraError} isError />}
        {modelError && <DiagnosticRow label="Model error" value={modelError} isError />}
      </div>

      <AlignmentOverlay bowlingArm={selected?.athlete.bowling_arm ?? null} orientation={orientation} />

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

/** Which side of the bowler the tripod goes on, per the front-leg reasoning
 *  in BACKEND_PLAN.md's Milestone 9 notes and CAPTURE_PLAN.md §2: the front
 *  (landing) leg is the near, unoccluded one for a side-on sagittal-crease
 *  view (CoachLens_PRD.md), and it follows deterministically from the
 *  bowling arm - a right-arm bowler lands on the left leg, so the camera
 *  belongs on the bowler's left to keep that leg nearest and unobstructed. */
function tripodSideFor(bowlingArm: BowlingArm | null): string {
  if (bowlingArm === 'RIGHT') return "bowler's left side";
  if (bowlingArm === 'LEFT') return "bowler's right side";
  return 'bowling arm not set on this athlete — front leg side unknown';
}

/** Guided alignment overlay for CAPTURE_PLAN.md Milestone 1's PRD capture
 *  constraints: 2.8-3.2m distance and 1.1m tripod height (CoachLens_PRD.md)
 *  have no browser-sensor equivalent - there's no depth or altitude API - so
 *  those stay as a static checklist the coach confirms by eye/tape measure,
 *  same as they would with any tripod setup. Roll/pitch <3° *is* sensable
 *  via `deviceorientation`, with one caveat: the API has no reliable
 *  cross-device "phone is perfectly upright" absolute reading (unlike
 *  `expo-sensors` on native), so rather than assume beta=90/gamma=0 as the
 *  target, the coach taps "Set level" once the tripod's own bubble level (if
 *  it has one) or a visual check confirms it's level, and this tracks drift
 *  *from that baseline* rather than from an assumed absolute. Roll (gamma)
 *  is shown against an absolute 0 too, since side-to-side tilt is reliable
 *  across devices regardless of mounting pitch. */
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
            value={reading ? `${reading.roll.toFixed(1)}°` : '—'}
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
