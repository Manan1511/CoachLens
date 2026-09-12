import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api/client';
import { useAsync } from '@/hooks/useAsync';
import { usePoseLandmarker, POSE_LANDMARK } from '@/lib/pose/usePoseLandmarker';
import { useSessionPool, type PoolMember } from '@/lib/pose/useSessionPool';
import { useDeviceOrientation } from '@/lib/pose/useDeviceOrientation';
import { useDeliveryCapture } from '@/lib/pose/useDeliveryCapture';
import type { Athlete, BowlingArm } from '@/lib/api/types';

/** CAPTURE_PLAN.md Milestone 1: session-pool setup, then a quick-select
 *  capture screen. Two views in one component rather than two routes -
 *  there's no reason to leave a URL history entry for "picked the pool",
 *  and a coach re-visiting mid-session should land straight on the capture
 *  screen if a pool is already resolved (see useSessionPool's localStorage
 *  persistence).
 *
 *  Milestone 0.5 (real WASM inference cost on target hardware) is done -
 *  see CAPTURE_PLAN.md. The diagnostic readout (video/landmarks/inference
 *  time) stays visible since it's cheap to keep and useful for any future
 *  regression. The CPU-vs-GPU delegate bench that lived here briefly during
 *  that milestone's investigation was removed once capture itself was
 *  working - it was debug tooling, not something a coach needs on this
 *  screen; the desktop-hardware finding it produced (GPU ~3x faster than CPU
 *  when it actually engages) is recorded in CAPTURE_PLAN.md, and the
 *  still-open question of whether the phone's GPU delegate is really
 *  engaging can be re-run via camera-debug.html-style ad hoc script next
 *  time the device is connected, rather than carrying the tooling in
 *  production code indefinitely. */
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
  const { videoRef, videoSize, frame, cameraError, modelError, ready } = usePoseLandmarker(true);
  const orientation = useDeviceOrientation();
  const navigate = useNavigate();

  const selected = pool.find((m) => m.athlete.id === selectedAthleteId) ?? pool[0];
  const rightKnee = frame?.landmarks[POSE_LANDMARK.rightKnee];

  const capture = useDeliveryCapture({
    sessionId: selected?.sessionId ?? '',
    bowlingArm: selected?.athlete.bowling_arm ?? null,
    frame,
    videoSize,
    cameraRollDeg: orientation.reading?.roll ?? null,
  });

  // Navigation is a side effect of a state transition, not something to
  // trigger inline from the submit handler - useDeliveryCapture doesn't
  // know about routing, and reaching 'done' via a re-render (not a direct
  // callback) is what keeps that separation clean.
  useEffect(() => {
    if (capture.state.status === 'done') {
      navigate(`/app/deliveries/${capture.state.report.delivery_id}`);
    }
  }, [capture.state, navigate]);

  const canCapture =
    ready && !cameraError && !modelError && !!selected?.athlete.bowling_arm &&
    capture.state.status !== 'recording' && capture.state.status !== 'submitting';

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

      {/* CAPTURE_PLAN.md Milestone 3: one tap buffers CAPTURE_WINDOW_MS of
          frames, extracts + submits them, and (via the effect above) lands
          on the existing DeliveryReportPage for the verdict - no separate
          verdict UI built here, since VerdictCard/NudgeFfsControl/
          ActionBar/WhatsAppExport already exist and cover it. */}
      <div className="absolute inset-x-0 bottom-[7.5rem] flex flex-col items-center gap-2 px-md">
        {!selected?.athlete.bowling_arm && (
          <p className="rounded-full bg-black/70 px-4 py-2 text-caption text-ink-dim backdrop-blur-sm">
            Bowling arm not set for {selected?.athlete.name ?? 'this athlete'} — can't determine the front leg.
          </p>
        )}
        {capture.state.status === 'error' && (
          <p className="rounded-full bg-status-red/16 px-4 py-2 text-caption text-status-red backdrop-blur-sm">
            {capture.state.message}
          </p>
        )}
        <button
          type="button"
          onClick={capture.start}
          disabled={!canCapture}
          className="flex items-center gap-2 rounded-full bg-status-red px-6 py-3.5 text-body font-semibold text-white shadow-glow-strong transition-opacity disabled:opacity-40"
        >
          <span className="size-3 rounded-full bg-white" aria-hidden />
          {capture.state.status === 'recording'
            ? `Capturing… ${capture.state.framesCaptured}`
            : capture.state.status === 'submitting'
              ? 'Sending…'
              : 'Capture delivery'}
        </button>
      </div>

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
          {/* Pushed to the far end of the scroll strip rather than given its
              own prominent spot - ending the session is rare and a
              one-tap-to-undo-everything action shouldn't be the easiest
              thing to hit. Confirmation sheet below is the actual guard. */}
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
              {/* Only the local pool selection is lost - the deliveries and
                  sessions already recorded for these athletes stay exactly as
                  they are server-side. This is un-picking who's at the nets,
                  not deleting anything. */}
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
                onClick={onEndSession}
                className="flex-1 rounded-full bg-status-red/16 px-4 py-3 text-body font-semibold text-status-red"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}

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
