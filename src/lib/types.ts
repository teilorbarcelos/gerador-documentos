export type NodeType = "title" | "item" | "subitem" | "note" | "table";

/** Profundidade máxima de aninhamento: 1 = título, 6 = subitem nível 6. */
export const MAX_DEPTH = 6;

/** Tipos de nó numerados (participam da numeração automática). */
export function isNumbered(node: DocNode): boolean {
  return node.type === "title" || node.type === "item" || node.type === "subitem";
}

export interface TableData {
  caption?: string;
  headers: string[];
  rows: string[][];
  /** Se true, a tabela recebe numeração como se fosse um item. */
  numbered: boolean;
}

export interface DocNode {
  id: string;
  type: NodeType;
  /** Texto para title/item/subitem/note. */
  text?: string;
  /** Ícone da nota explicativa (ℹ️, 📝, etc). Usado apenas quando type === "note". */
  noteIcon?: string;
  /** Dados da tabela. Usado apenas quando type === "table". */
  table?: TableData;
  /** Filhos na ordem: title só contém item/note/table; item/subitem podem conter
   *  subitem (nível abaixo), note e table. */
  children: DocNode[];
}

export interface DocumentState {
  title?: string;
  nodes: DocNode[];
}

let counter = 0;
export function newId(prefix = "n"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export function emptyTable(): TableData {
  return {
    headers: ["Coluna 1", "Coluna 2"],
    rows: [["", ""]],
    numbered: false,
  };
}
