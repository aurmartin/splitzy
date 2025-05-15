import {
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Text } from "./text";
import React from "react";

type TextInputProps = {
  label?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  ref?: React.Ref<RNTextInput>;
} & RNTextInputProps;

function TextInput(props: TextInputProps) {
  const { ref, label, right, style, ...rest } = props;

  return (
    <View
      style={[
        {
          borderRadius: 8,
          paddingHorizontal: 16,
          backgroundColor: "#fff",
          flexDirection: "row",
          alignItems: "center",
          height: 55,
        },
        style,
      ]}
    >
      {label ? <Text>{label}</Text> : null}

      <View style={{ flex: 1, justifyContent: "center" }}>
        <RNTextInput
          {...rest}
          ref={ref}
          style={{
            flex: 1,
            textAlign: label ? "right" : "left",
            fontSize: 16,
            paddingTop: 0,
            paddingBottom: 0,
          }}
          placeholderTextColor="#888"
          accessibilityLabel={label}
        />
      </View>

      {right ? <View style={{ marginLeft: 2 }}>{right}</View> : null}
    </View>
  );
}

export { TextInput, type TextInputProps };
