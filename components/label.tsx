import { StyleSheet } from "react-native";
import { Text } from "@/components/text";

export default function Label(props: { children: React.ReactNode }) {
  return <Text style={styles.label}>{props.children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 4,
  },
});
