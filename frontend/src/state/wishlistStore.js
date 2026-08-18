import { useSyncExternalStore } from "react";

/**
 * Lightweight wishlist store backed by localStorage, exposed via
 * useSyncExternalStore so any component can subscribe without prop drilling.
 */
const KEY = "asatech-wishlist";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let ids = load();
const listeners = new Set();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return ids;
}

export function toggleWishlist(id) {
  ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  emit();
}

export function removeWishlist(id) {
  ids = ids.filter((x) => x !== id);
  emit();
}

export function hasWishlist(id) {
  return ids.includes(id);
}

export function useWishlist() {
  const list = useSyncExternalStore(subscribe, getSnapshot);
  return {
    ids: list,
    has: (id) => list.includes(id),
    toggle: toggleWishlist,
    remove: removeWishlist,
  };
}
