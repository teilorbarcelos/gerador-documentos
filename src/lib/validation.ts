import type { DocNode, DocumentState } from "./types";

export interface ValidationResult {
  /** Ids de nós cujo texto está repetido em outro ponto do documento. */
  duplicateIds: ReadonlySet<string>;
  /** Ids de nós vazios que estão acima de algum conteúdo preenchido (mesmo grupo de irmãos). */
  emptyAboveFilledIds: ReadonlySet<string>;
}

/** Normaliza texto para comparação: minúsculas, sem espaços duplicados, sem extremidades. */
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

interface TextEntry {
  id: string;
  text: string;
}

/** Reúne textos significativos (não vazios) de títulos, itens, notas e legendas de tabela. */
function collectFilledTexts(doc: DocumentState): TextEntry[] {
  const entries: TextEntry[] = [];
  if (doc.title) {
    const t = normalizeText(doc.title);
    if (t) entries.push({ id: "doc-title", text: t });
  }
  const visit = (node: DocNode) => {
    if (node.type === "table") {
      if (node.table?.caption) {
        const t = normalizeText(node.table.caption);
        if (t) entries.push({ id: node.id, text: t });
      }
    } else {
      const t = normalizeText(node.text ?? "");
      if (t) entries.push({ id: node.id, text: t });
    }
    node.children.forEach(visit);
  };
  doc.nodes.forEach(visit);
  return entries;
}

/** Retorna os ids de todos os nós envolvidos em texto duplicado (todas as ocorrências). */
export function findDuplicateIds(doc: DocumentState): Set<string> {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();
  for (const { id, text } of collectFilledTexts(doc)) {
    if (seen.has(text)) {
      duplicates.add(seen.get(text)!);
      duplicates.add(id);
    } else {
      seen.set(text, id);
    }
  }
  return duplicates;
}

/**
 * Achata a árvore na ordem de exibição (pré-order: nó e depois seus filhos).
 * É a mesma ordem da numeração/preview, permitindo saber qual item vem logo
 * antes de outro em qualquer profundidade.
 */
export function flattenNodes(nodes: DocNode[]): DocNode[] {
  const flat: DocNode[] = [];
  const visit = (group: DocNode[]) => {
    for (const node of group) {
      flat.push(node);
      visit(node.children);
    }
  };
  visit(nodes);
  return flat;
}

/**
 * Retorna os ids de nós vazios que possuem conteúdo preenchido depois deles,
 * na ordem do documento — considerando itens, subitens e notas de qualquer
 * profundidade (inclusive subitens de um item irmão acima).
 */
export function findEmptyAboveFilledIds(doc: DocumentState): Set<string> {
  const flagged = new Set<string>();
  const flat = flattenNodes(doc.nodes);
  let belowHasContent = false;
  for (let i = flat.length - 1; i >= 0; i--) {
    const node = flat[i];
    const emptyText =
      node.type !== "table" && normalizeText(node.text ?? "") === "";
    if (emptyText) {
      if (belowHasContent) flagged.add(node.id);
    } else {
      belowHasContent = true;
    }
  }
  return flagged;
}

export function validateDoc(doc: DocumentState): ValidationResult {
  return {
    duplicateIds: findDuplicateIds(doc),
    emptyAboveFilledIds: findEmptyAboveFilledIds(doc),
  };
}