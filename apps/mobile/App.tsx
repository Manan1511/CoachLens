import { StatusBar } from 'expo-status-bar';

import { PoseDetectionSpikeScreen } from './src/screens/PoseDetectionSpikeScreen';

/**
 * MOBILE_PLAN.md Milestone 0.5 spike is the app's whole surface right now.
 * Real screens (§5: launch, sign-in, session setup, capture, verdict) are
 * deliberately not built yet - see the milestone's own docstring for why.
 *
 * Temporarily rendering PoseDetectionSpikeScreen instead of
 * CaptureSpikeScreen to test a real MediaPipe pose plugin end-to-end.
 * Swap back to CaptureSpikeScreen (proven working, correctly oriented) once
 * this is verified.
 */
export default function App() {
  return (
    <>
      <PoseDetectionSpikeScreen />
      <StatusBar style="light" hidden />
    </>
  );
}
