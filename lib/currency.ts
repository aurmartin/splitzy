import { type Dinero, type Currency } from "dinero.js";

const MINOR_UNIT_FACTOR: Partial<Record<Currency, number>> = {
  EUR: 100,
  USD: 100,
};

const getAmountColor = (amount: Dinero): string => {
  if (amount.getAmount() > 0) return "hsl(120 70% 30%)";
  if (amount.getAmount() < 0) return "hsl(0 70% 30%)";
  return "black";
};

const getAbsoluteAmount = (amount: Dinero): Dinero => {
  return amount.getAmount() < 0 ? amount.multiply(-1) : amount;
};

const getBalanceMessage = (amount: Dinero): string => {
  if (amount.getAmount() > 0) return "On vous doit";
  if (amount.getAmount() < 0) return "Vous devez";
  return "Vous êtes à jour";
};

const getMinorUnitAmount = (amount: number, currency: Currency): number => {
  const factor = MINOR_UNIT_FACTOR[currency];
  if (!factor) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return amount * factor;
};

const getMajorUnitAmount = (amount: number, currency: Currency): number => {
  const factor = MINOR_UNIT_FACTOR[currency];
  if (!factor) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return amount / factor;
};

export {
  getAmountColor,
  getAbsoluteAmount,
  getBalanceMessage,
  getMinorUnitAmount,
  getMajorUnitAmount,
};
