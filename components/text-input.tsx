import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
} from "react-native";
import Label from "./label";
import { Colors } from "@/lib/constants";

interface TextInputProps extends RNTextInputProps {
  label?: string;
}

function TextInput(props: TextInputProps) {
  return (
    <>
      {props.label && <Label>{props.label}</Label>}
      <RNTextInput
        {...props}
        style={[styles.textInput, props.style]}
        placeholderTextColor="#666"
        accessibilityLabel={props.label}
      />
    </>
  );
}

const styles = StyleSheet.create({
  textInput: {
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.secondary,
    height: 45,
  },
});

export { TextInput, type TextInputProps };
