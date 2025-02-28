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
  newArchEnabled: true,
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#F7F3ED",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: Env.BUNDLE_ID,
    config: {
      usesNonExemptEncryption: false, // Avoid the export compliance warning on the app store
    },
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
    "expo-localization",
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "splitzy",
        organization: "aurmartin",
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
