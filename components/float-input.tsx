import React from "react";
import TextInput from "./text-input";
import type { TextInputProps } from "react-native";

interface FloatInputProps extends Omit<TextInputProps, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
}

const FloatInput = (props: FloatInputProps) => {
  const { value, onChange, ...rest } = props;
  const [text, setText] = React.useState(value.toString());

  React.useEffect(() => {
    setText((text) => {
      if (value !== parseFloat(text)) {
        return value.toString();
      }

      return text;
    });
  }, [value]);

  const handleChange = (textValue: string) => {
    if (!textValue.match(/^([0-9]{1,})?(\.)?([0-9]{1,})?$/)) {
      return;
    }

    let parsedValue = 0;
    if (textValue && parseFloat(textValue)) {
      parsedValue = parseFloat(textValue);
    }

    onChange(parsedValue);
    setText((prevText) => {
      if (prevText === "0") {
        return parsedValue.toString();
      }
      return textValue;
    });
  };

  return (
    <TextInput
      testID="float-input"
      value={text}
      onChangeText={handleChange}
      keyboardType="numeric"
      placeholder="0.00"
      {...rest}
    />
  );
};

export { FloatInput, type FloatInputProps };
