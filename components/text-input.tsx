import { StyleSheet, TextInput as _TextInput } from "react-native";
import { ComponentPropsWithRef } from "react";
import Label from "./label";
import { Colors } from "@/lib/constants";

export default function TextInput(
  props: ComponentPropsWithRef<typeof _TextInput> & { label?: string },
) {
  return (
    <>
      {props.label && <Label>{props.label}</Label>}
      <_TextInput
        {...props}
        style={[styles.textInput, props.style]}
        placeholderTextColor="#666"
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
