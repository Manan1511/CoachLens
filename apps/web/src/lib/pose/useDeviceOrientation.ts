import { useCallback, useEffect, useState } from 'react';

/** CAPTURE_PLAN.md Milestone 1: the PRD's roll/pitch <3° tripod-alignment
 *  constraint (CoachLens_PRD.md §"Tripod Height"/capture setup). Native's
 *  `expo-sensors` gave a clean cross-platform reading; the browser
 *  equivalent is the `deviceorientation` event, which is rougher (no fixed
 *  cross-browser guarantee on axis convention, and iOS Safari gates it
 *  behind an explicit user-gesture permission prompt - Android Chrome does
 *  not need one). `beta` (front/back tilt, -180..180) is treated as pitch,
 *  `gamma` (left/right tilt, -90..90) as roll - the tripod's phone clamp is
 *  assumed to hold the phone in portrait, upright, which is what makes this
 *  axis mapping the correct one for "is the tripod itself level" rather than
 *  "is the phone screen level" (a phone lying flat on a table would need a
 *  different mapping entirely, but that's not this use case). */

export interface OrientationReading {
  roll: number;
  pitch: number;
}

interface UseDeviceOrientationResult {
  reading: OrientationReading | null;
  /** iOS Safari only: null until requested, since the permission prompt
   *  must be triggered from a user gesture (a button tap), not on mount. */
  permissionState: 'unknown' | 'granted' | 'denied' | 'not-required';
  requestPermission: () => Promise<void>;
  supported: boolean;
}

type DeviceOrientationEventIOS = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export function useDeviceOrientation(): UseDeviceOrientationResult {
  const [reading, setReading] = useState<OrientationReading | null>(null);
  const [permissionState, setPermissionState] =
    useState<UseDeviceOrientationResult['permissionState']>('unknown');

  const supported = typeof DeviceOrientationEvent !== 'undefined';

  const needsExplicitPermission =
    supported && typeof (DeviceOrientationEvent as DeviceOrientationEventIOS).requestPermission === 'function';

  useEffect(() => {
    if (!supported) return;
    if (needsExplicitPermission && permissionState !== 'granted') return;

    function handle(event: DeviceOrientationEvent) {
      if (event.beta === null || event.gamma === null) return;
      setReading({ roll: event.gamma, pitch: event.beta });
    }

    window.addEventListener('deviceorientation', handle);
    return () => window.removeEventListener('deviceorientation', handle);
  }, [supported, needsExplicitPermission, permissionState]);

  useEffect(() => {
    if (supported && !needsExplicitPermission) setPermissionState('not-required');
  }, [supported, needsExplicitPermission]);

  const requestPermission = useCallback(async () => {
    if (!needsExplicitPermission) return;
    try {
      const result = await (DeviceOrientationEvent as DeviceOrientationEventIOS).requestPermission!();
      setPermissionState(result === 'granted' ? 'granted' : 'denied');
    } catch {
      setPermissionState('denied');
    }
  }, [needsExplicitPermission]);

  return { reading, permissionState, requestPermission, supported };
}
