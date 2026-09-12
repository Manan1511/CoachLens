import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useRunOnJS, useSharedValue } from 'react-native-worklets-core';

/**
 * MOBILE_PLAN.md Milestone 0.5 — the capture spike, deliberately doing as
 * little as possible. Before any UI or MediaPipe integration is built, this
 * screen answers the two cheapest, most load-bearing questions:
 *
 *  1. Does react-native-vision-camera's frame-processor plumbing (which
 *     depends on BOTH react-native-worklets-core and react-native-worklets
 *     compiling worklets side by side — see babel.config.js) actually run
 *     on this exact stack (Expo SDK 57, RN 0.86, React 19, New
 *     Architecture)? Nothing about that combination is confirmed yet.
 *  2. What fps/resolution does the device actually grant, versus what was
 *     requested? MOBILE_PLAN.md §7 is explicit that the *achieved* values
 *     must be shown, never the requested ones.
 *
 * No MediaPipe here yet. Wiring up an unverified third-party pose plugin
 * before this baseline is proven would make two unknowns indistinguishable
 * if something breaks - is it the plugin, or the frame-processor plumbing
 * itself? Get this working first, on a real device.
 *
 * VERIFIED on a real device (2026-09-12, Samsung A01/A015): both worklet
 * runtimes coexist correctly in one Babel pass, the frame processor fires
 * at the real camera rate, and achieved format is 3840x2160 @ 30fps on
 * this hardware - notably not the 60/120fps the PRD wants, which this
 * budget device may simply not support at any resolution. Worth checking
 * on higher-end hardware before assuming 30fps is the general ceiling.
 */
export function CaptureSpikeScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [{ fps: 120 }, { videoResolution: 'max' }]);

  const [measuredFps, setMeasuredFps] = useState<number | null>(null);
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Bridges from the frame-processor worklet thread back to the JS thread.
  // This must be react-native-worklets-core's useRunOnJS, not Reanimated's
  // runOnJS - the frame processor runs on VisionCamera's own worklet
  // context (powered by worklets-core), not Reanimated's.
  const reportFrame = useRunOnJS((width: number, height: number, fps: number) => {
    console.log(`[fps-debug] achieved ${width}x${height} @ ${fps}fps`);
    setFrameSize({ width, height });
    setMeasuredFps(fps);
  }, []);

  // Regression finding (2026-09-12, real device): a plain module-scope
  // `let`/`const` array mutated inside this worklet did NOT persist across
  // frame invocations - logcat showed the array length stuck at exactly 1
  // on every single call despite frames genuinely arriving ~33ms apart
  // (confirmed from frame.timestamp deltas). Whatever closure serialization
  // this worklets-core version does for the frame processor, it does not
  // treat an outer mutable array as a stable shared reference across calls.
  // useSharedValue is worklets-core's actual supported mechanism for state
  // that must survive across worklet invocations - use that, not a bare
  // module-level variable, for anything mutated inside a frame processor.
  const frameCount = useSharedValue(0);
  const windowStartMs = useSharedValue(0);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const nowMs = frame.timestamp / 1_000_000;
      if (windowStartMs.value === 0) {
        windowStartMs.value = nowMs;
      }
      frameCount.value += 1;

      const elapsedMs = nowMs - windowStartMs.value;
      if (elapsedMs >= 1000) {
        const fps = Math.round((frameCount.value / elapsedMs) * 1000);
        reportFrame(frame.width, frame.height, fps);
        frameCount.value = 0;
        windowStartMs.value = nowMs;
      }
    },
    [reportFrame, frameCount, windowStartMs],
  );

  const requestedFormat = useMemo(
    () => (format ? `${format.videoWidth}x${format.videoHeight} @ ${format.maxFps}fps (requested)` : 'no format'),
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
        frameProcessor={frameProcessor}
      />
      <View style={styles.overlay}>
        <Text style={styles.label}>REQUESTED</Text>
        <Text style={styles.value}>{requestedFormat}</Text>
        <Text style={styles.label}>ACHIEVED (measured)</Text>
        <Text style={styles.value}>
          {frameSize ? `${frameSize.width}x${frameSize.height}` : '—'} @ {measuredFps ?? '—'}fps
        </Text>
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
    marginTop: 8,
  },
  value: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '400',
  },
});
