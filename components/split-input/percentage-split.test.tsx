import {
  PercentageSplitInput,
  createPercentageSplit,
} from "@/components/split-input/percentage-split";
import { type PercentageSplit } from "@/lib/expenses";
import { fireEvent, render } from "@testing-library/react-native";
import dinero from "dinero.js";
import * as React from "react";

describe("PercentageSplit", () => {
  describe("PercentageSplitInput", () => {
    it("renders correctly", () => {
      const mockSplit = {
        type: "percentage" as const,
        total: dinero({ amount: 1000, currency: "USD" }),
        ratios: { user1: 100 },
        members: ["user1"],
      } as PercentageSplit;

      const tree = render(
        <PercentageSplitInput value={mockSplit} onChange={() => {}} />,
      );
      expect(tree).toMatchSnapshot();
    });

    it("handles percentage changes", () => {
      const mockSplit = {
        type: "percentage" as const,
        total: dinero({ amount: 1000, currency: "USD" }),
        ratios: { user1: 60, user2: 40 },
        members: ["user1", "user2"],
      } as PercentageSplit;

      const mockOnChange = jest.fn();
      const { getByDisplayValue } = render(
        <PercentageSplitInput value={mockSplit} onChange={mockOnChange} />,
      );

      const input = getByDisplayValue("60");
      fireEvent.changeText(input, "65");

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          ratios: expect.objectContaining({ user1: 65 }),
        }),
      );
    });
  });

  describe("createPercentageSplit", () => {
    it("creates equal percentage splits correctly", () => {
      const total = dinero({ amount: 2000, currency: "USD" });
      const members = ["user1", "user2"];

      const result = createPercentageSplit(total, members);

      expect(result.type).toBe("percentage");
      expect(Object.keys(result.ratios)).toHaveLength(2);
      expect(result.ratios["user1"]).toBe(50);
      expect(result.ratios["user2"]).toBe(50);
      expect(result.total).toBe(total);
      expect(result.members).toEqual(members);
    });

    it("handles odd number of members correctly", () => {
      const total = dinero({ amount: 3000, currency: "USD" });
      const members = ["user1", "user2", "user3"];

      const result = createPercentageSplit(total, members);

      expect(Object.keys(result.ratios)).toHaveLength(3);
      // First two members should have equal ratios
      expect(result.ratios["user1"]).toBe(33);
      expect(result.ratios["user2"]).toBe(33);
      // Last member should get the remainder to ensure 100% total
      expect(result.ratios["user3"]).toBe(34);
      // Verify total is 100%
      expect(
        Object.values(result.ratios).reduce((sum, ratio) => sum + ratio, 0),
      ).toBe(100);
    });

    it("handles single member", () => {
      const total = dinero({ amount: 1000, currency: "USD" });
      const members = ["user1"];

      const result = createPercentageSplit(total, members);

      expect(Object.keys(result.ratios)).toHaveLength(1);
      expect(result.ratios["user1"]).toBe(100);
    });

    it("handles no members", () => {
      const total = dinero({ amount: 1000, currency: "USD" });
      const members = [] as string[];

      const result = createPercentageSplit(total, members);

      expect(Object.keys(result.ratios)).toHaveLength(0);
    });
  });
});
