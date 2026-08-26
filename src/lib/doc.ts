import type { DocNode, NodeType, TableData } from "./types";
import { newId, emptyTable } from "./types";

export function findNode(nodes: DocNode[], id: string): DocNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

/** Atualiza um nó (patch parcial) retornando nova árvore imutável. */
export function updateNode(nodes: DocNode[], id: string, patch: Partial<DocNode>): DocNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, ...patch };
    if (node.children.length) {
      return { ...node, children: updateNode(node.children, id, patch) };
    }
    return node;
  });
}

/** Remove um nó (e seus filhos) retornando nova árvore imutável. */
export function removeNode(nodes: DocNode[], id: string): DocNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNode(node.children, id) }));
}

function createNode(type: NodeType): DocNode {
  const base: DocNode = { id: newId(type), type, children: [] };
  if (type === "note") {
    base.text = "";
    base.noteIcon = "ℹ️";
  } else if (type === "table") {
    const t: TableData = emptyTable();
    base.table = t;
  } else {
    base.text = "";
  }
  return base;
}

/** Adiciona um nó à raiz e retorna [novaÁrvore, idDoNovoNó]. */
export function addRoot(nodes: DocNode[], type: NodeType): [DocNode[], string] {
  const node = createNode(type);
  return [[...nodes, node], node.id];
}

/** Adiciona um filho a um nó pai e retorna [novaÁrvore, idDoNovoNó]. */
export function addChild(nodes: DocNode[], parentId: string, type: NodeType): [DocNode[], string] {
  const node = createNode(type);
  const next = nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...n.children, node] };
    }
    if (n.children.length) {
      return { ...n, children: mapAddChild(n.children, parentId, node) };
    }
    return n;
  });
  return [next, node.id];
}

function mapAddChild(children: DocNode[], parentId: string, node: DocNode): DocNode[] {
  return children.map((n) => {
    if (n.id === parentId) return { ...n, children: [...n.children, node] };
    if (n.children.length) return { ...n, children: mapAddChild(n.children, parentId, node) };
    return n;
  });
}
