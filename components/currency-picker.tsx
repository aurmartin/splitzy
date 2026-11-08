import { Text } from "@/components/text";
import { CURRENCIES, type Currency } from "@/lib/currency-codes";
import { Host, Picker } from "@expo/ui";
import React from "react";
import { View } from "react-native";

type CurrencyPickerProps = {
  value: Currency;
  onChange: (currency: Currency) => void;
};

function CurrencyPicker(props: CurrencyPickerProps) {
  const { value, onChange } = props;

  return (
    <View
      style={{
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: "white",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 55,
      }}
    >
      <Text>Devise</Text>
      <Host matchContents>
        <Picker<Currency> testID="currency-picker" selectedValue={value} onValueChange={onChange}>
          {CURRENCIES.map((currency) => (
            <Picker.Item key={currency} label={currency} value={currency} />
          ))}
        </Picker>
      </Host>
    </View>
  );
}

export { CurrencyPicker, type CurrencyPickerProps };
