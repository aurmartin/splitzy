import { fireEvent, render } from "@testing-library/react-native";
import dinero from "dinero.js";
import * as React from "react";

import DineroInput from "../dinero-input";

describe("DineroInput", () => {
  it("renders correctly", () => {
    const mockOnChange = jest.fn();
    const value = dinero({ amount: 1000, currency: "USD" }); // $10.00

    const tree = render(<DineroInput value={value} onChange={mockOnChange} />);
    expect(tree).toMatchSnapshot();
  });

  it("converts float input to dinero value correctly", () => {
    const mockOnChange = jest.fn();
    const value = dinero({ amount: 1000, currency: "USD" }); // $10.00

    const { getByTestId } = render(
      <DineroInput value={value} onChange={mockOnChange} />,
    );

    // Simulate changing the value to $25.50
    fireEvent.changeText(getByTestId("float-input"), "25.50");

    // Test that the onChange function is called with a Dinero object with the correct amount
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        getAmount: expect.any(Function),
      }),
    );

    // Verify the converted amount (25.50 -> 2550 cents)
    expect(mockOnChange.mock.calls[0][0].getAmount()).toBe(2550);
  });
});
