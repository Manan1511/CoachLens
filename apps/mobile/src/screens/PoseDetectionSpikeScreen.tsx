import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import {
  Delegate,
  KnownPoseLandmarks,
  RunningMode,
  usePoseDetection,
  type PoseDetectionResultBundle,
} from 'react-native-mediapipe';

/**
 * MOBILE_PLAN.md Milestone 0.5 — attempting a real MediaPipe pose plugin,
 * now that the frame-processor baseline itself is proven (CaptureSpikeScreen).
 * This is the actual open question the milestone was written for: does ANY
 * MediaPipe plugin run on Expo SDK 57 / RN 0.86 / React 19 / New
 * Architecture? Nothing confirms that until landmarks come back on a real
 * device.
 *
 * Model: pose_landmarker_lite.task (Google's official MediaPipe Tasks
 * model), bundled into Android's native assets/ folder by
 * plugins/withPoseLandmarkerModel.js during prebuild - see that file for
 * why a custom config plugin was needed (the library's own example gets
 * the model in via a raw Gradle download task, which Expo's managed
 * workflow regenerates away on every build).
 *
 * Deliberately uses RunningMode.LIVE_STREAM (the only live-camera mode
 * this library exposes at the JS level - RunningMode.VIDEO exists in the
 * type enum but isn't wired up by any exported function, so batch-
 * processing a recorded clip isn't available through this library's
 * current API). That means this screen reintroduces the same
 * live-preview-plus-frameProcessor combination that broke orientation on
 * CaptureSpikeScreen (see MOBILE_PLAN.md's Dead End Registry) - accepted
 * here since the goal is only to prove real landmark data comes back, not
 * to ship a correctly-oriented preview. The real app's buffered pipeline
 * (Milestone 2) still won't hit that bug, since it never runs a processor
 * during an actively-displayed rotatable preview.
 */
export function PoseDetectionSpikeScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [landmarkCount, setLandmarkCount] = useState<number | null>(null);
  const [kneeConfidence, setKneeConfidence] = useState<number | null>(null);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const poseDetection = usePoseDetection(
    {
      onResults: (result: PoseDetectionResultBundle) => {
        const firstPose = result.results[0]?.landmarks[0];
        setLandmarkCount(firstPose?.length ?? 0);
        setInferenceMs(result.inferenceTime);
        const knee = firstPose?.[KnownPoseLandmarks.rightKnee];
        setKneeConfidence(knee?.visibility ?? null);
      },
      onError: (error) => {
        setDetectionError(`${error.code}: ${error.message}`);
      },
    },
    RunningMode.LIVE_STREAM,
    'pose_landmarker_lite.task',
    { delegate: Delegate.CPU }, // GPU delegate untested first - see spike notes
  );

  useEffect(() => {
    poseDetection.cameraDeviceChangeHandler(device);
  }, [device, poseDetection]);

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
        isActive={true}
        frameProcessor={poseDetection.frameProcessor}
        onLayout={poseDetection.cameraViewLayoutChangeHandler}
      />
      <View style={styles.overlay}>
        <Text style={styles.label}>LANDMARKS</Text>
        <Text style={styles.value}>{landmarkCount ?? '—'}</Text>
        <Text style={styles.label}>RIGHT KNEE VISIBILITY</Text>
        <Text style={styles.value}>{kneeConfidence !== null ? kneeConfidence.toFixed(2) : '—'}</Text>
        <Text style={styles.label}>INFERENCE TIME</Text>
        <Text style={styles.value}>{inferenceMs !== null ? `${inferenceMs.toFixed(1)}ms` : '—'}</Text>
        {detectionError && (
          <>
            <Text style={styles.label}>ERROR</Text>
            <Text style={[styles.value, styles.errorText]}>{detectionError}</Text>
          </>
        )}
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
  errorText: {
    fontSize: 13,
    color: '#f0776c',
  },
});
