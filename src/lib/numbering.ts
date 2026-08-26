import type { DocNode } from "./types";

/** Retorna o label numerado ("", "1", "1.1", "1.1.1", ...) de cada nó, por id. */
export function computeLabels(nodes: DocNode[]): Record<string, string> {
  const labels: Record<string, string> = {};
  let titleIndex = 0;

  for (const node of nodes) {
    if (node.type === "title") {
      titleIndex += 1;
      assignLabel(node, String(titleIndex), labels);
    } else if (node.type === "table" && node.table?.numbered) {
      // Tabela numerada diretamente na raiz (raramente usado).
      titleIndex += 1;
      labels[node.id] = String(titleIndex);
    } else {
      // nota ou tabela não numerada na raiz
      labels[node.id] = "";
    }
  }

  return labels;
}

/** Atribui o label do nó e desce recursivamente nos filhos numerados. */
function assignLabel(node: DocNode, label: string, labels: Record<string, string>): void {
  labels[node.id] = label;
  let index = 0;

  for (const child of node.children) {
    if (child.type === "item" || child.type === "subitem") {
      index += 1;
      assignLabel(child, `${label}.${index}`, labels);
    } else if (child.type === "table" && child.table?.numbered) {
      index += 1;
      labels[child.id] = `${label}.${index}`;
    } else {
      labels[child.id] = "";
    }
  }
}

export function labelOf(labels: Record<string, string>, id: string): string {
  return labels[id] ?? "";
}