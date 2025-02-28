import * as React from "react";
import { render } from "@testing-library/react-native";
import { EqualSplitInput, createEqualSplit } from "../equal-split";
import dinero from "dinero.js";

describe("EqualSplit", () => {
  describe("EqualSplitInput", () => {
    it("renders correctly", () => {
      const mockSplit = {
        type: "equal" as const,
        total: dinero({ amount: 2000, currency: "USD" }),
        members: ["user1", "user2"],
      };

      const tree = render(<EqualSplitInput value={mockSplit} />);
      expect(tree).toMatchSnapshot();
    });
  });

  describe("createEqualSplit", () => {
    it("creates equal split correctly", () => {
      const total = dinero({ amount: 2000, currency: "USD" });
      const members = ["user1", "user2"];

      const result = createEqualSplit(total, members);

      expect(result.type).toBe("equal");
      expect(result.total).toBe(total);
      expect(result.members).toEqual(members);
    });
  });
});
