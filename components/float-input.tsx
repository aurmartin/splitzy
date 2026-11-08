import React from "react";
import { TextInput, type TextInputProps } from "./text-input";

interface FloatInputProps extends Omit<TextInputProps, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
  // Digits allowed after the decimal point; any number when omitted.
  decimals?: number;
}

const getPattern = (decimals: number | undefined): RegExp => {
  if (decimals === undefined) return /^[0-9]*(\.[0-9]*)?$/;
  if (decimals === 0) return /^[0-9]*$/;
  return new RegExp(`^[0-9]*(\\.[0-9]{0,${decimals}})?$`);
};

const getPlaceholder = (decimals: number | undefined): string => {
  if (decimals === undefined) return "0.00";
  return decimals === 0 ? "0" : `0.${"0".repeat(decimals)}`;
};

const FloatInput = (props: FloatInputProps) => {
  const { value, onChange, decimals, ...rest } = props;
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
    if (!getPattern(decimals).test(textValue)) {
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
      placeholder={getPlaceholder(decimals)}
      {...rest}
    />
  );
};

export { FloatInput, type FloatInputProps };
