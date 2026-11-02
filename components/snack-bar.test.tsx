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
    await render(<TestComponent message="test message" type="success" />, null);

    screen.getByText("test message");
    expect(didRender).toHaveBeenCalledTimes(1);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("show snackbar error", async () => {
    await render(<TestComponent message="test message" type="error" />, null);

    screen.getByText("test message");
    expect(didRender).toHaveBeenCalledTimes(1);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it("should throw with invalid type", async () => {
    await expect(
      render(
        //@ts-ignore
        <TestComponent message="test message" type="invalid" />,
        null,
      ),
    ).rejects.toThrow();
  });

  it("should throw without context", async () => {
    await expect(
      baseRender(<TestComponent message="test message" type="success" />),
    ).rejects.toThrow();
  });
});
