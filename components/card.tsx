import { View } from "react-native";
import { Pressable } from "react-native-gesture-handler";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
}

export default function Card(props: CardProps) {
  const containerStyle = {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 14,
  };

  if (props.onPress) {
    return (
      <Pressable
        onPress={props.onPress}
        style={containerStyle}
        android_ripple={{}}
      >
        {props.children}
      </Pressable>
    );
  } else {
    return <View style={containerStyle}>{props.children}</View>;
  }
}
