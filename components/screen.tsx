import { Colors } from "@/lib/constants";
import { type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const Screen = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => {
  return (
    <SafeAreaView
      style={[
        { flex: 1, backgroundColor: Colors.background, padding: 8 },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
};
