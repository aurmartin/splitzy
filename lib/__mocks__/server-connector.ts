import { Money } from "@/lib/money";

const { ServerConnector } = jest.requireActual<
  typeof import("@/lib/server-connector")
>("@/lib/server-connector");

jest.spyOn(ServerConnector.prototype, "parseReceipt").mockResolvedValue({
  items: [],
  total: Money.create({ amount: 0, currency: "EUR" }),
  date: new Date(),
  title: "Test receipt",
  currency: "EUR",
});

export { ServerConnector };
