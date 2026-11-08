import { getPrecision } from "@/lib/currency-codes";
import { Money, type Currency } from "@/lib/money";
import { getLocales } from "expo-localization";

const DEFAULT_CURRENCY: Currency = "EUR";

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
  // Floats like 1.1 * 100 are not exact (110.00000000000001)
  return Math.round(amount * 10 ** getPrecision(currency));
};

const getDeviceCurrency = (): Currency => {
  const code = getLocales()[0]?.currencyCode;
  return code && Money.isCurrency(code) ? code : DEFAULT_CURRENCY;
};

export { getAmountColor, getAbsoluteAmount, getBalanceMessage, getMinorUnitAmount, getDeviceCurrency };
