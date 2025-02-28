import { convertSplit } from "@/components/split-input/convert";
import { SplitContainer } from "@/components/split-input/split-container";
import { Text } from "@/components/text";
import { type EqualSplit } from "@/lib/expenses";
import { getLocale } from "@/lib/locale";
import { type Dinero } from "dinero.js";
import React from "react";
import { View } from "react-native";

const EqualSplitInput = (props: { value: EqualSplit }) => {
  const { value } = props;

  const amountSplit = convertSplit(value);

  return (
    <SplitContainer>
      {Object.entries(amountSplit.amounts).map(([member, amount]) => (
        <View
          key={member}
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text numberOfLines={1}>{member}</Text>
          <Text>{amount.setLocale(getLocale()).toFormat()}</Text>
        </View>
      ))}
    </SplitContainer>
  );
};

const createEqualSplit = (total: Dinero, members: string[]): EqualSplit => {
  return {
    type: "equal",
    total: total,
    members,
  };
};

export { EqualSplitInput, createEqualSplit };
