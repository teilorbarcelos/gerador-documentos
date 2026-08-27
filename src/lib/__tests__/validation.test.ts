import { describe, it, expect } from "vitest";
import {
  findDuplicateIds,
  findEmptyAboveFilledIds,
  flattenNodes,
  normalizeText,
  validateDoc,
} from "../validation";
import type { DocNode, DocumentState } from "../types";

function mk(type: DocNode["type"], text = "", children: DocNode[] = []): DocNode {
  return { id: Math.random().toString(36).slice(2), type, text, children };
}

function doc(nodes: DocNode[], title = ""): DocumentState {
  return { title, nodes };
}

function sorted(set: ReadonlySet<string>): string[] {
  return [...set].sort();
}

describe("normalizeText", () => {
  it("normaliza maiúsculas, espaços e extremidades", () => {
    expect(normalizeText("  Atribuições   do  Cargo ")).toBe("atribuições do cargo");
  });

  it("retorna string vazia para texto só de espaços", () => {
    expect(normalizeText("   \n  ")).toBe("");
  });
});

describe("findDuplicateIds - itens repetidos", () => {
  it("marca todas as ocorrências de texto repetido", () => {
    const a = mk("item", "Atribuições");
    const b = mk("item", "Atribuições");
    const c = mk("item", "Outro");
    const ids = findDuplicateIds(doc([mk("title", "T", [a, b, c])]));
    expect(sorted(ids)).toEqual(sorted(new Set([a.id, b.id])));
  });

  it("ignora maiúsculas/minúsculas e espaços", () => {
    const a = mk("item", "Atribuições do cargo");
    const b = mk("item", "  atribuições   DO cargo ");
    expect(findDuplicateIds(doc([mk("title", "T", [a, b])]))).toEqual(new Set([a.id, b.id]));
  });

  it("ignora itens vazios (vazio não é duplicata)", () => {
    const a = mk("item", "");
    const b = mk("item", "");
    expect(findDuplicateIds(doc([mk("title", "T", [a, b])])).size).toBe(0);
  });

  it("detecta duplicatas independente do tipo (título x item)", () => {
    const t = mk("title", "OBJETO");
    const i = mk("item", "objeto");
    expect(findDuplicateIds(doc([t, i]))).toEqual(new Set([t.id, i.id]));
  });

  it("detecta duplicatas na legenda de tabela", () => {
    const t1: DocNode = {
      id: "t1",
      type: "table",
      children: [],
      table: { headers: ["A"], rows: [["1"]], numbered: false, caption: "Valores" },
    };
    const t2: DocNode = {
      id: "t2",
      type: "table",
      children: [],
      table: { headers: ["B"], rows: [["2"]], numbered: false, caption: "valores" },
    };
    expect(findDuplicateIds(doc([t1, t2]))).toEqual(new Set([t1.id, t2.id]));
  });

  it("considera o título do documento na detecção de duplicatas", () => {
    const i = mk("item", "Contrato de Prestação");
    const ids = findDuplicateIds(doc([mk("title", "T", [i])], "CONTRATO DE PRESTAÇÃO"));
    expect(sorted(ids)).toEqual(sorted(new Set([i.id, "doc-title"])));
  });

  it("retorna vazio quando não há repetição", () => {
    const nodes = [mk("title", "A", [mk("item", "1"), mk("item", "2")])];
    expect(findDuplicateIds(doc(nodes)).size).toBe(0);
  });
});

describe("findEmptyAboveFilledIds - item vazio acima de conteúdo", () => {
  it("marca item vazio que está acima de item preenchido", () => {
    const empty = mk("item", "");
    const filled = mk("item", "Preenchido");
    const ids = findEmptyAboveFilledIds(doc([mk("title", "T", [empty, filled])]));
    expect(ids).toEqual(new Set([empty.id]));
  });

  it("não marca itens vazios no fim (sem conteúdo abaixo)", () => {
    const empty = mk("item", "");
    const ids = findEmptyAboveFilledIds(doc([mk("title", "T", [empty])]));
    expect(ids.size).toBe(0);
  });

  it("marca item vazio acima de tabela", () => {
    const empty = mk("item", "");
    const table: DocNode = {
      id: "t",
      type: "table",
      children: [],
      table: { headers: ["A"], rows: [["1"]], numbered: false },
    };
    const ids = findEmptyAboveFilledIds(doc([mk("title", "T", [empty, table])]));
    expect(ids).toEqual(new Set([empty.id]));
  });

  it("não marca itens preenchidos", () => {
    const a = mk("item", "Um");
    const b = mk("item", "Dois");
    expect(findEmptyAboveFilledIds(doc([mk("title", "T", [a, b])])).size).toBe(0);
  });

  it("analisa cada grupo de irmãos independentemente", () => {
    const e1 = mk("item", "");
    const f1 = mk("item", "Preenchido");
    const e2 = mk("item", "");
    const f2 = mk("item", "Também preenchido");
    const t1 = mk("title", "T1", [e1, f1]);
    const t2 = mk("title", "T2", [e2, f2]);
    const ids = findEmptyAboveFilledIds(doc([t1, t2]));
    expect(ids).toEqual(new Set([e1.id, e2.id]));
  });

  it("marca título vazio acima de título preenchido na raiz", () => {
    const empty = mk("title", "");
    const filled = mk("title", "OBJETO");
    const ids = findEmptyAboveFilledIds(doc([empty, filled]));
    expect(ids).toEqual(new Set([empty.id]));
  });

  it("não considera tabelas como 'vazias' para esta regra", () => {
    const table: DocNode = {
      id: "t",
      type: "table",
      children: [],
      table: { headers: ["A"], rows: [["1"]], numbered: false },
    };
    expect(findEmptyAboveFilledIds(doc([table])).size).toBe(0);
  });

  it("marca item vazio que possui subitem preenchido", () => {
    const empty = mk("item", "", [mk("subitem", "Subitem preenchido")]);
    const ids = findEmptyAboveFilledIds(doc([mk("title", "T", [empty])]));
    expect(ids).toEqual(new Set([empty.id]));
  });

  it("marca item vazio acima de item que possui subitem preenchido", () => {
    const a = mk("item", "");
    const b = mk("item", "", [mk("subitem", "Preenchido")]);
    const ids = findEmptyAboveFilledIds(doc([mk("title", "T", [a, b])]));
    expect(ids).toEqual(new Set([a.id, b.id]));
  });

  it("não marca item vazio cujos subitens também estão vazios no fim", () => {
    const empty = mk("item", "", [mk("subitem", "")]);
    expect(findEmptyAboveFilledIds(doc([mk("title", "T", [empty])])).size).toBe(0);
  });

  it("marca item vazio acima de subitem preenchido em nível profundo", () => {
    const leaf = mk("subitem", "Preenchido");
    const mid1 = mk("subitem", "", [leaf]);
    const mid2 = mk("subitem", "", [mid1]);
    const emptyItem = mk("item", "", [mid2]);
    const ids = findEmptyAboveFilledIds(doc([mk("title", "T", [emptyItem])]));
    expect(ids).toEqual(new Set([emptyItem.id, mid2.id, mid1.id]));
  });

  it("marca subitem vazio acima de item irmão preenchido (ordem do documento)", () => {
    const sub = mk("subitem", "");
    const item1 = mk("item", "Primeiro", [sub]);
    const item2 = mk("item", "Segundo");
    const ids = findEmptyAboveFilledIds(doc([mk("title", "T", [item1, item2])]));
    expect(ids).toEqual(new Set([sub.id]));
  });

  it("marca item vazio acima de conteúdo preenchido em título seguinte", () => {
    const emptyItem = mk("item", "");
    const t1 = mk("title", "T1", [emptyItem]);
    const t2 = mk("title", "T2", [mk("item", "Preenchido")]);
    const ids = findEmptyAboveFilledIds(doc([t1, t2]));
    expect(ids).toEqual(new Set([emptyItem.id]));
  });

  it("não marca vazio no fim do documento mesmo em profundidade", () => {
    const sub = mk("subitem", "");
    const item = mk("item", "Preenchido", [sub]);
    expect(findEmptyAboveFilledIds(doc([mk("title", "T", [item])])).size).toBe(0);
  });
});

describe("flattenNodes - ordem do documento", () => {
  it("achata em pré-order (nó e depois filhos)", () => {
    const s1 = mk("subitem", "s1");
    const s2 = mk("subitem", "s2");
    const i1 = mk("item", "i1", [s1, s2]);
    const i2 = mk("item", "i2");
    const t = mk("title", "T", [i1, i2]);
    expect(flattenNodes([t]).map((n) => n.id)).toEqual([t.id, i1.id, s1.id, s2.id, i2.id]);
  });

  it("inclui notas e tabelas na ordem", () => {
    const note = mk("note", "obs");
    const t = mk("title", "T", [note]);
    expect(flattenNodes([t]).map((n) => n.id)).toEqual([t.id, note.id]);
  });
});

describe("validateDoc", () => {
  it("combina duplicatas e vazios acima de conteúdo", () => {
    const dup1 = mk("item", "Repetido");
    const dup2 = mk("item", "Repetido");
    const empty = mk("item", "");
    const filled = mk("item", "Preenchido");
    const result = validateDoc(doc([mk("title", "T", [dup1, dup2, empty, filled])]));
    expect(sorted(result.duplicateIds)).toEqual(sorted(new Set([dup1.id, dup2.id])));
    expect(result.emptyAboveFilledIds).toEqual(new Set([empty.id]));
  });

  it("retorna conjuntos vazios para documento limpo", () => {
    const result = validateDoc(doc([mk("title", "A", [mk("item", "1")])]));
    expect(result.duplicateIds.size).toBe(0);
    expect(result.emptyAboveFilledIds.size).toBe(0);
  });
});