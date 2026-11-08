import type { ConfigContext, ExpoConfig } from "@expo/config";

import { ClientEnv, Env } from "./env";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: Env.NAME,
  description: `${Env.NAME} Mobile App`,
  owner: Env.EXPO_ACCOUNT_OWNER,
  scheme: Env.SCHEME,
  slug: "splitzy",
  version: Env.VERSION.toString(),
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: Env.BUNDLE_ID,
    appleTeamId: "AVS7SR2AV8",
    config: {
      usesNonExemptEncryption: false, // Avoid the export compliance warning on the app store
    },
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
    },
  },
  // Translations of the native strings (permission prompts). English ones are set by the plugins below.
  locales: {
    fr: "./lib/i18n/native/fr.json",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#F7F3ED",
    },
    package: Env.PACKAGE,
  },
  web: {
    bundler: "metro",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-status-bar",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#F7F3ED",
      },
    ],
    ["expo-localization", { supportedLocales: ["en", "fr"] }],
    "expo-sqlite",
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "splitzy",
        organization: "aurmartin",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "The app accesses your photos to scan receipts.",
        cameraPermission: "The app accesses your camera to scan receipts.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...ClientEnv,
    eas: {
      projectId: Env.EAS_PROJECT_ID,
    },
  },
});
