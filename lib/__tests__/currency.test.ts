import dinero from "dinero.js";
import {
  getAmountColor,
  getAbsoluteAmount,
  getBalanceMessage,
} from "../currency";

describe("getAmountColor", () => {
  it("should return green for positive amounts", () => {
    const amount = dinero({ amount: 1000, currency: "EUR" });
    expect(getAmountColor(amount)).toBe("hsl(120 70% 30%)");
  });

  it("should return red for negative amounts", () => {
    const amount = dinero({ amount: -1000, currency: "EUR" });
    expect(getAmountColor(amount)).toBe("hsl(0 70% 30%)");
  });

  it("should return black for zero amounts", () => {
    const amount = dinero({ amount: 0, currency: "EUR" });
    expect(getAmountColor(amount)).toBe("black");
  });
});

describe("getAbsoluteAmount", () => {
  it("should return same amount for positive values", () => {
    const amount = dinero({ amount: 1000, currency: "EUR" });
    expect(getAbsoluteAmount(amount).getAmount()).toBe(1000);
  });

  it("should return positive amount for negative values", () => {
    const amount = dinero({ amount: -1000, currency: "EUR" });
    expect(getAbsoluteAmount(amount).getAmount()).toBe(1000);
  });

  it("should return zero for zero amount", () => {
    const amount = dinero({ amount: 0, currency: "EUR" });
    expect(getAbsoluteAmount(amount).getAmount()).toBe(0);
  });
});

describe("getBalanceMessage", () => {
  it("should return 'On vous doit' for positive amounts", () => {
    const amount = dinero({ amount: 1000, currency: "EUR" });
    expect(getBalanceMessage(amount)).toBe("On vous doit");
  });

  it("should return 'Vous devez' for negative amounts", () => {
    const amount = dinero({ amount: -1000, currency: "EUR" });
    expect(getBalanceMessage(amount)).toBe("Vous devez");
  });

  it("should return 'Vous êtes à jour' for zero amounts", () => {
    const amount = dinero({ amount: 0, currency: "EUR" });
    expect(getBalanceMessage(amount)).toBe("Vous êtes à jour");
  });
});
