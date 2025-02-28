import * as React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import FloatInput from "../float-input";

describe("FloatInput", () => {
  it("renders correctly", () => {
    const mockOnChange = jest.fn();
    const value = 10.0;

    const tree = render(<FloatInput value={value} onChange={mockOnChange} />);
    expect(tree).toMatchSnapshot();
  });

  it("handles valid number inputs correctly", () => {
    const mockOnChange = jest.fn();
    const value = 10.0;

    const { getByTestId } = render(
      <FloatInput value={value} onChange={mockOnChange} />,
    );

    // Test whole numbers
    fireEvent.changeText(getByTestId("float-input"), "25");
    expect(mockOnChange).toHaveBeenCalledWith(25);

    // Test decimal numbers
    fireEvent.changeText(getByTestId("float-input"), "25.50");
    expect(mockOnChange).toHaveBeenCalledWith(25.5);

    // Test starting with decimal
    fireEvent.changeText(getByTestId("float-input"), ".5");
    expect(mockOnChange).toHaveBeenCalledWith(0.5);
  });

  it("ignores invalid number inputs", () => {
    const mockOnChange = jest.fn();
    const value = 10.0;

    const { getByTestId } = render(
      <FloatInput value={value} onChange={mockOnChange} />,
    );

    // Test invalid characters
    fireEvent.changeText(getByTestId("float-input"), "abc");
    expect(getByTestId("float-input").props.value).toBe("10");
    expect(mockOnChange).not.toHaveBeenCalled();

    // Test multiple decimal points
    fireEvent.changeText(getByTestId("float-input"), "25.50.5");
    expect(getByTestId("float-input").props.value).toBe("10");
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("updates display value when prop changes", () => {
    const mockOnChange = jest.fn();
    const { getByTestId, rerender } = render(
      <FloatInput value={10.0} onChange={mockOnChange} />,
    );

    expect(getByTestId("float-input").props.value).toBe("10");

    rerender(<FloatInput value={20.0} onChange={mockOnChange} />);
    expect(getByTestId("float-input").props.value).toBe("20");
  });
});
