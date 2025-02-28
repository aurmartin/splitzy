import dinero, { Dinero } from "dinero.js";
import React from "react";
import FloatInput from "./float-input";
import { getMinorUnitAmount } from "@/lib/currency";

const DineroInput = (props: {
  value: Dinero;
  onChange: (value: Dinero) => void;
}) => {
  const { value, onChange: onChangeProp } = props;

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

  return <FloatInput value={value.toUnit()} onChange={onChange} />;
};

export default DineroInput;
