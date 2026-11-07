import { Money, type Currency } from "@/lib/money";

const MINOR_UNIT_FACTOR: Partial<Record<Currency, number>> = {
  EUR: 100,
  USD: 100,
};

const getAmountColor = (amount: Money): string => {
  if (amount.amount > 0) return "hsl(120 70% 30%)";
  if (amount.amount < 0) return "hsl(0 70% 30%)";
  return "black";
};

const getAbsoluteAmount = (amount: Money): Money => {
  return amount.amount < 0 ? Money.negate(amount) : amount;
};

const getBalanceMessage = (amount: Money): string => {
  if (amount.amount > 0) return "On vous doit";
  if (amount.amount < 0) return "Vous devez";
  return "Vous êtes à jour";
};

const getMinorUnitAmount = (amount: number, currency: Currency): number => {
  const factor = MINOR_UNIT_FACTOR[currency];
  if (!factor) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  // Floats like 1.1 * 100 are not exact (110.00000000000001)
  return Math.round(amount * factor);
};

const getMajorUnitAmount = (amount: number, currency: Currency): number => {
  const factor = MINOR_UNIT_FACTOR[currency];
  if (!factor) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return amount / factor;
};

export { getAmountColor, getAbsoluteAmount, getBalanceMessage, getMinorUnitAmount, getMajorUnitAmount };
