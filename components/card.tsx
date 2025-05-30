import { Pressable } from "@/components/pressable";
import { View, type StyleProp, type ViewStyle } from "react-native";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function Card(props: CardProps) {
  if (props.onPress) {
    return (
      <Pressable
        style={[
          {
            borderRadius: 8,
            backgroundColor: "white",
            overflow: "hidden",
            padding: 14,
          },
          props.style,
        ]}
        android_ripple={{ color: "hsl(0, 0, 40%)" }}
        onPress={props.onPress}
      >
        {props.children}
      </Pressable>
    );
  } else {
    return (
      <View
        style={[
          {
            backgroundColor: "white",
            borderRadius: 8,
            padding: 14,
          },
          props.style,
        ]}
      >
        {props.children}
      </View>
    );
  }
}
