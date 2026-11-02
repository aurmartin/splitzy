import React from "react";
import { TextInput, type TextInputProps } from "./text-input";

interface FloatInputProps extends Omit<TextInputProps, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
}

const FloatInput = (props: FloatInputProps) => {
  const { value, onChange, ...rest } = props;
  const [text, setText] = React.useState(value.toString());
  const [prevValue, setPrevValue] = React.useState(value);

  // Sync the text with the value when it changes from the outside.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== parseFloat(text)) {
      setText(value.toString());
    }
  }

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
