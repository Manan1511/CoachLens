import { StatusBar } from 'expo-status-bar';

import { CaptureSpikeScreen } from './src/screens/CaptureSpikeScreen';

/**
 * MOBILE_PLAN.md Milestone 0.5 spike is the app's whole surface right now.
 * Real screens (§5: launch, sign-in, session setup, capture, verdict) are
 * deliberately not built yet - see the milestone's own docstring for why.
 */
export default function App() {
  return (
    <>
      <CaptureSpikeScreen />
      <StatusBar style="light" hidden />
    </>
  );
}
