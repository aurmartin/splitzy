import Picker from "@/components/picker";
import {
  AmountSplitInput,
  createAmountSplit,
} from "@/components/split-input/amount-split";
import {
  EqualSplitInput,
  createEqualSplit,
} from "@/components/split-input/equal-split";
import {
  PercentageSplitInput,
  createPercentageSplit,
} from "@/components/split-input/percentage-split";
import {
  ReceiptSplitInput,
  createReceiptSplit,
} from "@/components/split-input/receipt-split";
import { convertSplit } from "@/components/split-input/convert";
import {
  type AmountSplit,
  type EqualSplit,
  type PercentageSplit,
  type ReceiptSplit,
  type Split,
} from "@/lib/expenses";
import { Picker as RNPicker } from "@react-native-picker/picker";
import { Dinero } from "dinero.js";
import React from "react";
import { View } from "react-native";

function changeTotal<T extends Split>(split: T, total: Dinero): T {
  switch (split.type) {
    case "equal":
      return createEqualSplit(total, split.members) as T;
    case "percentage":
      return createPercentageSplit(total, split.members) as T;
    case "amount":
      return createAmountSplit(total, split.members) as T;
    case "receipt":
      throw new Error("Cannot change total of receipt split");
  }
}

function changeType(split: Split, type: Split["type"]): Split {
  switch (type) {
    case "equal":
      return createEqualSplit(split.total, split.members);
    case "percentage":
      return createPercentageSplit(split.total, split.members);
    case "amount":
      return convertSplit(split);
    case "receipt":
      throw new Error("Cannot change type of receipt split");
  }
}

const SplitInput = (props: {
  value: Split;
  onChange: (value: Split) => void;
  onTypeChange: (type: Split["type"]) => void;
}) => {
  const { value, onChange, onTypeChange } = props;

  let splitInput = <></>;
  if (value.type === "percentage") {
    splitInput = (
      <PercentageSplitInput
        value={value as PercentageSplit}
        onChange={onChange}
      />
    );
  } else if (value.type === "equal") {
    splitInput = <EqualSplitInput value={value as EqualSplit} />;
  } else if (value.type === "amount") {
    splitInput = <AmountSplitInput value={value as AmountSplit} />;
  } else if (value.type === "receipt") {
    splitInput = (
      <ReceiptSplitInput value={value as ReceiptSplit} onChange={onChange} />
    );
  } else {
    throw new Error("Invalid split type");
  }

  return (
    <View style={{ gap: 8 }}>
      <Picker
        selectedValue={value.type}
        onValueChange={onTypeChange}
        label="Partager la dépense"
      >
        <RNPicker.Item label="Également" value="equal" />
        <RNPicker.Item label="En pourcentage" value="percentage" />
        {/* <RNPicker.Item label="En montant" value="amount" /> */}
      </Picker>

      {splitInput}
    </View>
  );
};

function createSplit(
  type: Split["type"],
  total: Dinero,
  members: string[],
): Split {
  switch (type) {
    case "equal":
      return createEqualSplit(total, members);
    case "percentage":
      return createPercentageSplit(total, members);
    case "amount":
      return createAmountSplit(total, members);
    case "receipt":
      throw new Error("Cannot create receipt split");
  }
}

export {
  Split,
  SplitInput,
  changeTotal,
  changeType,
  convertSplit,
  createReceiptSplit,
  createSplit,
};
