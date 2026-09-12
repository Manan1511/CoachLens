import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission } from 'react-native-vision-camera';

/**
 * MOBILE_PLAN.md Milestone 0.5 — the capture spike.
 *
 * PIVOT (2026-09-12, real device): the first version of this screen
 * attached a live `frameProcessor` directly to the always-on preview, to
 * verify frame-processor plumbing and measure achieved fps at the same
 * time. That combination hit a confirmed upstream bug
 * (mrousavy/react-native-vision-camera #3526, #3259, #210): the preview
 * does not rotate correctly with the locked screen orientation while a
 * frameProcessor is attached. Three fix attempts failed on this device -
 * a manual dimension-swap-plus-rotate transform produced a stretched
 * image (fighting the library's own internal preview scaling), and
 * forcing a full native-view remount on orientation change (keyed to
 * window dimensions) didn't correct it either.
 *
 * The actual fix is architectural, not a workaround: MOBILE_PLAN.md §8
 * already decided real capture is buffered-then-extract, not live
 * frame-by-frame processing - MediaPipe can't sustain 120fps inference
 * anyway, so nothing in the real app needs a frameProcessor attached
 * during live preview. This screen was combining the two only for
 * diagnostic convenience. Removing the live frameProcessor here fixes
 * the preview (proven correctly oriented and unstretched without it) and
 * matches the architecture that was always the plan - it isn't a
 * downgrade of what got tested.
 *
 * Frame-processor plumbing itself was already proven working in the
 * earlier version: both worklet runtimes (react-native-worklets-core and
 * react-native-worklets) compiled and ran together, and the processor
 * reported real, correct camera-rate data (3840x2160 @ 30fps, matching
 * frame.timestamp deltas from real device logs) before this pivot. That
 * result stands - only the *live-preview-plus-processor* combination is
 * the problem, not frame processors in general. Milestone 2's buffered
 * capture pipeline (record window -> stop -> run extraction against the
 * buffered frames, preview not active during extraction) sidesteps this
 * bug by construction, since the processor never runs while the preview
 * is both active and rotatable at the same time.
 */
export function CaptureSpikeScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [{ fps: 120 }, { videoResolution: 'max' }]);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const requestedFormat = useMemo(
    () => (format ? `${format.videoWidth}x${format.videoHeight} @ ${format.maxFps}fps` : 'no format'),
    [format],
  );

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>No back camera device found.</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>Camera permission not granted.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        fps={format?.maxFps}
        isActive={true}
      />
      <View style={styles.overlay}>
        <Text style={styles.label}>FORMAT</Text>
        <Text style={styles.value}>{requestedFormat}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  status: {
    flex: 1,
    color: '#ffffff',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
  },
  overlay: {
    position: 'absolute',
    top: 24,
    left: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    padding: 12,
  },
  label: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  value: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '400',
  },
});
