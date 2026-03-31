/**
 * Lightweight localStorage persistence for Zustand stores.
 * Saves on every state change, restores on load.
 * Media blob URLs are excluded since they don't survive page reloads.
 */

const STORAGE_PREFIX = 'dragon-editor:';

export function saveState(key: string, state: unknown): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_PREFIX + key, serialized);
  } catch {
    // localStorage full or private browsing — silently ignore
  }
}

export function loadState<T>(key: string): T | null {
  try {
    const serialized = localStorage.getItem(STORAGE_PREFIX + key);
    if (!serialized) return null;
    return JSON.parse(serialized) as T;
  } catch {
    return null;
  }
}

export function clearState(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

export function clearAllState(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
