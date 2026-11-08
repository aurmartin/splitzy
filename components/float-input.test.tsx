import * as React from "react";
import { render, screen, userEvent } from "@testing-library/react-native";
import * as locale from "@/lib/locale";
import { FloatInput } from "./float-input";

describe("FloatInput", () => {
  it("renders correctly", async () => {
    const mockOnChange = jest.fn();
    const value = 10.0;

    await render(<FloatInput value={value} onChange={mockOnChange} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("handles valid number inputs correctly", async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();
    const value = 10.0;

    await render(<FloatInput value={value} onChange={mockOnChange} />);

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

  it("accepts a comma as the decimal separator", async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();

    await render(<FloatInput value={10} onChange={mockOnChange} />);

    const input = screen.getByTestId("float-input");

    await user.clear(input);
    await user.type(input, "25,50");
    expect(mockOnChange).toHaveBeenLastCalledWith(25.5);
    expect(input.props.value).toBe("25,50");
  });

  it("keeps the separator typed after the initial zero", async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();

    await render(<FloatInput value={0} onChange={mockOnChange} />);

    const input = screen.getByTestId("float-input");

    await user.type(input, ",5");
    expect(mockOnChange).toHaveBeenLastCalledWith(0.5);
    expect(input.props.value).toBe("0,5");
  });

  it("caps the digits after the separator", async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();

    await render(<FloatInput value={10} decimals={2} onChange={mockOnChange} />);

    const input = screen.getByTestId("float-input");

    await user.clear(input);
    await user.type(input, "1,234");
    expect(mockOnChange).toHaveBeenLastCalledWith(1.23);
    expect(input.props.value).toBe("1,23");
  });

  it("shows the locale's decimal separator", async () => {
    const getDecimalSeparator = jest.spyOn(locale, "getDecimalSeparator").mockReturnValue(",");

    await render(<FloatInput value={0} decimals={2} onChange={jest.fn()} />);

    const input = screen.getByTestId("float-input");
    expect(input.props.placeholder).toBe("0,00");

    await screen.rerender(<FloatInput value={12.5} decimals={2} onChange={jest.fn()} />);
    expect(input.props.value).toBe("12,5");

    getDecimalSeparator.mockRestore();
  });

  it("ignores invalid number inputs", async () => {
    const user = userEvent.setup();

    const mockOnChange = jest.fn();
    const value = 10.0;

    await render(<FloatInput value={value} onChange={mockOnChange} />);

    const input = screen.getByTestId("float-input");

    // Test invalid characters
    await user.type(input, "abc");
    expect(input.props.value).toBe("10");
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("updates display value when prop changes", async () => {
    const mockOnChange = jest.fn();
    await render(<FloatInput value={10.0} onChange={mockOnChange} />);

    const input = screen.getByTestId("float-input");

    expect(input.props.value).toBe("10");

    await screen.rerender(<FloatInput value={20.0} onChange={mockOnChange} />);
    expect(input.props.value).toBe("20");
  });
});
