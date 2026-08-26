import { describe, it, expect } from "vitest";
import { generateHtml } from "../html";
import { extractLabels } from "../extractLabels";
import type { DocumentState } from "../types";

function numberedDoc(nodes: DocumentState["nodes"], title = ""): string {
  return generateHtml({ title, nodes });
}

describe("generateHtml - estrutura de saída", () => {
  it("gera um documento HTML válido com tabela wrapper", () => {
    const html = numberedDoc([
      { id: "a", type: "title", text: "OBJETO", children: [] },
      {
        id: "b",
        type: "title",
        text: "JUSTIFICATIVA",
        children: [{ id: "b1", type: "note", noteIcon: "📝", text: "Preencha:", children: [] }],
      },
    ]);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('class="ck-table-resized"');
    expect(html).toContain("Preencha:");
    expect(extractLabels(html)).toEqual(["1", "2"]);
  });

  it("escapa conteúdo perigoso", () => {
    const html = numberedDoc([
      { id: "x", type: "title", text: "<script>alert(1)</script>", children: [] },
    ]);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("título fica inteiro em negrito (número + texto)", () => {
    const html = numberedDoc([
      { id: "a", type: "title", text: "OBJETO", children: [] },
    ]);
    expect(html).toContain("<strong>1.&nbsp;&nbsp;&nbsp;&nbsp;OBJETO&nbsp;</strong>");
  });

  it("item: apenas o marcador numérico em negrito, texto normal", () => {
    const html = numberedDoc([
      {
        id: "a",
        type: "title",
        text: "ESPECIFICAÇÃO",
        children: [{ id: "a1", type: "item", text: "Atribuições: ministrar aulas.", children: [] }],
      },
    ]);
    // marcador em <strong>
    expect(html).toContain("<strong>1.1&nbsp;&nbsp;&nbsp;&nbsp;</strong>");
    // texto do item NÃO fica dentro de <strong>
    expect(html).toContain("</strong>Atribuições: ministrar aulas.");
    // o texto não deve estar em negrito
    expect(html).not.toContain("</strong>Atribuições: ministrar aulas.</strong>");
  });

  it("subitem: apenas o marcador em negrito", () => {
    const html = numberedDoc([
      {
        id: "a",
        type: "title",
        text: "T",
        children: [
          { id: "a1", type: "item", text: "Item", children: [{ id: "a1a", type: "subitem", text: "Sub.", children: [] }] },
        ],
      },
    ]);
    expect(html).toContain("<strong>1.1.1&nbsp;&nbsp;&nbsp;&nbsp;</strong>Sub.");
  });

  it("aninhamento profundo gera rótulos completos", () => {
    const html = numberedDoc([
      {
        id: "a",
        type: "title",
        text: "T",
        children: [
          {
            id: "a1",
            type: "item",
            text: "i",
            children: [
              { id: "a11", type: "subitem", text: "s1", children: [
                { id: "a111", type: "subitem", text: "s2", children: [
                  { id: "a1111", type: "subitem", text: "s3", children: [] },
                ] },
              ] },
            ],
          },
        ],
      },
    ]);
    expect(extractLabels(html)).toEqual(["1", "1.1", "1.1.1", "1.1.1.1", "1.1.1.1.1"]);
  });

  it("adiciona linha vazia entre itens", () => {
    const html = numberedDoc([
      {
        id: "a",
        type: "title",
        text: "T",
        children: [
          { id: "a1", type: "item", text: "Primeiro", children: [] },
          { id: "a2", type: "item", text: "Segundo", children: [] },
        ],
      },
    ]);
    // após cada item há um parágrafo vazio <p>&nbsp;</p>
    const emptyLines = html.match(/<p style="text-align:justify;">&nbsp;<\/p>/g);
    expect(emptyLines).not.toBeNull();
    expect(emptyLines!.length).toBeGreaterThanOrEqual(2);
    // separação entre os dois itens
    const a1 = html.indexOf("<strong>1.1");
    const a2 = html.indexOf("<strong>1.2");
    const between = html.slice(a1, a2);
    expect(between).toContain('<p style="text-align:justify;">&nbsp;</p>');
  });

  it("coloca uma linha vazia abaixo de cada título", () => {
    const html = numberedDoc([
      { id: "a", type: "title", text: "OBJETO", children: [] },
    ]);
    const title = html.indexOf("<strong>1.");
    const after = html.slice(title, title + 400);
    expect(after).toContain('<p style="text-align:justify;">&nbsp;</p>');
  });

  it("coloca duas linhas vazias acima de cada título (exceto o primeiro)", () => {
    const html = numberedDoc([
      { id: "a", type: "title", text: "OBJETO", children: [] },
      { id: "b", type: "title", text: "JUSTIFICATIVA", children: [] },
      { id: "c", type: "title", text: "FIM", children: [] },
    ]);
    // antes do primeiro título não deve haver linhas vazias
    const firstTitle = html.indexOf("<strong>1.");
    expect(html.slice(0, firstTitle).match(/<p style="text-align:justify;">&nbsp;<\/p>/g) ?? []).toHaveLength(0);
    // antes do segundo título: 1 linha (abaixo do 1º título) + 2 linhas (acima do 2º)
    const secondTitle = html.indexOf("<strong>2.");
    const beforeSecondLines = html.slice(0, secondTitle).match(/<p style="text-align:justify;">&nbsp;<\/p>/g) ?? [];
    expect(beforeSecondLines).toHaveLength(3);
    // antes do terceiro título: 1 (abaixo do 1º) + 2 (acima do 2º) + 1 (abaixo do 2º) + 2 (acima do 3º)
    const thirdTitle = html.indexOf("<strong>3.");
    const beforeThirdLines = html.slice(0, thirdTitle).match(/<p style="text-align:justify;">&nbsp;<\/p>/g) ?? [];
    expect(beforeThirdLines).toHaveLength(6);
  });

  it("com título de documento, o primeiro título também recebe 2 linhas acima", () => {
    const html = numberedDoc(
      [{ id: "a", type: "title", text: "OBJETO", children: [] }],
      "CONTRATO"
    );
    const firstTitle = html.indexOf("<strong>1.");
    const before = html.slice(0, firstTitle);
    const lines = before.match(/<p style="text-align:justify;">&nbsp;<\/p>/g) ?? [];
    expect(lines).toHaveLength(2);
  });

  it("renderiza tabela com cabeçalhos e linhas", () => {
    const html = numberedDoc([
      {
        id: "t",
        type: "table",
        children: [],
        table: {
          caption: "Valores",
          headers: ["Descrição", "Valor"],
          rows: [["Serviço", "R$ 100"]],
          numbered: false,
        },
      },
    ]);
    expect(html).toContain("<table");
    expect(html).toContain("Descrição");
    expect(html).toContain("Serviço");
    expect(html).toContain("Valores");
  });

  it("tabela numerada exibe marcador em negrito", () => {
    const html = numberedDoc([
      {
        id: "t",
        type: "table",
        children: [],
        table: { headers: ["a"], rows: [["1"]], numbered: true },
      },
    ]);
    expect(html).toContain("<strong>1&nbsp;&nbsp;&nbsp;&nbsp;</strong>");
  });
});