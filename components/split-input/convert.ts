import {
  type AmountSplit,
  type PercentageSplit,
  type ReceiptSplit,
  type Split,
} from "@/lib/expenses";
import dinero, { Dinero } from "dinero.js";

const splitRatios = (split: Split): { [member: string]: number } => {
  if (split.type === "percentage") {
    return (split as PercentageSplit).ratios;
  }

  if (split.type === "equal") {
    const ratio = 100 / split.members.length;
    return split.members.reduce(
      (acc, member) => {
        acc[member] = ratio;
        return acc;
      },
      {} as { [member: string]: number },
    );
  }

  throw new Error("Invalid split type");
};

const convertPercentageOrEqualSplit = (split: Split): AmountSplit => {
  if (split.type === "amount") {
    return split as AmountSplit;
  }

  if (split.members.length === 0) {
    return {
      type: "amount",
      total: split.total,
      amounts: {},
      members: [],
    };
  }

  const ratios = splitRatios(split);
  const allocateMembers = Object.keys(ratios);
  const allocateRatios = allocateMembers.map((member) => ratios[member]);
  const allocation = split.total.allocate(allocateRatios);
  const amounts = allocateMembers.reduce(
    (acc, member, index) => {
      acc[member] = allocation[index];
      return acc;
    },
    {} as { [member: string]: Dinero },
  );

  return {
    type: "amount",
    total: split.total,
    amounts,
    members: split.members,
  };
};

const convertReceiptSplit = (receiptSplit: ReceiptSplit): AmountSplit => {
  const split = {
    type: "amount",
    members: receiptSplit.members,
    total: receiptSplit.total,
    amounts: receiptSplit.members.reduce(
      (acc, member) => {
        acc[member] = dinero({
          amount: 0,
          currency: receiptSplit.total.getCurrency(),
        });
        return acc;
      },
      {} as { [member: string]: Dinero },
    ),
  } as AmountSplit;

  receiptSplit.receipt.items.forEach((item) => {
    if (item.paid_for.length === 0) return;

    const paidForCount = item.paid_for.length;
    const ratio = 100 / paidForCount;
    const allocateRatios = item.paid_for.map(() => ratio);
    const allocation = item.price.allocate(allocateRatios);
    item.paid_for.forEach((member, index) => {
      split.amounts[member] = split.amounts[member].add(allocation[index]);
    });
  });

  return split;
};

const convertSplit = (split: Split): AmountSplit => {
  switch (split.type) {
    case "percentage":
      return convertPercentageOrEqualSplit(split);
    case "equal":
      return convertPercentageOrEqualSplit(split);
    case "amount":
      return split as AmountSplit;
    default:
      return convertReceiptSplit(split as ReceiptSplit);
  }
};

export { convertSplit };
