import { describe, it, expect } from "vitest";
import { computeLabels } from "../numbering";
import { addChild, addRoot, removeNode } from "../doc";
import type { DocNode } from "../types";

function mk(type: DocNode["type"], children: DocNode[] = []): DocNode {
  return { id: Math.random().toString(36).slice(2), type, text: "", children };
}

describe("computeLabels - numeração automática", () => {
  it("numera títulos sequencialmente", () => {
    const nodes = [mk("title"), mk("title"), mk("title")];
    const labels = computeLabels(nodes);
    expect(Object.values(labels)).toEqual(["1", "2", "3"]);
  });

  it("numera itens e subitens em hierarquia", () => {
    const nodes = [
      mk("title", [
        mk("item", [mk("subitem"), mk("subitem")]),
        mk("item"),
      ]),
    ];
    const labels = computeLabels(nodes);
    const vals = Object.values(labels);
    expect(vals).toContain("1");
    expect(vals).toContain("1.1");
    expect(vals).toContain("1.1.1");
    expect(vals).toContain("1.1.2");
    expect(vals).toContain("1.2");
  });

  it("suporta aninhamento profundo (6 níveis)", () => {
    const nodes = [
      mk("title", [
        mk("item", [
          mk("subitem", [
            mk("subitem", [
              mk("subitem", [
                mk("subitem"),
              ]),
            ]),
          ]),
        ]),
      ]),
    ];
    const labels = computeLabels(nodes);
    const vals = Object.values(labels);
    expect(vals).toContain("1");
    expect(vals).toContain("1.1");
    expect(vals).toContain("1.1.1");
    expect(vals).toContain("1.1.1.1");
    expect(vals).toContain("1.1.1.1.1");
    expect(vals).toContain("1.1.1.1.1.1");
  });

  it("numera irmãos independentemente em níveis profundos", () => {
    const nodes = [
      mk("title", [
        mk("item", [mk("subitem", [mk("subitem"), mk("subitem")]), mk("subitem")]),
        mk("item"),
      ]),
    ];
    const labels = computeLabels(nodes);
    const vals = Object.values(labels);
    expect(vals).toContain("1.1.1.1");
    expect(vals).toContain("1.1.1.2");
    expect(vals).toContain("1.1.2");
    expect(vals).toContain("1.2");
  });

  it("renumera itens ao remover um item intermediário", () => {
    let [nodes] = addRoot([], "title");
    let titleId = nodes[0].id;
    let tmp: [DocNode[], string];
    tmp = addChild(nodes, titleId, "item");
    nodes = tmp[0];
    tmp = addChild(nodes, titleId, "item");
    nodes = tmp[0];
    const itemIds = nodes[0].children.map((c) => c.id);
    // remove o primeiro item
    nodes = removeNode(nodes, itemIds[0]);
    const labels = computeLabels(nodes);
    // sobra apenas um item, que vira "1.1"
    expect(Object.values(labels)).toEqual(["1", "1.1"]);
  });

  it("tabela numerada recebe rótulo de item", () => {
    const nodes = [
      mk("title", [
        { id: "t1", type: "table", children: [], table: { headers: ["a"], rows: [["1"]], numbered: true } },
      ]),
    ];
    const labels = computeLabels(nodes);
    expect(labels["t1"]).toBe("1.1");
  });

  it("notas e tabelas não numeradas não recebem rótulo", () => {
    const nodes = [
      mk("title", [
        mk("note"),
        { id: "t2", type: "table", children: [], table: { headers: ["a"], rows: [["1"]], numbered: false } },
      ]),
    ];
    const labels = computeLabels(nodes);
    expect(labels[nodes[0].children[0].id]).toBe("");
    expect(labels["t2"]).toBe("");
  });
});