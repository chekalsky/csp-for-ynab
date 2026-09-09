import { beforeEach } from "vitest";

class MemoryStorage implements Storage {
  #data = new Map<string, string>();
  get length() {
    return this.#data.size;
  }
  clear() {
    this.#data.clear();
  }
  getItem(key: string) {
    return this.#data.has(key) ? this.#data.get(key)! : null;
  }
  key(index: number) {
    return [...this.#data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.#data.delete(key);
  }
  setItem(key: string, value: string) {
    this.#data.set(String(key), String(value));
  }
}

const location = {
  origin: "https://csp.test",
  pathname: "/",
  search: "",
  hash: "",
};

const history = {
  replaceState() {
    location.hash = "";
  },
};

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();

Object.assign(globalThis, { localStorage, sessionStorage, location });
(globalThis as { window: typeof globalThis }).window = globalThis;
Object.assign(globalThis.window, { localStorage, sessionStorage, location, history });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  location.hash = "";
  location.pathname = "/";
  location.search = "";
});
