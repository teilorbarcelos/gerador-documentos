import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { extractLabels } from "../extractLabels";
import { computeLabels } from "../numbering";
import { generateHtml } from "../html";
import type { DocNode } from "../types";

const MODEL = readFileSync(
  join(__dirname, "fixtures", "converted.html"),
  "utf-8"
);

/** Constrói uma árvore de DocNode a partir dos rótulos extraídos. */
function buildTreeFromLabels(labels: string[]): DocNode[] {
  const root: DocNode[] = [];
  let curTitle: DocNode | null = null;
  let curItem: DocNode | null = null;

  for (const label of labels) {
    const parts = label.split(".");
    const node: DocNode = { id: label, type: "title", text: label, children: [] };

    if (parts.length === 1) {
      curTitle = node;
      curItem = null;
      root.push(curTitle);
    } else if (parts.length === 2) {
      node.type = "item";
      curTitle!.children.push(node);
      curItem = node;
    } else {
      node.type = "subitem";
      curItem!.children.push(node);
    }
  }
  return root;
}

describe("Prova com o modelo converted.html (somente leitura)", () => {
  const expected = extractLabels(MODEL);

  it("extrai rótulos numerados do modelo", () => {
    expect(expected.length).toBeGreaterThan(50);
    expect(expected[0]).toBe("1");
    expect(expected[expected.length - 1]).toBe("16.14");
  });

  it("o modelo é um outline bem formado (todo prefixo existe)", () => {
    const set = new Set(expected);
    for (const label of expected) {
      const parts = label.split(".");
      while (parts.length > 1) {
        parts.pop();
        expect(set.has(parts.join("."))).toBe(true);
      }
    }
  });

  it("gera HTML cuja numeração reproduz exatamente a do modelo", () => {
    const tree = buildTreeFromLabels(expected);
    const labels = computeLabels(tree);
    // cada nó recebe o rótulo esperado
    for (const node of tree) {
      expect(labels[node.id]).toBe(node.id);
    }

    // geração ponta a ponta produz os mesmos rótulos, na mesma ordem
    const html = generateHtml({ nodes: tree });
    const got = extractLabels(html);
    expect(got).toEqual(expected);
  });
});
