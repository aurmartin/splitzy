import * as React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ReceiptSplitInput, createReceiptSplit } from "../receipt-split";
import dinero from "dinero.js";
import { type Receipt } from "@/lib/expenses";

describe("ReceiptSplit", () => {
  const mockReceipt: Receipt = {
    items: [
      {
        description: "Item_1",
        humanReadableDescription: "Item 1",
        price: dinero({ amount: 1000, currency: "USD" }),
        paid_for: ["user1"],
      },
      {
        description: "Item_2",
        humanReadableDescription: "Item 2",
        price: dinero({ amount: 2000, currency: "USD" }),
        paid_for: [],
      },
    ],
    total: dinero({ amount: 3000, currency: "USD" }),
    date: new Date(),
    title: "Receipt 1",
    currency: "USD",
  };

  describe("ReceiptSplitInput", () => {
    it("renders correctly", () => {
      const mockSplit = {
        type: "receipt" as const,
        total: mockReceipt.total,
        members: ["user1", "user2"],
        receipt: mockReceipt,
      };

      const tree = render(
        <ReceiptSplitInput value={mockSplit} onChange={() => {}} />,
      );
      expect(tree).toMatchSnapshot();
    });

    it("displays all receipt items", () => {
      const mockSplit = {
        type: "receipt" as const,
        total: mockReceipt.total,
        members: ["user1", "user2"],
        receipt: mockReceipt,
      };

      const { getByText } = render(
        <ReceiptSplitInput value={mockSplit} onChange={() => {}} />,
      );

      expect(getByText("Item 1")).toBeTruthy();
      expect(getByText("Item 2")).toBeTruthy();
    });

    it("handles item selection toggle", () => {
      const mockSplit = {
        type: "receipt" as const,
        total: mockReceipt.total,
        members: ["user1", "user2"],
        receipt: mockReceipt,
      };

      const mockOnChange = jest.fn();
      const splitInput = render(
        <ReceiptSplitInput value={mockSplit} onChange={mockOnChange} />,
      );

      // Find and click user2's button for the first item
      const user2Buttons = splitInput.getAllByText("user2");
      fireEvent.press(user2Buttons[1]);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          receipt: expect.objectContaining({
            items: mockReceipt.items.map((item, index) => ({
              ...item,
              paid_for: index === 0 ? ["user1", "user2"] : [],
            })),
          }),
        }),
      );
    });
  });

  describe("createReceiptSplit", () => {
    it("creates receipt split correctly", () => {
      const members = ["user1", "user2"];

      const result = createReceiptSplit(mockReceipt, members);

      expect(result.type).toBe("receipt");
      expect(result.total).toBe(mockReceipt.total);
      expect(result.members).toEqual(members);
      expect(result.receipt).toBe(mockReceipt);
    });

    it("preserves existing paid_for assignments", () => {
      const members = ["user1", "user2"];

      const result = createReceiptSplit(mockReceipt, members);

      expect(result.receipt.items[0].paid_for).toEqual(["user1"]);
      expect(result.receipt.items[1].paid_for).toEqual([]);
    });
  });
});
