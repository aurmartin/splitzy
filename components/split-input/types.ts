import { Receipt } from "@/lib/expenses";
import { Dinero } from "dinero.js";

// export interface Split {
//   type: "percentage" | "amount" | "equal" | "receipt";
//   total: Dinero;
//   members: string[];
// }$

interface BaseSplit {
  type: "percentage" | "amount" | "equal" | "receipt";
  total: Dinero;
  members: string[];
}

export interface PercentageSplit extends BaseSplit {
  type: "percentage";
  total: Dinero;
  ratios: { [member: string]: number };
}

export interface EqualSplit extends BaseSplit {
  type: "equal";
  total: Dinero;
}

export interface AmountSplit extends BaseSplit {
  type: "amount";
  total: Dinero;
  amounts: { [member: string]: Dinero };
}

export interface ReceiptSplit extends BaseSplit {
  type: "receipt";
  total: Dinero;
  receipt: Receipt;
}

export type Split = PercentageSplit | EqualSplit | AmountSplit | ReceiptSplit;
