import { render, screen, userEvent } from "@testing-library/react-native";
import { Money } from "@/lib/money";
import * as React from "react";

import { MoneyInput } from "./money-input";

describe("MoneyInput", () => {
  it("renders correctly", async () => {
    const mockOnChange = jest.fn();
    const value = Money.create({ amount: 1000, currency: "USD" }); // $10.00

    await render(<MoneyInput value={value} onChange={mockOnChange} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("converts float input to money value correctly", async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn((value: Money) => value.amount);
    const value = Money.create({ amount: 1000, currency: "USD" });

    await render(<MoneyInput label="test-input" value={value} onChange={mockOnChange} />);

    const input = screen.getByLabelText("test-input");

    await user.clear(input);
    await user.type(input, "25.50");

    expect(mockOnChange).toHaveLastReturnedWith(2550);
  });

  it("rounds float input to the nearest minor unit", async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn((value: Money) => value.amount);
    const value = Money.create({ amount: 1000, currency: "USD" });

    await render(<MoneyInput label="test-input" value={value} onChange={mockOnChange} />);

    const input = screen.getByLabelText("test-input");

    await user.clear(input);
    await user.type(input, "1.1");

    expect(mockOnChange).toHaveLastReturnedWith(110);
  });
});
