module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Two separate worklet runtimes coexist in this stack, both of which
      // transform the 'worklet' directive:
      //  - react-native-worklets-core powers VisionCamera's frame processors
      //  - react-native-worklets powers Reanimated 4 (react-native-reanimated
      //    /plugin is now just a re-export of this, per its own source)
      // Whether these two plugins interact cleanly in one Babel pass is
      // UNVERIFIED - this exact ordering (vision-camera's plugin first) is
      // the community-recommended convention, not something confirmed
      // against this specific dependency combination. Milestone 0.5's spike
      // must confirm both a frame-processor worklet (vision-camera) and a
      // UI-thread worklet (reanimated) actually run correctly side by side
      // before anything is built on top of this assumption. See
      // MOBILE_PLAN.md's Dead End Registry if this turns out not to work.
      'react-native-worklets-core/plugin',
      'react-native-worklets/plugin',
    ],
  };
};
