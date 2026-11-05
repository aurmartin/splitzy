import { createMMKV, type MMKV } from "react-native-mmkv";

export class KVStorage {
  private storage: MMKV;

  constructor() {
    this.storage = createMMKV();
  }

  getItem(key: string): string | null {
    return this.storage.getString(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.remove(key);
  }
}
