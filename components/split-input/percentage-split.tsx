import { FloatInput } from "@/components/float-input";
import { Text } from "@/components/text";
import { type PercentageSplit } from "@/lib/expenses";
import { type Dinero } from "dinero.js";
import React from "react";
import { ListGroup } from "../list-group";

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
    <ListGroup>
      {Object.entries(value.ratios).map(([member, ratio]) => (
        <FloatInput
          key={member}
          label={member}
          right={<Text>%</Text>}
          style={{ minWidth: 50, padding: 0 }}
          value={ratio}
          onChange={(value) => handleInputChange(member, value)}
        />
      ))}
    </ListGroup>
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

export { createPercentageSplit, PercentageSplitInput };
