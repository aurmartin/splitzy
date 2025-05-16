import { randomUUID } from "expo-crypto";

export const generateId = () => {
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

type LogLevel = "debug" | "info" | "warn" | "error";

const doLog = (level: LogLevel, module: string, ...args: any[]) => {
  const timestamp = new Date().toISOString();
  console[level](`${timestamp} ${module}:`, ...args);
};

export const createLogger = (module: string) => {
  return {
    debug: (...args: any[]) => doLog("debug", module, ...args),
    info: (...args: any[]) => doLog("info", module, ...args),
    warn: (...args: any[]) => doLog("warn", module, ...args),
    error: (...args: any[]) => doLog("error", module, ...args),
  };
};

export const delay = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
