import type { TableData } from "./types";

/** Todas as funções retornam um novo TableData imutável (atualização atômica). */

export function setCaption(t: TableData, caption: string): TableData {
  return { ...t, caption };
}

export function setNumbered(t: TableData, numbered: boolean): TableData {
  return { ...t, numbered };
}

export function setHeader(t: TableData, idx: number, value: string): TableData {
  return { ...t, headers: t.headers.map((h, i) => (i === idx ? value : h)) };
}

export function addColumn(t: TableData): TableData {
  return {
    ...t,
    headers: [...t.headers, `Coluna ${t.headers.length + 1}`],
    rows: t.rows.map((r) => [...r, ""]),
  };
}

export function removeColumn(t: TableData, idx: number): TableData {
  return {
    ...t,
    headers: t.headers.filter((_, i) => i !== idx),
    rows: t.rows.map((r) => r.filter((_, i) => i !== idx)),
  };
}

export function addRow(t: TableData): TableData {
  return { ...t, rows: [...t.rows, t.headers.map(() => "")] };
}

export function removeRow(t: TableData, idx: number): TableData {
  return { ...t, rows: t.rows.filter((_, i) => i !== idx) };
}

export function setCell(t: TableData, r: number, c: number, value: string): TableData {
  return {
    ...t,
    rows: t.rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row
    ),
  };
}