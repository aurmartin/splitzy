import {
  AmountSplitInput,
  createAmountSplit,
} from "@/components/split-input/amount-split";
import { type AmountSplit } from "@/lib/expenses";
import {
  type RenderResult,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import dinero from "dinero.js";
import * as React from "react";

describe("AmountSplit", () => {
  describe("AmountSplitInput", () => {
    const testSplit = {
      type: "amount" as const,
      amounts: { alice: dinero({ amount: 1000, currency: "USD" }) },
      total: dinero({ amount: 1000, currency: "USD" }),
      members: ["alice", "bob", "charlie"],
    } as AmountSplit;

    const onChange = jest.fn();

    let tree: RenderResult;

    beforeEach(() => {
      tree = render(
        <AmountSplitInput
          testID="amount-split-input"
          value={testSplit}
          onChange={onChange}
        />,
      );
    });

    it("renders correctly", () => {
      expect(screen).toMatchSnapshot();
    });

    it("should reset amounts when the reset button is pressed", async () => {
      fireEvent.press(screen.getByTestId("reset-amount-alice"));
      expect(onChange).toHaveBeenCalledWith({ ...testSplit, amounts: {} });
    });

    it("should only display reset buttons for amounts that have been set", () => {
      expect(screen.queryByTestId("reset-amount-bob")).toBeNull();
    });

    it("should recompute remaining amounts when total changes", () => {
      const updatedSplit = {
        ...testSplit,
        total: dinero({ amount: 2000, currency: "USD" }),
      };

      expect(screen.getByTestId("amount-input-bob").props.value).toEqual("0");

      tree.rerender(
        <AmountSplitInput
          testID="amount-split-input"
          value={updatedSplit}
          onChange={onChange}
        />,
      );

      expect(screen.getByTestId("amount-input-bob").props.value).toEqual("5");
    });
  });

  describe("createAmountSplit", () => {
    it("creates equal splits correctly", () => {
      const total = dinero({ amount: 2000, currency: "USD" });
      const members = ["user1", "user2"];

      const result = createAmountSplit(total, members);

      expect(result.type).toBe("amount");
      expect(result.amounts).toEqual({});
    });

    it("handles no members", () => {
      const total = dinero({ amount: 1000, currency: "USD" });
      const members = [] as string[];

      const result = createAmountSplit(total, members);

      expect(result.type).toBe("amount");
      expect(result.amounts).toEqual({});
    });
  });
});
