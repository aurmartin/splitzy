import { DineroInput } from "@/components/dinero-input";
import { SplitContainer } from "@/components/split-input/split-container";
import { Text } from "@/components/text";
import { type AmountSplit } from "@/lib/expenses";
import { MaterialIcons } from "@expo/vector-icons";
import dinero, { type Dinero } from "dinero.js";
import { produce } from "immer";
import React from "react";
import { Pressable, View } from "react-native";

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
    <SplitContainer>
      {value.members.map((member) => (
        <View
          key={member}
          style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
        >
          <Text style={{ flex: 1 }}>{member}</Text>

          <View style={{ position: "relative" }}>
            <DineroInput
              testID={`amount-input-${member}`}
              style={{
                minWidth: 100,
                textAlign: "right",
              }}
              value={valueForMember(member)}
              onChange={(value) => handleInputChange(member, value)}
            />

            {value.amounts[member] && (
              <View
                style={{
                  position: "absolute",
                  left: 10,
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Pressable
                  testID={`reset-amount-${member}`}
                  onPress={() => handleResetMember(member)}
                  style={{
                    borderRadius: 24,
                    padding: 2,
                    backgroundColor: "hsl(0 0% 90%)",
                  }}
                >
                  <MaterialIcons name="close" size={18} color="black" />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      ))}
    </SplitContainer>
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
