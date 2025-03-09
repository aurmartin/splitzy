import {
  Pressable as RNPressable,
  StyleSheet,
  type PressableProps as RNPressableProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";

interface PressableProps extends RNPressableProps {
  style?: StyleProp<ViewStyle>;
}

function Pressable(props: PressableProps) {
  const {
    style: styleProps,
    android_ripple: androidRippleProps,
    ...rest
  } = props;

  const style: StyleProp<ViewStyle> = StyleSheet.compose(styleProps, {
    overflow: "hidden",
  });

  const androidRipple = {
    ...androidRippleProps,
    borderless: false,
    foreground: true,
  };

  return (
    <RNPressable style={style} android_ripple={androidRipple} {...rest}>
      {props.children}
    </RNPressable>
  );
}

export { Pressable, type PressableProps };
