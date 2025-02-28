import { createEqualSplit } from "@/components/split-input/equal-split";
import { convertSplit } from "@/components/split-input/convert";
import { SplitContainer } from "@/components/split-input/split-container";
import { Text } from "@/components/text";
import { type AmountSplit } from "@/lib/expenses";
import { Dinero } from "dinero.js";
import React from "react";

const AmountSplitInput = (_props: { value: AmountSplit }) => {
  // const { _value } = props;

  return (
    <SplitContainer>
      <Text style={{ color: "hsl(0, 100%, 30%)" }}>Not implemented</Text>
    </SplitContainer>
  );
};

const createAmountSplit = (total: Dinero, members: string[]): AmountSplit => {
  return convertSplit(createEqualSplit(total, members));
};

export { AmountSplitInput, createAmountSplit };
