import { useSnackBar } from "@/components/snack-bar";
import { render, screen } from "@/lib/test-utils";
import { render as baseRender } from "@testing-library/react-native";
import * as React from "react";
import { View } from "react-native";

const didRender = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const TestComponent = (props: {
  message: string;
  type: "success" | "error";
}) => {
  const snack = useSnackBar();
  React.useEffect(
    () => snack.show(props.message, props.type),
    [snack, props.message, props.type],
  );
  didRender();
  return <View />;
};

describe("useSnackBar", () => {
  it("show snackbar success", async () => {
    render(<TestComponent message="test message" type="success" />, null);

    screen.getByText("test message");
    expect(didRender).toHaveBeenCalledTimes(1);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("show snackbar error", async () => {
    render(<TestComponent message="test message" type="error" />, null);

    screen.getByText("test message");
    expect(didRender).toHaveBeenCalledTimes(1);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("should throw with invalid type", () => {
    expect(() =>
      render(
        //@ts-ignore
        <TestComponent message="test message" type="invalid" />,
        null,
      ),
    ).toThrow();
  });

  it("should throw without context", () => {
    expect(() =>
      baseRender(<TestComponent message="test message" type="success" />),
    ).toThrow();
  });
});
