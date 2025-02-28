import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/lib/constants";

export const Screen = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.background, padding: 8 }}
    >
      {children}
    </SafeAreaView>
  );
};
