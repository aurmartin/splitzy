import { useSupabaseAuth } from "@/components/system-provider";
import { Href, SplashScreen, router } from "expo-router";
import React from "react";

export default function Index() {
  const auth = useSupabaseAuth();

  React.useEffect(() => {
    auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          router.replace("/protected" as Href);
        } else {
          throw new Error("Signin required");
        }
      })
      .catch(() => {
        router.replace("/login" as Href);
      })
      .finally(() => {
        SplashScreen.hideAsync();
      });
  }, [auth]);

  return null;
}
