import type { DocumentState } from "./types";

export const DOC_KEY = "gerador-doc-v1";
export const DARK_KEY = "gerador-dark-v1";

type StorageLike = Pick<Storage, "getItem" | "setItem"> | null;

function defaultStorage(): StorageLike {
  return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
}

export function loadDoc(storage: StorageLike = defaultStorage()): DocumentState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DOC_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocumentState;
    if (!parsed || !Array.isArray(parsed.nodes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDoc(doc: DocumentState, storage: StorageLike = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(DOC_KEY, JSON.stringify(doc));
  } catch {
    /* quota/cota indisponível — ignora */
  }
}

export function loadDark(storage: StorageLike = defaultStorage()): boolean {
  if (!storage) return true;
  try {
    const raw = storage.getItem(DARK_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function saveDark(value: boolean, storage: StorageLike = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(DARK_KEY, value ? "1" : "0");
  } catch {
    /* ignora */
  }
}