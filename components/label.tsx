import { StyleProp, StyleSheet, TextStyle } from "react-native";
import { Text } from "@/components/text";

interface LabelProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export default function Label(props: LabelProps) {
  return (
    <Text type="titleMedium" style={[styles.label, props.style]}>
      {props.children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 2,
    textTransform: "uppercase",
  },
});
