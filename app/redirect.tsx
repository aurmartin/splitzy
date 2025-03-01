import LoadingScreen from "@/components/loading-screen";
import { useSystem } from "@/components/system-provider";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React from "react";
import * as Sentry from "@sentry/react-native";

export default function RedirectScreen() {
  const url = Linking.useLinkingURL();
  const system = useSystem();

  const createSessionFromUrl = React.useCallback(
    async (url: string) => {
      const { params, errorCode } = QueryParams.getQueryParams(url);

      if (errorCode) {
        console.error(errorCode);
        return router.replace("/login");
      }

      const { access_token, refresh_token } = params;

      if (!access_token) {
        console.error("No access_token provided");
        return router.replace("/login");
      }

      const { error } = await system.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error(error);
        router.replace("/login");
      } else {
        router.replace("/protected");
      }
    },
    [system],
  );

  React.useEffect(() => {
    if (url) {
      try {
        setTimeout(() => createSessionFromUrl(url), 0);
      } catch (error) {
        Sentry.captureException(error);
        console.error(error);
      }
    }
  }, [url, createSessionFromUrl]);

  return <LoadingScreen message="Logging in..." />;
}
