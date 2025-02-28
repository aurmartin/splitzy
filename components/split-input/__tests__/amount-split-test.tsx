import {
  AmountSplitInput,
  createAmountSplit,
} from "@/components/split-input/amount-split";
import { type AmountSplit } from "@/lib/expenses";
import { render } from "@testing-library/react-native";
import dinero from "dinero.js";
import * as React from "react";

describe("AmountSplit", () => {
  describe("AmountSplitInput", () => {
    it("renders correctly", () => {
      const mockSplit = {
        type: "amount" as const,
        amounts: { user1: dinero({ amount: 1000, currency: "USD" }) },
        total: dinero({ amount: 1000, currency: "USD" }),
        members: ["user1"],
      } as AmountSplit;

      const tree = render(<AmountSplitInput value={mockSplit} />);
      expect(tree).toMatchSnapshot();
    });
  });

  describe("createAmountSplit", () => {
    it("creates equal splits correctly", () => {
      const total = dinero({ amount: 2000, currency: "USD" });
      const members = ["user1", "user2"];

      const result = createAmountSplit(total, members);

      expect(result.type).toBe("amount");
      expect(Object.keys(result.amounts)).toHaveLength(2);
      expect(result.amounts["user1"].getAmount()).toBe(1000);
      expect(result.amounts["user2"].getAmount()).toBe(1000);
    });

    it("handles no members", () => {
      const total = dinero({ amount: 1000, currency: "USD" });
      const members = [] as string[];

      const result = createAmountSplit(total, members);

      expect(result.type).toBe("amount");
      expect(Object.keys(result.amounts)).toHaveLength(0);
    });
  });
});
