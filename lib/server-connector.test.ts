import { createReceiptSplit } from "@/components/split-input/receipt-split";
import { computeBalance } from "@/lib/balance";
import { Money, type Currency } from "@/lib/money";
import { buildExpense, buildGroup } from "@/lib/test-factories";
import { system } from "@/lib/test-setup";

const { ServerConnector } = jest.requireActual<typeof import("@/lib/server-connector")>("@/lib/server-connector");

// The connector mock stubs parseReceipt on the prototype.
beforeAll(() => {
  jest.mocked(ServerConnector.prototype.parseReceipt).mockRestore();
});

const receiptResponse = (currency: string) => ({
  items: [
    { description: "PIZZA", humanReadableDescription: "Pizza", price: 12.5 },
    { description: "BIERE", humanReadableDescription: "Bière", price: 4.3 },
  ],
  currency,
  date: "2026-11-07",
  title: "Restaurant",
});

const parseReceipt = (response: object, currency: Currency) => {
  const connector = new ServerConnector(system);
  jest.spyOn(connector, "post").mockResolvedValue(response);
  return connector.parseReceipt("base64", currency);
};

describe("ServerConnector.parseReceipt", () => {
  it("prices the items in the given currency", async () => {
    const receipt = await parseReceipt(receiptResponse("USD"), "USD");

    expect(receipt.items.map((item) => item.price)).toEqual([
      Money.create({ amount: 1250, currency: "USD" }),
      Money.create({ amount: 430, currency: "USD" }),
    ]);
    expect(receipt.total).toEqual(Money.create({ amount: 1680, currency: "USD" }));
  });

  it("ignores the currency read on the receipt", async () => {
    const receipt = await parseReceipt(receiptResponse("GBP"), "EUR");

    expect(receipt.total.currency).toEqual("EUR");
    expect(receipt.items.map((item) => item.price.currency)).toEqual(["EUR", "EUR"]);
  });

  it("gives a split that a balance in the group's currency accepts", async () => {
    const group = buildGroup({ currency: "USD", members: ["Alice", "Bob"] });
    const receipt = await parseReceipt(receiptResponse("USD"), group.currency);
    receipt.items[0].paid_for = ["Alice"];
    receipt.items[1].paid_for = ["Bob"];

    const expense = buildExpense(group, {
      payerName: "Alice",
      splitExpense: createReceiptSplit(receipt, group.members),
      receipt,
    });

    expect(computeBalance(group, [expense])).toEqual({
      Alice: Money.create({ amount: 430, currency: "USD" }),
      Bob: Money.create({ amount: -430, currency: "USD" }),
    });
  });
});
