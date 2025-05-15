import { Pressable, type PressableProps } from "@/components/pressable";
import { Text } from "@/components/text";
import { Colors } from "@/lib/constants";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";

interface ButtonProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  type?: "primary" | "secondary";
}

export default function Button(props: ButtonProps) {
  const { type = "primary", children, style, ...rest } = props;

  return (
    <Pressable
      {...rest}
      style={[styles.button, styles[type], style]}
      accessibilityRole="button"
    >
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: "white",
  },
  secondary: {
    backgroundColor: "transparent",
  },
  button: {
    borderRadius: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  text: {
    color: Colors.primary,
  },
});
