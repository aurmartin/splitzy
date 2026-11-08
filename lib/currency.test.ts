import { Money } from "@/lib/money";
import * as Localization from "expo-localization";
import {
  getAbsoluteAmount,
  getAmountColor,
  getBalanceMessage,
  getDeviceCurrency,
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

  it("should follow the number of decimals of the currency", () => {
    expect(getMinorUnitAmount(1500, "JPY")).toBe(1500);
    expect(getMinorUnitAmount(1500.4, "JPY")).toBe(1500);
    expect(getMinorUnitAmount(1.234, "KWD")).toBe(1234);
  });
});

describe("getDeviceCurrency", () => {
  it("should use the currency of the device's region", () => {
    expect(getDeviceCurrency()).toBe("USD");
  });

  it("should fall back to EUR when the device has no known currency", () => {
    const [locale] = Localization.getLocales();
    const getLocales = jest.spyOn(Localization, "getLocales");
    getLocales.mockReturnValue([{ ...locale, currencyCode: null }]);
    expect(getDeviceCurrency()).toBe("EUR");

    getLocales.mockReturnValue([{ ...locale, currencyCode: "XAU" }]);
    expect(getDeviceCurrency()).toBe("EUR");

    getLocales.mockRestore();
  });
});
