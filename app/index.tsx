import { useSystem } from "@/components/system-provider";
import { Redirect } from "expo-router";

export default function Index() {
  const system = useSystem();

  if (system.supabaseConnector.hasLocalSession()) {
    return <Redirect href="/protected" />;
  } else {
    return <Redirect href="/login" />;
  }
}
