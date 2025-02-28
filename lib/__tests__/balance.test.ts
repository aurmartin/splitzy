import { computeBalance, computeOptimalReimbursements } from "../balance";
import type { Expense } from "../expenses";
import { Group } from "../groups";
import dinero from "dinero.js";

const createExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "1",
  groupId: "1",
  title: "Test Expense",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: undefined,
  receipt: null,
  payerName: "Alice",
  splitExpense: {
    type: "percentage",
    total: dinero({ amount: 0, currency: "USD" }),
    members: [],
    ratios: {},
  },
  ...overrides,
});

describe("balance computation", () => {
  it("should handle empty expenses", () => {
    const group = {
      id: "1",
      name: "Test Group",
      currency: "USD",
      members: ["Alice", "Bob"],
    } as Group;
    const expenses: Expense[] = [];

    const balance = computeBalance(group, expenses);

    expect(balance.Alice.getAmount()).toEqual(0);
    expect(balance.Bob.getAmount()).toEqual(0);
  });

  it("should compute balance for single expense", () => {
    const group = {
      currency: "USD",
      members: ["Alice", "Bob"],
    } as Group;

    const expenses = [
      createExpense({
        payerName: "Alice",
        splitExpense: {
          type: "amount",
          total: dinero({ amount: 10, currency: "USD" }),
          members: ["Alice", "Bob"],
          amounts: {
            Alice: dinero({ amount: 5, currency: "USD" }),
            Bob: dinero({ amount: 5, currency: "USD" }),
          },
        },
      }),
    ] as Expense[];

    const balance = computeBalance(group, expenses);

    expect(balance.Alice.getAmount()).toEqual(5);
    expect(balance.Bob.getAmount()).toEqual(-5);
  });

  it("should compute balance for multiple expenses", () => {
    const group = {
      currency: "USD",
      members: ["Alice", "Bob", "Charlie"],
    } as Group;

    const expenses = [
      createExpense({
        payerName: "Alice",
        splitExpense: {
          type: "amount",
          total: dinero({ amount: 30, currency: "USD" }),
          members: ["Alice", "Bob", "Charlie"],
          amounts: {
            Alice: dinero({ amount: 10, currency: "USD" }),
            Bob: dinero({ amount: 10, currency: "USD" }),
            Charlie: dinero({ amount: 10, currency: "USD" }),
          },
        },
      }),
      createExpense({
        payerName: "Bob",
        splitExpense: {
          type: "amount",
          total: dinero({ amount: 30, currency: "USD" }),
          members: ["Alice", "Bob", "Charlie"],
          amounts: {
            Alice: dinero({ amount: 15, currency: "USD" }),
            Bob: dinero({ amount: 15, currency: "USD" }),
          },
        },
      }),
    ] as Expense[];

    const balance = computeBalance(group, expenses);

    expect(balance.Alice.getAmount()).toEqual(5);
    expect(balance.Bob.getAmount()).toEqual(5);
    expect(balance.Charlie.getAmount()).toEqual(-10);
  });
});

describe("optimal reimbursements computation", () => {
  it("should return empty array for balanced group", () => {
    const balance = {
      Alice: dinero({ amount: 0, currency: "USD" }),
      Bob: dinero({ amount: 0, currency: "USD" }),
    };

    const reimbursements = computeOptimalReimbursements(balance);

    expect(reimbursements).toHaveLength(0);
  });

  it("should compute simple reimbursement between two people", () => {
    const balance = {
      Alice: dinero({ amount: 1000, currency: "USD" }),
      Bob: dinero({ amount: -1000, currency: "USD" }),
    };

    const reimbursements = computeOptimalReimbursements(balance);

    expect(reimbursements).toHaveLength(1);
    expect(reimbursements[0].from).toBe("Bob");
    expect(reimbursements[0].to).toBe("Alice");
    expect(reimbursements[0].amount.getAmount()).toBe(1000);
  });

  it("should compute optimal reimbursements for multiple people", () => {
    const balance = {
      Alice: dinero({ amount: 2000, currency: "USD" }),
      Bob: dinero({ amount: -1000, currency: "USD" }),
      Charlie: dinero({ amount: -1000, currency: "USD" }),
    };

    const reimbursements = computeOptimalReimbursements(balance);

    expect(reimbursements).toHaveLength(2);

    // Verify amounts
    const totalReimbursed = reimbursements.reduce(
      (sum, r) => sum + r.amount.getAmount(),
      0,
    );
    expect(totalReimbursed).toBe(2000);

    // Verify that Alice receives all the money
    const toAlice = reimbursements.filter((r) => r.to === "Alice");
    expect(toAlice.length).toBe(2);
    expect(toAlice[0].amount.getAmount() + toAlice[1].amount.getAmount()).toBe(
      2000,
    );
  });

  it("should handle complex case with multiple transfers", () => {
    const balance = {
      Alice: dinero({ amount: 3000, currency: "USD" }),
      Bob: dinero({ amount: -1000, currency: "USD" }),
      Charlie: dinero({ amount: -500, currency: "USD" }),
      David: dinero({ amount: -1500, currency: "USD" }),
    };

    const reimbursements = computeOptimalReimbursements(balance);

    // Verify total amount matches
    const totalReimbursed = reimbursements.reduce(
      (sum, r) => sum + r.amount.getAmount(),
      0,
    );
    expect(totalReimbursed).toBe(3000);

    // Verify Alice receives everything
    const toAlice = reimbursements.filter((r) => r.to === "Alice");
    const aliceTotal = toAlice.reduce(
      (sum, r) => sum + r.amount.getAmount(),
      0,
    );
    expect(aliceTotal).toBe(3000);

    // Verify each person pays what they owe
    const fromBob = reimbursements
      .filter((r) => r.from === "Bob")
      .reduce((sum, r) => sum + r.amount.getAmount(), 0);
    expect(fromBob).toBe(1000);

    const fromCharlie = reimbursements
      .filter((r) => r.from === "Charlie")
      .reduce((sum, r) => sum + r.amount.getAmount(), 0);
    expect(fromCharlie).toBe(500);

    const fromDavid = reimbursements
      .filter((r) => r.from === "David")
      .reduce((sum, r) => sum + r.amount.getAmount(), 0);
    expect(fromDavid).toBe(1500);
  });
});
