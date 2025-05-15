import { DineroInput } from "@/components/dinero-input";
import { type AmountSplit } from "@/lib/expenses";
import { MaterialIcons } from "@expo/vector-icons";
import dinero, { type Dinero } from "dinero.js";
import { produce } from "immer";
import React from "react";
import { Pressable } from "react-native";
import { ListGroup } from "../list-group";

interface AmountSplitInputProps {
  value: AmountSplit;
  onChange?: (value: AmountSplit) => void;
  testID?: string;
}

const AmountSplitInput = (props: AmountSplitInputProps) => {
  const { value, onChange } = props;

  const handleInputChange = (member: string, amount: Dinero) => {
    if (onChange) {
      const updatedValue = produce(value, (draft) => {
        draft.amounts[member] = amount;
      });
      onChange(updatedValue);
    }
  };

  const handleResetMember = (member: string) => {
    if (onChange) {
      const updatedValue = produce(value, (draft) => {
        delete draft.amounts[member];
      });
      onChange(updatedValue);
    }
  };

  const remaningAmounts = React.useMemo(
    () => getRemaningAmounts(value),
    [value],
  );

  const valueForMember = (member: string) => {
    return value.amounts[member] || remaningAmounts[member];
  };

  return (
    <ListGroup>
      {value.members.map((member, index) => (
        <DineroInput
          key={member}
          label={member}
          testID={`amount-input-${member}`}
          right={
            value.amounts[member] ? (
              <Pressable
                onPress={() => handleResetMember(member)}
                testID={`reset-amount-${member}`}
              >
                <MaterialIcons name="close" size={18} color="black" />
              </Pressable>
            ) : null
          }
          style={{ padding: 0 }}
          value={valueForMember(member)}
          onChange={(value) => handleInputChange(member, value)}
        />
      ))}
    </ListGroup>
  );
};

const getRemaningAmounts = (split: AmountSplit): Record<string, Dinero> => {
  const missingMembers = split.members.filter(
    (member) => !(member in split.amounts),
  );

  if (missingMembers.length === 0) {
    return {};
  }

  const total = split.total;
  const currency = total.getCurrency();

  const alreadyAllocatedTotal = Object.values(split.amounts).reduce(
    (acc, amount) => acc.add(amount),
    dinero({ amount: 0, currency }),
  );

  const remaning = total.subtract(alreadyAllocatedTotal);

  const remaningAllocation = remaning.allocate(missingMembers.map(() => 1));

  return missingMembers.reduce(
    (acc, member, index) => {
      const amount = remaningAllocation[index];

      if (amount.isPositive()) {
        acc[member] = amount;
      } else {
        acc[member] = dinero({ amount: 0, currency });
      }

      return acc;
    },
    {} as Record<string, Dinero>,
  );
};
const createAmountSplit = (total: Dinero, members: string[]): AmountSplit => {
  return {
    type: "amount",
    amounts: {},
    members,
    total,
  };
};

const useEffectiveAmounts = (split: AmountSplit) => {
  return React.useMemo(() => getEffectiveAmounts(split), [split]);
};

const getEffectiveAmounts = (split: AmountSplit): Record<string, Dinero> => {
  const remaningAmounts = getRemaningAmounts(split);

  return split.members.reduce(
    (acc, member) => {
      acc[member] = split.amounts[member] || remaningAmounts[member];
      return acc;
    },
    {} as Record<string, Dinero>,
  );
};

export {
  AmountSplitInput,
  createAmountSplit,
  getEffectiveAmounts,
  useEffectiveAmounts,
};
