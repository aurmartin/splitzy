import { Money } from "./money";

const eur = (amount: number) => Money.create({ amount, currency: "EUR" });

describe("Money.create", () => {
  it("should default to the precision of the currency", () => {
    expect(eur(1000)).toEqual({ amount: 1000, currency: "EUR", precision: 2 });
    expect(Money.create({ amount: 1500, currency: "JPY" }).precision).toBe(0);
    expect(Money.create({ amount: 1234, currency: "KWD" }).precision).toBe(3);
  });

  it("should serialize to the stored JSON shape", () => {
    expect(JSON.parse(JSON.stringify(eur(1000)))).toEqual({
      amount: 1000,
      currency: "EUR",
      precision: 2,
    });
  });

  it("should reject non-integer amounts", () => {
    expect(() => eur(110.00000000000001)).toThrow(TypeError);
  });
});

describe("Money arithmetic", () => {
  it("should add and subtract amounts", () => {
    expect(Money.add(eur(1000), eur(250)).amount).toBe(1250);
    expect(Money.subtract(eur(1000), eur(1250)).amount).toBe(-250);
  });

  it("should negate amounts", () => {
    expect(Money.negate(eur(1000)).amount).toBe(-1000);
  });

  it("should reject mixed currencies", () => {
    const usd = Money.create({ amount: 1000, currency: "USD" });
    expect(() => Money.add(eur(1000), usd)).toThrow(TypeError);
    expect(() => Money.lessThan(eur(1000), usd)).toThrow(TypeError);
  });

  it("should compare amounts", () => {
    expect(Money.isZero(eur(0))).toBe(true);
    expect(Money.isZero(eur(1))).toBe(false);
    expect(Money.lessThan(eur(1), eur(2))).toBe(true);
    expect(Money.greaterThan(eur(1), eur(2))).toBe(false);
  });
});

describe("Money.allocate", () => {
  const amounts = (shares: Money[]) => shares.map((share) => share.amount);

  it("should hand out the remainder starting from the first share", () => {
    expect(amounts(Money.allocate(eur(1003), [50, 50]))).toEqual([502, 501]);
    expect(amounts(Money.allocate(eur(1000), [1, 1, 1]))).toEqual([334, 333, 333]);
  });

  it("should never lose a minor unit with fractional ratios", () => {
    const ratio = 100 / 3;
    const shares = Money.allocate(eur(1000), [ratio, ratio, ratio]);
    expect(amounts(shares)).toEqual([334, 333, 333]);
  });

  it("should skip shares with a zero ratio", () => {
    expect(amounts(Money.allocate(eur(1003), [0, 50, 50]))).toEqual([0, 502, 501]);
  });

  it("should allocate negative amounts", () => {
    expect(amounts(Money.allocate(eur(-1003), [50, 50]))).toEqual([-501, -502]);
  });

  it("should reject invalid ratios", () => {
    expect(() => Money.allocate(eur(1000), [])).toThrow(TypeError);
    expect(() => Money.allocate(eur(1000), [0, 0])).toThrow(TypeError);
    expect(() => Money.allocate(eur(1000), [-1, 2])).toThrow(TypeError);
  });
});

describe("Money.format", () => {
  it("should format in the given locale", () => {
    expect(Money.format(eur(123456), "en")).toBe("€1,234.56");
    expect(Money.format(eur(-1000), "en")).toBe("-€10.00");
    expect(Money.format(eur(5), "en")).toBe("€0.05");
  });

  it("should show as many decimals as the currency has", () => {
    expect(Money.format(Money.create({ amount: 1500, currency: "JPY" }), "en")).toBe("¥1,500");
    expect(Money.format(Money.create({ amount: 1234, currency: "KWD" }), "en")).toBe("KWD\u00a01.234");
  });
});

describe("Money.isCurrency", () => {
  it("should only accept known currency codes", () => {
    expect(Money.isCurrency("EUR")).toBe(true);
    expect(Money.isCurrency("NOPE")).toBe(false);
    expect(Money.isCurrency("XAU")).toBe(false);
  });

  it("should only accept codes that ISO still lists", () => {
    expect(["HRK", "SLL", "ZWL", "ANG"].filter(Money.isCurrency)).toEqual([]);
    expect(["SLE", "ZWG", "XCG"].every(Money.isCurrency)).toBe(true);
  });
});
