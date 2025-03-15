import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import { FloatInput } from "./float-input";

describe("FloatInput", () => {
  it("renders correctly", () => {
    const mockOnChange = jest.fn();
    const value = 10.0;

    render(<FloatInput value={value} onChange={mockOnChange} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("handles valid number inputs correctly", async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();
    const value = 10.0;

    render(<FloatInput value={value} onChange={mockOnChange} />);

    const input = screen.getByTestId("float-input");

    // Test whole numbers
    await user.clear(input);
    await user.type(input, "25");
    expect(mockOnChange).toHaveBeenCalledWith(25);

    // Test decimal numbers
    await user.clear(input);
    await user.type(input, "25.50");
    expect(mockOnChange).toHaveBeenCalledWith(25.5);

    // Test starting with decimal
    await user.clear(input);
    await user.type(input, ".5");
    expect(mockOnChange).toHaveBeenCalledWith(0.5);
  });

  it("ignores invalid number inputs", async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();
    const value = 10.0;

    render(<FloatInput value={value} onChange={mockOnChange} />);

    const input = screen.getByTestId("float-input");

    // Test invalid characters
    await user.type(input, "abc");
    expect(input.props.value).toBe("10");
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("updates display value when prop changes", async () => {
    const mockOnChange = jest.fn();
    render(<FloatInput value={10.0} onChange={mockOnChange} />);

    const input = screen.getByTestId("float-input");

    expect(input.props.value).toBe("10");

    screen.rerender(<FloatInput value={20.0} onChange={mockOnChange} />);
    expect(input.props.value).toBe("20");
  });
});
