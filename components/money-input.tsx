import { Money } from "@/lib/money";
import React from "react";
import { FloatInput, type FloatInputProps } from "./float-input";
import { getMinorUnitAmount } from "@/lib/currency";

interface MoneyInputProps extends Omit<FloatInputProps, "value" | "onChange"> {
  value: Money;
  onChange: (value: Money) => void;
}

const MoneyInput = (props: MoneyInputProps) => {
  const { value, onChange: onChangeProp, ...rest } = props;

  const onChange = React.useCallback(
    (numberValue: number) => {
      const currency = value.currency;

      onChangeProp(
        Money.create({
          amount: getMinorUnitAmount(numberValue, currency),
          currency,
        }),
      );
    },
    [onChangeProp, value],
  );

  return (
    <FloatInput value={Money.toUnit(value)} onChange={onChange} {...rest} />
  );
};

export { MoneyInput, type MoneyInputProps };
