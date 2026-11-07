import { CURRENCIES, type Currency } from "@/lib/currency-codes";

// An amount of money in minor units (e.g. cents). Its JSON form is what is
// stored in the database, so its shape must not change.
type Money = {
  amount: number;
  currency: Currency;
  precision: number;
};

const DEFAULT_PRECISION = 2;

function create(params: { amount: number; currency: Currency; precision?: number }): Money {
  const { amount, currency, precision = DEFAULT_PRECISION } = params;

  if (!Number.isInteger(amount)) {
    throw new TypeError(`Amount must be an integer, got ${amount}`);
  }

  return { amount, currency, precision };
}

function assertSameUnit(a: Money, b: Money): void {
  if (a.currency !== b.currency || a.precision !== b.precision) {
    throw new TypeError(
      `Cannot combine ${a.currency} (precision ${a.precision}) with ${b.currency} (precision ${b.precision})`,
    );
  }
}

function withAmount(money: Money, amount: number): Money {
  return create({ ...money, amount });
}

function add(a: Money, b: Money): Money {
  assertSameUnit(a, b);
  return withAmount(a, a.amount + b.amount);
}

function subtract(a: Money, b: Money): Money {
  assertSameUnit(a, b);
  return withAmount(a, a.amount - b.amount);
}

function negate(money: Money): Money {
  return withAmount(money, -money.amount);
}

function isZero(money: Money): boolean {
  return money.amount === 0;
}

function lessThan(a: Money, b: Money): boolean {
  assertSameUnit(a, b);
  return a.amount < b.amount;
}

function greaterThan(a: Money, b: Money): boolean {
  assertSameUnit(a, b);
  return a.amount > b.amount;
}

// Splits money according to ratios without losing any minor unit: each share
// is rounded down, then the remainder is handed out one unit at a time to the
// shares with a non-zero ratio, starting from the first one.
function allocate(money: Money, ratios: number[]): Money[] {
  if (ratios.length === 0 || ratios.some((ratio) => ratio < 0) || ratios.every((ratio) => ratio === 0)) {
    throw new TypeError("Ratios must be a non-empty array of non-negative numbers with at least one greater than 0");
  }

  const total = ratios.reduce((acc, ratio) => acc + ratio, 0);
  const shares = ratios.map((ratio) => Math.floor((money.amount * ratio) / total));

  let remainder = shares.reduce((acc, share) => acc - share, money.amount);
  for (let i = 0; remainder > 0; i = (i + 1) % ratios.length) {
    if (ratios[i] > 0) {
      shares[i] += 1;
      remainder -= 1;
    }
  }

  return shares.map((share) => withAmount(money, share));
}

function toUnit(money: Money): number {
  return money.amount / Math.pow(10, money.precision);
}

function format(money: Money, locale: string): string {
  return toUnit(money).toLocaleString(locale, {
    style: "currency",
    currency: money.currency,
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
  });
}

function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

const Money = {
  create,
  add,
  subtract,
  negate,
  isZero,
  lessThan,
  greaterThan,
  allocate,
  toUnit,
  format,
  isCurrency,
};

export { Money, type Currency };
