import { describe, it, expect } from "vitest";
import {
  addColumn,
  addRow,
  removeColumn,
  removeRow,
  setCaption,
  setCell,
  setHeader,
  setNumbered,
} from "../tableOps";
import type { TableData } from "../types";

function base(): TableData {
  return {
    headers: ["A", "B"],
    rows: [
      ["1", "2"],
      ["3", "4"],
    ],
    numbered: false,
  };
}

describe("tableOps - operações atômicas de tabela", () => {
  it("addColumn mantém headers e adiciona célula vazia em cada linha", () => {
    const t = addColumn(base());
    expect(t.headers).toEqual(["A", "B", "Coluna 3"]);
    expect(t.rows).toEqual([
      ["1", "2", ""],
      ["3", "4", ""],
    ]);
  });

  it("addColumn preserva dados existentes (não perde header/linhas)", () => {
    const t = addColumn(addColumn(base()));
    expect(t.headers).toEqual(["A", "B", "Coluna 3", "Coluna 4"]);
    expect(t.rows[0]).toEqual(["1", "2", "", ""]);
  });

  it("removeColumn remove header e célula de todas as linhas", () => {
    const t = removeColumn(base(), 0);
    expect(t.headers).toEqual(["B"]);
    expect(t.rows).toEqual([
      ["2"],
      ["4"],
    ]);
  });

  it("addRow adiciona linha com número de colunas igual ao header", () => {
    const t = addRow(base());
    expect(t.rows).toHaveLength(3);
    expect(t.rows[2]).toEqual(["", ""]);
  });

  it("addRow preserva colunas existentes", () => {
    const t = addRow(addColumn(base()));
    expect(t.rows[2]).toEqual(["", "", ""]);
    expect(t.headers).toEqual(["A", "B", "Coluna 3"]);
  });

  it("removeRow remove apenas a linha pedida", () => {
    const t = removeRow(base(), 1);
    expect(t.rows).toEqual([["1", "2"]]);
  });

  it("setCell atualiza apenas a célula pedida", () => {
    const t = setCell(base(), 1, 0, "X");
    expect(t.rows).toEqual([
      ["1", "2"],
      ["X", "4"],
    ]);
  });

  it("setHeader atualiza apenas o header pedido", () => {
    const t = setHeader(base(), 1, "Novo");
    expect(t.headers).toEqual(["A", "Novo"]);
  });

  it("setCaption e setNumbered alteram campos isolados", () => {
    expect(setCaption(base(), "Legenda").caption).toBe("Legenda");
    expect(setNumbered(base(), true).numbered).toBe(true);
    expect(setNumbered(base(), true).headers).toEqual(["A", "B"]);
  });

  it("operações são imutáveis (não mutam o original)", () => {
    const t = base();
    addColumn(t);
    addRow(t);
    expect(t.rows).toHaveLength(2);
    expect(t.headers).toEqual(["A", "B"]);
  });
});