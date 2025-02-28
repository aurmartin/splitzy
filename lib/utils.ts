import { randomUUID } from "expo-crypto";

export const generateId = () => {
  if (process.env.NODE_ENV === "test") {
    const { v4 } = require("uuid");
    return v4();
  }

  return randomUUID();
};

export const time = <T>(name: string, fn: () => T): T => {
  const startTime = performance.now();
  const result = fn();
  const endTime = performance.now();
  console.log(`${name} took ${(endTime - startTime).toFixed(2)}ms`);
  return result;
};

export const asyncTime = async <T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  console.log(`${name} took ${(endTime - startTime).toFixed(2)}ms`);
  return result;
};
