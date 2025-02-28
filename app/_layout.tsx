import DevUi from "@/components/dev-ui";
import { Screen } from "@/components/screen";
import { SnackBarProvider } from "@/components/snack-bar";
import { SystemProvider } from "@/components/system-provider";
import { Text } from "@/components/text";
import { Colors } from "@/lib/constants";
import { Env } from "@/lib/env";
import { System } from "@/lib/system";
import Aptabase from "@aptabase/react-native";
import { type FallbackRender } from "@sentry/react";
import * as Sentry from "@sentry/react-native";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { openDatabaseSync } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Platform, View, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

Sentry.init({
  dsn: "https://3aee514840b1dc9932c41c86ef30e6cb@o4507203999694848.ingest.de.sentry.io/4508896492060752",
  environment: Env.APP_ENV,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

Aptabase.init("A-EU-5706290686", {
  appVersion: Env.VERSION,
});

SplashScreen.preventAutoHideAsync();

const sqliteDatabase = openDatabaseSync("sqlite.db", {
  enableChangeListener: true,
});

sqliteDatabase.runSync("PRAGMA journal_mode = WAL");

const db = drizzle(sqliteDatabase);

const system = new System(db);

export default function RootLayout() {
  const colorScheme = useColorScheme();

  React.useEffect(() => {
    system.init();

    Aptabase.trackEvent("open_app");
  }, []);

  return (
    <Sentry.ErrorBoundary fallback={ErrorBoundary}>
      <GestureHandlerRootView>
        <SnackBarProvider>
          <SystemProvider system={system}>
            <StatusBar style={colorScheme === "dark" ? "dark" : "light"} />

            <Stack screenOptions={{ headerShown: false }} />

            {Platform.OS === "web" ? <DevUi /> : null}
          </SystemProvider>
        </SnackBarProvider>
      </GestureHandlerRootView>
    </Sentry.ErrorBoundary>
  );
}

const ErrorBoundary: FallbackRender = ({ resetError }) => {
  return (
    <Screen>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Text type="title">Oops, une erreur est survenue...</Text>
        <Text
          type="titleMedium"
          style={{ color: Colors.primary }}
          onPress={resetError}
        >
          Retour
        </Text>
      </View>
    </Screen>
  );
};
