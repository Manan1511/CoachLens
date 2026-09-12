import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/http';
import type { CoachingReport, KeypointFrame } from '@/lib/api/types';

/** Extracted from useDeliveryCapture.ts: builds a DeliveryIngestionRequest
 *  from a pre-sliced KeypointFrame[] array and submits it. Used by both
 *  useSpellCapture (auto-trigger) and the manual fallback, so the
 *  fps/jitter/payload logic lives in one place, not two. */

interface SliceSubmitArgs {
  frames: KeypointFrame[];
  timestamps: number[];
  sessionId: string;
  cameraRollDeg: number;
}

function generateDeliveryId(): string {
  return `DEL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function submitDeliverySlice({
  frames,
  timestamps,
  sessionId,
  cameraRollDeg,
}: SliceSubmitArgs): Promise<CoachingReport> {
  if (frames.length === 0) {
    throw new Error('Cannot submit an empty delivery slice.');
  }

  const deltas = timestamps.slice(1).map((t, i) => t - timestamps[i]);
  const meanDelta = deltas.reduce((a, b) => a + b, 0) / (deltas.length || 1);
  const fps = meanDelta > 0 ? 1000 / meanDelta : 0;
  const variance = deltas.reduce((a, d) => a + (d - meanDelta) ** 2, 0) / (deltas.length || 1);
  const jitterPct = meanDelta > 0 ? (Math.sqrt(variance) / meanDelta) * 100 : 0;

  const payload = {
    delivery_id: generateDeliveryId(),
    session_id: sessionId,
    capture_metadata: {
      fps: Math.round(fps),
      pacing_jitter_pct: Math.round(jitterPct * 10) / 10,
      shutter_speed_sec: null,
      distance_meters: 3.0,
      tripod_height_meters: 1.1,
      camera_roll_deg: cameraRollDeg,
    },
    raw_keypoints: frames,
  };

  return api.submitDelivery(payload);
}

/** Wraps submitDeliverySlice with error message extraction for UI consumers. */
export async function submitDeliverySliceSafe(
  args: SliceSubmitArgs,
): Promise<{ ok: true; report: CoachingReport } | { ok: false; message: string }> {
  try {
    const report = await submitDeliverySlice(args);
    return { ok: true, report };
  } catch (err) {
    const message =
      err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }
}
