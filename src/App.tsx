import { useEffect, useMemo, useState } from "react";
import type { DocNode, DocumentState, NodeType, TableData } from "./lib/types";
import { MAX_DEPTH } from "./lib/types";
import { addChild, addRoot, removeNode, updateNode } from "./lib/doc";
import { computeLabels } from "./lib/numbering";
import { generateHtml } from "./lib/html";
import { loadDark, loadDoc, saveDark, saveDoc } from "./lib/storage";
import { useValidation } from "./useValidation";
import {
  addColumn,
  addRow,
  removeColumn,
  removeRow,
  setCaption,
  setCell,
  setHeader,
  setNumbered,
} from "./lib/tableOps";

const NOTE_ICONS = [
  { value: "ℹ️", label: "Informação" },
  { value: "📝", label: "Preenchimento manual" },
];

const DEFAULT_DOC: DocumentState = {
  title: "",
  nodes: [{ id: "root-title", type: "title", text: "", children: [] }],
};

export interface NodeWarnings {
  duplicate: boolean;
  emptyAbove: boolean;
}

const NO_WARNINGS: NodeWarnings = { duplicate: false, emptyAbove: false };

function warningClasses(w: NodeWarnings): string {
  const cls: string[] = [];
  if (w.duplicate) cls.push("duplicate");
  if (w.emptyAbove) cls.push("empty-above");
  return cls.join(" ");
}

function warningMessage(w: NodeWarnings): string | null {
  const parts: string[] = [];
  if (w.duplicate) {
    parts.push("Este texto já aparece em outro item do documento — verifique se a repetição é intencional.");
  }
  if (w.emptyAbove) {
    parts.push("Item vazio acima de conteúdo preenchido — remova se não for necessário.");
  }
  return parts.length ? parts.join(" ") : null;
}

export function App() {
  const [dark, setDark] = useState<boolean>(() => loadDark());
  const [doc, setDoc] = useState<DocumentState>(() => loadDoc() ?? DEFAULT_DOC);

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    saveDark(dark);
  }, [dark]);

  useEffect(() => {
    saveDoc(doc);
  }, [doc]);

  const labels = useMemo(() => computeLabels(doc.nodes), [doc.nodes]);
  const html = useMemo(() => generateHtml(doc), [doc]);

  const validation = useValidation(doc);

  const warnings = useMemo<Record<string, NodeWarnings>>(() => {
    const map: Record<string, NodeWarnings> = {};
    for (const id of validation.duplicateIds) {
      if (!map[id]) map[id] = { duplicate: false, emptyAbove: false };
      map[id].duplicate = true;
    }
    for (const id of validation.emptyAboveFilledIds) {
      if (!map[id]) map[id] = { duplicate: false, emptyAbove: false };
      map[id].emptyAbove = true;
    }
    return map;
  }, [validation.duplicateIds, validation.emptyAboveFilledIds]);

  const summaryText = useMemo(() => {
    const parts: string[] = [];
    const dup = validation.duplicateIds.size;
    if (dup > 0) parts.push(`${dup} ${dup === 1 ? "item repetido" : "itens repetidos"}`);
    const empty = validation.emptyAboveFilledIds.size;
    if (empty > 0) {
      parts.push(`${empty} ${empty === 1 ? "item vazio" : "itens vazios"} acima de conteúdo`);
    }
    return parts.join(" · ");
  }, [validation.duplicateIds, validation.emptyAboveFilledIds]);

  function patch(id: string, changes: Partial<DocNode>) {
    setDoc((d) => ({ ...d, nodes: updateNode(d.nodes, id, changes) }));
  }

  function setText(id: string, text: string) {
    patch(id, { text });
  }

  function setNoteIcon(id: string, noteIcon: string) {
    patch(id, { noteIcon });
  }

  function setTable(id: string, table: TableData) {
    patch(id, { table });
  }

  function remove(id: string) {
    setDoc((d) => ({ ...d, nodes: removeNode(d.nodes, id) }));
  }

  function addRootNode(type: NodeType) {
    setDoc((d) => {
      const [nodes] = addRoot(d.nodes, type);
      return { ...d, nodes };
    });
  }

  function addChildNode(parentId: string, type: NodeType) {
    setDoc((d) => {
      const [nodes] = addChild(d.nodes, parentId, type);
      return { ...d, nodes };
    });
  }

  function download() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documento.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearDoc() {
    if (window.confirm("Apagar todo o documento? Esta ação não pode ser desfeita.")) {
      setDoc(DEFAULT_DOC);
    }
  }

  return (
    <div className={`app ${dark ? "dark" : ""}`}>
      <div className="header">
        <div className="header-top">
          <div>
            <h1>Gerador de Documentos HTML</h1>
            <p>
              Numeração automática de títulos, itens e subitens (até {MAX_DEPTH} níveis) ·
              notas explicativas · tabelas · salvamento automático
            </p>
          </div>
          <button className="theme-toggle" onClick={() => setDark((d) => !d)}>
            {dark ? "☀ Modo claro" : "🌙 Modo escuro"}
          </button>
        </div>
      </div>

      <div className="editor">
        <DocTitleField doc={doc} warnings={warnings["doc-title"] ?? NO_WARNINGS} setDoc={setDoc} />
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button className="primary" onClick={() => addRootNode("title")}>
            + Título
          </button>
          <button className="danger" onClick={clearDoc}>
            🗑 Limpar documento
          </button>
        </div>

        {summaryText && (
          <div className="validation-status has-issues">{summaryText}</div>
        )}

        {doc.nodes.map((node) => (
          <RootNodeCard
            key={node.id}
            node={node}
            labels={labels}
            warnings={warnings}
            onText={setText}
            onNoteIcon={setNoteIcon}
            onTable={setTable}
            onRemove={remove}
            onAddChild={addChildNode}
          />
        ))}
      </div>

      <div className="preview">
        <div className="toolbar">
          <button className="primary" onClick={download}>
            ⬇ Baixar HTML
          </button>
        </div>
        <iframe className="preview-frame" title="Pré-visualização" srcDoc={html} />
      </div>
    </div>
  );
}

interface CardProps {
  node: DocNode;
  labels: Record<string, string>;
  warnings: Record<string, NodeWarnings>;
  onText: (id: string, text: string) => void;
  onNoteIcon: (id: string, icon: string) => void;
  onTable: (id: string, table: TableData) => void;
  onRemove: (id: string) => void;
  onAddChild: (parentId: string, type: NodeType) => void;
}

function DocTitleField({
  doc,
  warnings,
  setDoc,
}: {
  doc: DocumentState;
  warnings: NodeWarnings;
  setDoc: React.Dispatch<React.SetStateAction<DocumentState>>;
}) {
  const wClasses = warningClasses(warnings);
  const msg = warningMessage(warnings);
  return (
    <div>
      <input
        className={`doc-title-input ${wClasses}`.trim()}
        placeholder="Título do documento (opcional)"
        value={doc.title ?? ""}
        onChange={(e) => setDoc((d) => ({ ...d, title: e.target.value }))}
      />
      {msg && <div className={`field-warning ${wClasses}`}>{msg}</div>}
    </div>
  );
}

function RootNodeCard(props: CardProps) {
  const { node } = props;
  const label = props.labels[node.id] ?? "";
  const w = props.warnings[node.id] ?? NO_WARNINGS;
  const wClasses = warningClasses(w);
  const msg = warningMessage(w);
  return (
    <div className={`card ${wClasses}`.trim()}>
      <div className="card-title">
        <span className="label-badge">{label || "—"}</span>
        <span>Título</span>
        <button className="danger" onClick={() => props.onRemove(node.id)}>
          Remover
        </button>
      </div>
      <input
        type="text"
        className={wClasses || undefined}
        placeholder="Texto do título (ex.: OBJETO)"
        value={node.text ?? ""}
        onChange={(e) => props.onText(node.id, e.target.value)}
      />
      {msg && <div className={`field-warning ${wClasses}`}>{msg}</div>}
      <div className="row">
        <button onClick={() => props.onAddChild(node.id, "item")}>+ Item</button>
        <button onClick={() => props.onAddChild(node.id, "note")}>+ Nota explicativa</button>
        <button onClick={() => props.onAddChild(node.id, "table")}>+ Tabela</button>
      </div>
      {node.children.map((child) => (
        <ChildNode key={child.id} {...props} node={child} depth={2} />
      ))}
    </div>
  );
}

function ChildNode(props: CardProps & { depth: number }) {
  const { node } = props;
  if (node.type === "note") return <NoteCard {...props} />;
  if (node.type === "table") return <TableCard {...props} />;
  if (node.type === "item" || node.type === "subitem") return <NumberedCard {...props} />;
  return null;
}

function NumberedCard(props: CardProps & { depth: number }) {
  const { node, depth } = props;
  const label = props.labels[node.id] ?? "";
  const name = depth === 2 ? "Item" : `Subitem (nível ${depth})`;
  const depthClass = depth === 2 ? "item" : depth === 3 ? "subitem" : "deep";
  const w = props.warnings[node.id] ?? NO_WARNINGS;
  const wClasses = warningClasses(w);
  const msg = warningMessage(w);
  return (
    <div className={`card ${depthClass} ${wClasses}`.trim()} style={{ marginLeft: (depth - 1) * 16 }}>
      <div className="card-title">
        <span className="label-badge">{label || "—"}</span>
        <span>{name}</span>
        <button className="danger" onClick={() => props.onRemove(node.id)}>
          Remover
        </button>
      </div>
      <textarea
        className={wClasses || undefined}
        placeholder={`Texto do ${name.toLowerCase()}`}
        value={node.text ?? ""}
        onChange={(e) => props.onText(node.id, e.target.value)}
      />
      {msg && <div className={`field-warning ${wClasses}`}>{msg}</div>}
      <div className="row">
        {depth < MAX_DEPTH && (
          <button onClick={() => props.onAddChild(node.id, "subitem")}>+ Subitem</button>
        )}
        <button onClick={() => props.onAddChild(node.id, "note")}>+ Nota explicativa</button>
        <button onClick={() => props.onAddChild(node.id, "table")}>+ Tabela</button>
      </div>
      {node.children.map((child) => (
        <ChildNode key={child.id} {...props} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function NoteCard(props: CardProps) {
  const { node } = props;
  const isPreset = NOTE_ICONS.some((i) => i.value === node.noteIcon);
  const w = props.warnings[node.id] ?? NO_WARNINGS;
  const wClasses = warningClasses(w);
  const msg = warningMessage(w);
  return (
    <div className={`card note ${wClasses}`.trim()}>
      <div className="card-title">
        <span>Nota explicativa</span>
        <button className="danger" onClick={() => props.onRemove(node.id)}>
          Remover
        </button>
      </div>
      <div className="row">
        <select
          className="icon-select"
          value={isPreset ? node.noteIcon : "outro"}
          onChange={(e) => {
            if (e.target.value === "outro") props.onNoteIcon(node.id, node.noteIcon ?? "ℹ️");
            else props.onNoteIcon(node.id, e.target.value);
          }}
        >
          {NOTE_ICONS.map((i) => (
            <option key={i.value} value={i.value}>
              {i.value} {i.label}
            </option>
          ))}
          <option value="outro">Outro (personalizado)</option>
        </select>
        {!isPreset && (
          <input
            type="text"
            style={{ width: 80 }}
            placeholder="ícone"
            value={node.noteIcon ?? ""}
            onChange={(e) => props.onNoteIcon(node.id, e.target.value)}
          />
        )}
      </div>
      <textarea
        className={wClasses || undefined}
        placeholder="Mensagem explicativa (ex.: Descreva objetivamente...)"
        value={node.text ?? ""}
        onChange={(e) => props.onText(node.id, e.target.value)}
      />
      {msg && <div className={`field-warning ${wClasses}`}>{msg}</div>}
    </div>
  );
}

function TableCard(props: CardProps) {
  const { node } = props;
  const table = node.table!;
  const label = props.labels[node.id] ?? "";
  const w = props.warnings[node.id] ?? NO_WARNINGS;
  const wClasses = warningClasses(w);
  const msg = warningMessage(w);

  return (
    <div className={`card table ${wClasses}`.trim()}>
      <div className="card-title">
        <span>{table.numbered ? `Tabela (${label})` : "Tabela"}</span>
        <button className="danger" onClick={() => props.onRemove(node.id)}>
          Remover
        </button>
      </div>
      <input
        type="text"
        className={wClasses || undefined}
        placeholder="Legenda da tabela (opcional)"
        value={table.caption ?? ""}
        onChange={(e) => props.onTable(node.id, setCaption(table, e.target.value))}
      />
      {msg && <div className={`field-warning ${wClasses}`}>{msg}</div>}
      <div className="checkbox-line">
        <input
          type="checkbox"
          id={`num-${node.id}`}
          checked={table.numbered}
          onChange={(e) => props.onTable(node.id, setNumbered(table, e.target.checked))}
        />
        <label htmlFor={`num-${node.id}`}>Numerar como item (participa da marcação)</label>
      </div>
      <table className="table-grid">
        <thead>
          <tr>
            {table.headers.map((h, ci) => (
              <th key={ci}>
                <input
                  value={h}
                  onChange={(e) => props.onTable(node.id, setHeader(table, ci, e.target.value))}
                />
                <div>
                  <button onClick={() => props.onTable(node.id, removeColumn(table, ci))}>x</button>
                </div>
              </th>
            ))}
            <th>
              <button onClick={() => props.onTable(node.id, addColumn(table))}>+ col</button>
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>
                  <input
                    value={cell}
                    onChange={(e) => props.onTable(node.id, setCell(table, ri, ci, e.target.value))}
                  />
                </td>
              ))}
              <td>
                <button onClick={() => props.onTable(node.id, removeRow(table, ri))}>x</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <button onClick={() => props.onTable(node.id, addRow(table))}>+ Linha</button>
      </div>
    </div>
  );
}