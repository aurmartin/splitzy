import dinero, { Dinero } from "dinero.js";
import React from "react";
import { FloatInput, type FloatInputProps } from "./float-input";
import { getMinorUnitAmount } from "@/lib/currency";

interface DineroInputProps extends Omit<FloatInputProps, "value" | "onChange"> {
  value: Dinero;
  onChange: (value: Dinero) => void;
}

const DineroInput = (props: DineroInputProps) => {
  const { value, onChange: onChangeProp, ...rest } = props;

  const onChange = React.useCallback(
    (numberValue: number) => {
      const currency = value.getCurrency();

      onChangeProp(
        dinero({
          amount: getMinorUnitAmount(numberValue, currency),
          currency,
        }),
      );
    },
    [onChangeProp, value],
  );

  return <FloatInput value={value.toUnit()} onChange={onChange} {...rest} />;
};

export { DineroInput, type DineroInputProps };
