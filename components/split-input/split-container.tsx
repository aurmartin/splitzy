import { View } from "react-native";

const SplitContainer = (props: { children: React.ReactNode }) => {
  return <View style={{ flex: 1, gap: 8 }}>{props.children}</View>;
};

export { SplitContainer };
