import { computeBalance, computeOptimalReimbursements } from "./balance";
import { Money } from "@/lib/money";
import { buildAmountSplit, buildExpense, buildGroup } from "@/lib/test-factories";

describe("balance computation", () => {
  it("should handle empty expenses", () => {
    const group = buildGroup({ members: ["Alice", "Bob"] });

    const balance = computeBalance(group, []);

    expect(balance.Alice.amount).toEqual(0);
    expect(balance.Bob.amount).toEqual(0);
  });

  it("should compute balance for single expense", () => {
    const group = buildGroup({ members: ["Alice", "Bob"] });

    const expenses = [
      buildExpense(group, {
        payerName: "Alice",
        splitExpense: buildAmountSplit(group, { Alice: 5, Bob: 5 }),
      }),
    ];

    const balance = computeBalance(group, expenses);

    expect(balance.Alice.amount).toEqual(5);
    expect(balance.Bob.amount).toEqual(-5);
  });

  it("should compute balance for multiple expenses", () => {
    const group = buildGroup({ members: ["Alice", "Bob", "Charlie"] });

    const expenses = [
      buildExpense(group, {
        payerName: "Alice",
        splitExpense: buildAmountSplit(group, {
          Alice: 10,
          Bob: 10,
          Charlie: 10,
        }),
      }),
      buildExpense(group, {
        payerName: "Bob",
        splitExpense: buildAmountSplit(group, { Alice: 15, Bob: 15 }),
      }),
    ];

    const balance = computeBalance(group, expenses);

    expect(balance.Alice.amount).toEqual(5);
    expect(balance.Bob.amount).toEqual(5);
    expect(balance.Charlie.amount).toEqual(-10);
  });
});

describe("optimal reimbursements computation", () => {
  it("should return empty array for balanced group", () => {
    const balance = {
      Alice: Money.create({ amount: 0, currency: "USD" }),
      Bob: Money.create({ amount: 0, currency: "USD" }),
    };

    const reimbursements = computeOptimalReimbursements(balance);

    expect(reimbursements).toHaveLength(0);
  });

  it("should compute simple reimbursement between two people", () => {
    const balance = {
      Alice: Money.create({ amount: 1000, currency: "USD" }),
      Bob: Money.create({ amount: -1000, currency: "USD" }),
    };

    const reimbursements = computeOptimalReimbursements(balance);

    expect(reimbursements).toHaveLength(1);
    expect(reimbursements[0].from).toBe("Bob");
    expect(reimbursements[0].to).toBe("Alice");
    expect(reimbursements[0].amount.amount).toBe(1000);
  });

  it("should compute optimal reimbursements for multiple people", () => {
    const balance = {
      Alice: Money.create({ amount: 2000, currency: "USD" }),
      Bob: Money.create({ amount: -1000, currency: "USD" }),
      Charlie: Money.create({ amount: -1000, currency: "USD" }),
    };

    const reimbursements = computeOptimalReimbursements(balance);

    expect(reimbursements).toHaveLength(2);

    // Verify amounts
    const totalReimbursed = reimbursements.reduce((sum, r) => sum + r.amount.amount, 0);
    expect(totalReimbursed).toBe(2000);

    // Verify that Alice receives all the money
    const toAlice = reimbursements.filter((r) => r.to === "Alice");
    expect(toAlice.length).toBe(2);
    expect(toAlice[0].amount.amount + toAlice[1].amount.amount).toBe(2000);
  });

  it("should handle complex case with multiple transfers", () => {
    const balance = {
      Alice: Money.create({ amount: 3000, currency: "USD" }),
      Bob: Money.create({ amount: -1000, currency: "USD" }),
      Charlie: Money.create({ amount: -500, currency: "USD" }),
      David: Money.create({ amount: -1500, currency: "USD" }),
    };

    const reimbursements = computeOptimalReimbursements(balance);

    // Verify total amount matches
    const totalReimbursed = reimbursements.reduce((sum, r) => sum + r.amount.amount, 0);
    expect(totalReimbursed).toBe(3000);

    // Verify Alice receives everything
    const toAlice = reimbursements.filter((r) => r.to === "Alice");
    const aliceTotal = toAlice.reduce((sum, r) => sum + r.amount.amount, 0);
    expect(aliceTotal).toBe(3000);

    // Verify each person pays what they owe
    const fromBob = reimbursements.filter((r) => r.from === "Bob").reduce((sum, r) => sum + r.amount.amount, 0);
    expect(fromBob).toBe(1000);

    const fromCharlie = reimbursements.filter((r) => r.from === "Charlie").reduce((sum, r) => sum + r.amount.amount, 0);
    expect(fromCharlie).toBe(500);

    const fromDavid = reimbursements.filter((r) => r.from === "David").reduce((sum, r) => sum + r.amount.amount, 0);
    expect(fromDavid).toBe(1500);
  });
});
