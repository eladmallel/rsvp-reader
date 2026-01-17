import '@testing-library/jest-dom';

const hasValidLocalStorage =
  typeof globalThis.localStorage !== 'undefined' &&
  typeof globalThis.localStorage.getItem === 'function' &&
  typeof globalThis.localStorage.setItem === 'function' &&
  typeof globalThis.localStorage.removeItem === 'function' &&
  typeof globalThis.localStorage.clear === 'function';

if (!hasValidLocalStorage) {
  const store = new Map<string, string>();
  const mockLocalStorage: Storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}
