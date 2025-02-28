import {
  SplitInput,
  changeTotal,
  changeType,
  createSplit,
} from "@/components/split-input";
import { type PercentageSplit, type Split } from "@/lib/expenses";
import { fireEvent, render } from "@testing-library/react-native";
import dinero from "dinero.js";
import * as React from "react";

describe("SplitInput", () => {
  const mockTotal = dinero({ amount: 2000, currency: "USD" });
  const mockMembers = ["user1", "user2"];

  describe("SplitInput component", () => {
    it("renders correctly", () => {
      const mockSplit: Split = {
        type: "equal",
        total: mockTotal,
        members: mockMembers,
      };

      const tree = render(
        <SplitInput
          value={mockSplit}
          onChange={() => {}}
          onTypeChange={() => {}}
        />,
      );
      expect(tree).toMatchSnapshot();
    });

    it("handles type changes", () => {
      const mockSplit: Split = {
        type: "equal",
        total: mockTotal,
        members: mockMembers,
      };

      const mockOnTypeChange = jest.fn();
      const { getByTestId } = render(
        <SplitInput
          value={mockSplit}
          onChange={() => {}}
          onTypeChange={mockOnTypeChange}
        />,
      );

      const picker = getByTestId("picker");
      fireEvent(picker, "onValueChange", "percentage");

      expect(mockOnTypeChange).toHaveBeenCalledWith("percentage");
    });
  });

  describe("changeTotal", () => {
    it("updates equal split with new total", () => {
      const originalSplit: Split = {
        type: "equal",
        total: mockTotal,
        members: mockMembers,
      };

      const newTotal = dinero({ amount: 3000, currency: "USD" });
      const result = changeTotal(originalSplit, newTotal);

      expect(result.type).toBe("equal");
      expect(result.total).toBe(newTotal);
      expect(result.members).toEqual(mockMembers);
    });

    it("updates percentage split with new total", () => {
      const originalSplit: PercentageSplit = {
        type: "percentage",
        total: mockTotal,
        members: mockMembers,
        ratios: { user1: 50, user2: 50 },
      };

      const newTotal = dinero({ amount: 3000, currency: "USD" });
      const result = changeTotal(originalSplit, newTotal);

      expect(result.type).toBe("percentage");
      expect(result.total).toBe(newTotal);
      expect(result.ratios).toEqual({ user1: 50, user2: 50 });
    });
  });

  describe("changeType", () => {
    it("converts equal split to percentage", () => {
      const originalSplit: Split = {
        type: "equal",
        total: mockTotal,
        members: mockMembers,
      };

      const result = changeType(originalSplit, "percentage");

      expect(result.type).toBe("percentage");
      expect(result.total).toBe(mockTotal);
      expect(result.members).toEqual(mockMembers);
      expect((result as any).ratios).toEqual({ user1: 50, user2: 50 });
    });

    it("converts percentage split to amount", () => {
      const originalSplit: Split = {
        type: "percentage",
        total: mockTotal,
        members: mockMembers,
        ratios: { user1: 50, user2: 50 },
      };

      const result = changeType(originalSplit, "amount");

      expect(result.type).toBe("amount");
      expect(result.total).toBe(mockTotal);
      expect(result.members).toEqual(mockMembers);
      expect((result as any).amounts.user1.getAmount()).toBe(1000);
      expect((result as any).amounts.user2.getAmount()).toBe(1000);
    });
  });

  describe("createSplit", () => {
    it("creates equal split", () => {
      const result = createSplit("equal", mockTotal, mockMembers);

      expect(result.type).toBe("equal");
      expect(result.total).toBe(mockTotal);
      expect(result.members).toEqual(mockMembers);
    });

    it("creates percentage split", () => {
      const result = createSplit("percentage", mockTotal, mockMembers);

      expect(result.type).toBe("percentage");
      expect(result.total).toBe(mockTotal);
      expect(result.members).toEqual(mockMembers);
      expect((result as any).ratios).toEqual({ user1: 50, user2: 50 });
    });
  });
});
