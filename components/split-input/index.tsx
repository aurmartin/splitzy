import {
  AmountSplitInput,
  createAmountSplit,
} from "@/components/split-input/amount-split";
import { convertSplit } from "@/components/split-input/convert";
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
import {
  type AmountSplit,
  type EqualSplit,
  type PercentageSplit,
  type ReceiptSplit,
  type Split,
} from "@/lib/expenses";
import { Dinero } from "dinero.js";
import React from "react";
import { View } from "react-native";
import { ChipList } from "../chip-list";
import Label from "../label";

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

// Depending on the type value, the return type is different. The type should be computed from the type argument
type ChangeTypeReturn<T extends Split["type"]> = T extends "equal"
  ? EqualSplit
  : T extends "percentage"
    ? PercentageSplit
    : T extends "amount"
      ? AmountSplit
      : ReceiptSplit;

function changeType<Type extends Split["type"]>(
  split: Split,
  type: Type,
): ChangeTypeReturn<Type> {
  switch (type) {
    case "equal":
      return createEqualSplit(
        split.total,
        split.members,
      ) as ChangeTypeReturn<Type>;
    case "percentage":
      return createPercentageSplit(
        split.total,
        split.members,
      ) as ChangeTypeReturn<Type>;
    case "amount":
      return createAmountSplit(
        split.total,
        split.members,
      ) as ChangeTypeReturn<Type>;
    default:
      throw new Error("Invalid split type");
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
    splitInput = (
      <AmountSplitInput value={value as AmountSplit} onChange={onChange} />
    );
  } else if (value.type === "receipt") {
    splitInput = (
      <ReceiptSplitInput value={value as ReceiptSplit} onChange={onChange} />
    );
  } else {
    throw new Error("Invalid split type");
  }

  return (
    <View style={{ gap: 8 }}>
      <Label>Partager la dépense</Label>
      <ChipList
        value={value.type}
        onChange={(type) => onTypeChange(type as Split["type"])}
        items={[
          { label: "Également", value: "equal" },
          { label: "Pourcentage", value: "percentage" },
          { label: "Montant", value: "amount" },
        ]}
        style={{ justifyContent: "center" }}
      />

      {splitInput}
    </View>
  );
};

type CreateSplitReturn<Type extends Split["type"]> = Type extends "equal"
  ? EqualSplit
  : Type extends "percentage"
    ? PercentageSplit
    : Type extends "amount"
      ? AmountSplit
      : ReceiptSplit;

function createSplit<Type extends Split["type"]>(
  type: Type,
  total: Dinero,
  members: string[],
): CreateSplitReturn<Type> {
  switch (type) {
    case "equal":
      return createEqualSplit(total, members) as CreateSplitReturn<Type>;
    case "percentage":
      return createPercentageSplit(total, members) as CreateSplitReturn<Type>;
    case "amount":
      return createAmountSplit(total, members) as CreateSplitReturn<Type>;
    default:
      throw new Error("Invalid split type");
  }
}

export {
  SplitInput,
  changeTotal,
  changeType,
  convertSplit,
  createReceiptSplit,
  createSplit,
};
