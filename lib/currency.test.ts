import { Money } from "@/lib/money";
import {
  getAmountColor,
  getAbsoluteAmount,
  getBalanceMessage,
  getMinorUnitAmount,
} from "./currency";

describe("getAmountColor", () => {
  it("should return green for positive amounts", () => {
    const amount = Money.create({ amount: 1000, currency: "EUR" });
    expect(getAmountColor(amount)).toBe("hsl(120 70% 30%)");
  });

  it("should return red for negative amounts", () => {
    const amount = Money.create({ amount: -1000, currency: "EUR" });
    expect(getAmountColor(amount)).toBe("hsl(0 70% 30%)");
  });

  it("should return black for zero amounts", () => {
    const amount = Money.create({ amount: 0, currency: "EUR" });
    expect(getAmountColor(amount)).toBe("black");
  });
});

describe("getAbsoluteAmount", () => {
  it("should return same amount for positive values", () => {
    const amount = Money.create({ amount: 1000, currency: "EUR" });
    expect(getAbsoluteAmount(amount).amount).toBe(1000);
  });

  it("should return positive amount for negative values", () => {
    const amount = Money.create({ amount: -1000, currency: "EUR" });
    expect(getAbsoluteAmount(amount).amount).toBe(1000);
  });

  it("should return zero for zero amount", () => {
    const amount = Money.create({ amount: 0, currency: "EUR" });
    expect(getAbsoluteAmount(amount).amount).toBe(0);
  });
});

describe("getBalanceMessage", () => {
  it("should return 'On vous doit' for positive amounts", () => {
    const amount = Money.create({ amount: 1000, currency: "EUR" });
    expect(getBalanceMessage(amount)).toBe("On vous doit");
  });

  it("should return 'Vous devez' for negative amounts", () => {
    const amount = Money.create({ amount: -1000, currency: "EUR" });
    expect(getBalanceMessage(amount)).toBe("Vous devez");
  });

  it("should return 'Vous êtes à jour' for zero amounts", () => {
    const amount = Money.create({ amount: 0, currency: "EUR" });
    expect(getBalanceMessage(amount)).toBe("Vous êtes à jour");
  });
});

describe("getMinorUnitAmount", () => {
  it("should convert major units to minor units", () => {
    expect(getMinorUnitAmount(25.5, "EUR")).toBe(2550);
  });

  it("should round float imprecision to an integer", () => {
    expect(getMinorUnitAmount(1.1, "EUR")).toBe(110);
    expect(getMinorUnitAmount(0.29, "EUR")).toBe(29);
  });
});
