import { createContext, useContext, type ReactNode } from 'react';

/* Scroll animations must not start while the intro overlay is still up —
 * otherwise they play out of sight behind it and are finished by the time
 * the visitor sees the page. The old site enforced this with
 * `playIntro().then(initAnimations)`; here it's an explicit flag. */
const AnimationReadyContext = createContext(false);

export function AnimationReadyProvider({
  ready,
  children,
}: {
  ready: boolean;
  children: ReactNode;
}) {
  return (
    <AnimationReadyContext.Provider value={ready}>{children}</AnimationReadyContext.Provider>
  );
}

export function useAnimationsReady(): boolean {
  return useContext(AnimationReadyContext);
}
