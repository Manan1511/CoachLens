const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

/**
 * react-native-mediapipe has no Expo config plugin of its own, and its
 * model-loading call (`setModelAssetPath` on the native Kotlin side, in
 * PoseDetectorHelper.kt) expects a filename resolvable inside Android's
 * bundled `assets/` folder - not an arbitrary filesystem path, not a JS
 * bundler asset (those are different mechanisms; expo-asset does not put
 * files where MediaPipe's native AssetManager-based loader looks).
 *
 * The library's own example app gets the model into that folder via a raw
 * Gradle `Download` task in android/app/build.gradle
 * (examples/posedetection/android/app/download_tasks.gradle) - not
 * available to us, since Expo's managed workflow regenerates the android/
 * directory from scratch on every prebuild (which is what every EAS Build
 * does), so a hand-edited build.gradle would just be discarded.
 *
 * This plugin does the equivalent for a managed app: copy a model file we
 * already committed to the repo (assets/models/) into
 * android/app/src/main/assets/ during prebuild, via withDangerousMod -
 * Expo's supported escape hatch for exactly this "touch the generated
 * native project directly" need. Downloading at build time (matching the
 * original Gradle task) was the alternative; copying a file we control
 * avoids depending on Google's CDN being reachable during every EAS build
 * and keeps the exact model version pinned in the repo.
 */
const MODELS = ['pose_landmarker_lite.task'];

const withPoseLandmarkerModel = (config) =>
  withDangerousMod(config, [
    'android',
    (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets',
      );
      fs.mkdirSync(assetsDir, { recursive: true });

      for (const model of MODELS) {
        const source = path.join(config.modRequest.projectRoot, 'assets', 'models', model);
        if (!fs.existsSync(source)) {
          throw new Error(
            `withPoseLandmarkerModel: expected model file at ${source} - was it committed to the repo?`,
          );
        }
        fs.copyFileSync(source, path.join(assetsDir, model));
      }

      return config;
    },
  ]);

module.exports = withPoseLandmarkerModel;
