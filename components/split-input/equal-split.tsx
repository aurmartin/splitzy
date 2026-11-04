import { ListGroup } from "@/components/list-group";
import { convertSplit } from "@/components/split-input/convert";
import { Text } from "@/components/text";
import { type EqualSplit } from "@/lib/expenses";
import { getLocale } from "@/lib/locale";
import { Money } from "@/lib/money";
import React from "react";
import { View } from "react-native";

const EqualSplitInput = (props: { value: EqualSplit }) => {
  const { value } = props;

  const amountSplit = convertSplit(value);

  return (
    <ListGroup>
      {Object.entries(amountSplit.amounts).map(([member, amount]) => (
        <View key={member} style={{ justifyContent: "space-between" }}>
          <Text numberOfLines={1}>{member}</Text>
          <Text>{Money.format(amount, getLocale())}</Text>
        </View>
      ))}
    </ListGroup>
  );
};

const createEqualSplit = (total: Money, members: string[]): EqualSplit => {
  return {
    type: "equal",
    total: total,
    members,
  };
};

export { createEqualSplit, EqualSplitInput };
