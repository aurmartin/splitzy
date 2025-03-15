import { render, screen, userEvent } from "@testing-library/react-native";
import dinero, { type Dinero } from "dinero.js";
import * as React from "react";

import { DineroInput } from "./dinero-input";

describe("DineroInput", () => {
  it("renders correctly", () => {
    const mockOnChange = jest.fn();
    const value = dinero({ amount: 1000, currency: "USD" }); // $10.00

    render(<DineroInput value={value} onChange={mockOnChange} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("converts float input to dinero value correctly", async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn((value: Dinero) => value.getAmount());
    const value = dinero({ amount: 1000, currency: "USD" });

    render(
      <DineroInput label="test-input" value={value} onChange={mockOnChange} />,
    );

    const input = screen.getByLabelText("test-input");

    await user.clear(input);
    await user.type(input, "25.50");

    expect(mockOnChange).toHaveLastReturnedWith(2550);
  });
});
