import { describe, it, expect } from "vitest";
import { loadDark, loadDoc, saveDark, saveDoc, DOC_KEY, DARK_KEY } from "../storage";
import type { DocumentState } from "../types";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function makeStub(init: Record<string, string> = {}) {
  const store: Record<string, string> = { ...init };
  return {
    storage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
    } as StorageLike,
    dump: () => store,
  };
}

describe("storage - persistência localStorage", () => {
  it("loadDoc retorna null quando nada está salvo", () => {
    const { storage } = makeStub();
    expect(loadDoc(storage)).toBeNull();
  });

  it("saveDoc + loadDoc preservam o documento", () => {
    const { storage } = makeStub();
    const doc: DocumentState = {
      title: "Contrato",
      nodes: [{ id: "a", type: "title", text: "OBJETO", children: [] }],
    };
    saveDoc(doc, storage);
    expect(loadDoc(storage)).toEqual(doc);
  });

  it("loadDoc retorna null se o JSON for inválido/corrompido", () => {
    const { storage } = makeStub({ [DOC_KEY]: "not-json{{" });
    expect(loadDoc(storage)).toBeNull();
  });

  it("loadDoc retorna null se o formato não tiver nodes", () => {
    const { storage } = makeStub({ [DOC_KEY]: JSON.stringify({ title: "x" }) });
    expect(loadDoc(storage)).toBeNull();
  });

  it("dark mode: default true quando não salvo", () => {
    const { storage } = makeStub();
    expect(loadDark(storage)).toBe(true);
  });

  it("saveDark + loadDark preservam a preferência", () => {
    const { storage } = makeStub();
    saveDark(false, storage);
    expect(loadDark(storage)).toBe(false);
    saveDark(true, storage);
    expect(loadDark(storage)).toBe(true);
    expect(storage.getItem(DARK_KEY)).toBe("1");
  });
});