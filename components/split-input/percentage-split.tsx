import FloatInput from "@/components/float-input";
import { SplitContainer } from "@/components/split-input/split-container";
import { Text } from "@/components/text";
import { type PercentageSplit } from "@/lib/expenses";
import { type Dinero } from "dinero.js";
import React from "react";
import { View } from "react-native";

const PercentageSplitInput = (props: {
  value: PercentageSplit;
  onChange: (value: PercentageSplit) => void;
}) => {
  const { value, onChange } = props;

  const handleInputChange = (member: string, ratio: number) => {
    onChange({
      ...value,
      ratios: {
        ...value.ratios,
        [member]: ratio,
      },
    });
  };

  return (
    <SplitContainer>
      {Object.entries(value.ratios).map(([member, ratio]) => (
        <View
          key={member}
          style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
        >
          <Text style={{ flex: 1 }}>{member}</Text>
          <FloatInput
            style={{
              height: 30,
              padding: 0,
              paddingHorizontal: 8,
              minWidth: 50,
            }}
            value={ratio}
            onChange={(value) => handleInputChange(member, value)}
          />
          <Text>%</Text>
        </View>
      ))}
    </SplitContainer>
  );
};

const createPercentageSplit = (
  total: Dinero,
  members: string[],
): PercentageSplit => {
  const ratio = Math.round(100 / members.length);
  const lastRatio = 100 - ratio * (members.length - 1);
  const ratios = members.reduce(
    (acc, member, index) => {
      acc[member] = ratio;
      if (index === members.length - 1) {
        acc[member] = lastRatio;
      }
      return acc;
    },
    {} as { [member: string]: number },
  );

  return {
    type: "percentage",
    total,
    ratios,
    members,
  };
};

export { PercentageSplitInput, createPercentageSplit };
