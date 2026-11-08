import { getDecimalSeparator } from "@/lib/locale";
import React from "react";
import { TextInput, type TextInputProps } from "./text-input";

interface FloatInputProps extends Omit<TextInputProps, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
  // Digits allowed after the decimal point; any number when omitted.
  decimals?: number;
}

// Both separators are accepted whatever the locale: the iOS keypad only offers
// the region's one, and some Android keyboards only offer ".".
const getPattern = (decimals: number | undefined): RegExp => {
  if (decimals === undefined) return /^[0-9]*([.,][0-9]*)?$/;
  if (decimals === 0) return /^[0-9]*$/;
  return new RegExp(`^[0-9]*([.,][0-9]{0,${decimals}})?$`);
};

const getPlaceholder = (decimals: number | undefined): string => {
  if (decimals === 0) return "0";
  return `0${getDecimalSeparator()}${"0".repeat(decimals ?? 2)}`;
};

const parse = (text: string): number => parseFloat(text.replace(",", ".")) || 0;

const format = (value: number): string => value.toString().replace(".", getDecimalSeparator());

const FloatInput = (props: FloatInputProps) => {
  const { value, onChange, decimals, ...rest } = props;
  const [text, setText] = React.useState(() => format(value));
  const [prevValue, setPrevValue] = React.useState(value);

  // Sync the text with the value when it changes from the outside.
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== parse(text)) {
      setText(format(value));
    }
  }

  const handleChange = (textValue: string) => {
    if (!getPattern(decimals).test(textValue)) {
      return;
    }

    const parsedValue = parse(textValue);

    onChange(parsedValue);
    setText((prevText) => {
      // Typing a digit after the initial "0" replaces it, but "0," starts a decimal.
      if (prevText === "0" && /^[0-9]+$/.test(textValue)) {
        return format(parsedValue);
      }
      return textValue;
    });
  };

  return (
    <TextInput
      testID="float-input"
      value={text}
      onChangeText={handleChange}
      keyboardType={decimals === 0 ? "number-pad" : "decimal-pad"}
      placeholder={getPlaceholder(decimals)}
      {...rest}
    />
  );
};

export { FloatInput, type FloatInputProps };
