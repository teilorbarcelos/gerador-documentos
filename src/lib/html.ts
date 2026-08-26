import type { DocNode, DocumentState, TableData } from "./types";
import { computeLabels } from "./numbering";

const PAD = "&nbsp;&nbsp;&nbsp;&nbsp;";
const EMPTY_LINE = '<p style="text-align:justify;">&nbsp;</p>';
const TWO_EMPTY_LINES = `${EMPTY_LINE}\n${EMPTY_LINE}`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
}

function paragraphStyle(): string {
  return (
    `mso-add-space:auto;mso-hyphenate:auto;mso-list:l0 level1 lfo1;` +
    `mso-vertical-align-alt:auto;tab-stops:70.9pt;text-align:justify;` +
    `text-autospace:ideograph-numeric ideograph-other;text-indent:0cm;`
  );
}

function renderTableData(table: TableData): string {
  const head = table.headers
    .map((h) => `<td>${escapeHtml(h)}</td>`)
    .join("");
  const body = table.rows
    .map((row) => {
      const cells = row.map((c) => `<td>${escapeHtml(c)}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  return (
    `<table border="1" style="border-collapse:collapse;width:100%;">` +
    `<tbody><tr>${head}</tr>${body}</tbody></table>`
  );
}

function renderNode(node: DocNode, labels: Record<string, string>): string {
  const label = labels[node.id] ?? "";
  let main = "";

  switch (node.type) {
    case "title": {
      const text = escapeHtml(node.text ?? "");
      // Título: número + texto em negrito, seguido de uma linha vazia.
      main =
        `<p style="${paragraphStyle()}">` +
        `<strong>${label}.${PAD}${text}&nbsp;</strong></p>\n${EMPTY_LINE}`;
      break;
    }

    case "item":
    case "subitem": {
      const text = escapeHtml(node.text ?? "");
      // Item/subitem: apenas o marcador numérico em negrito; texto normal.
      main =
        `<p style="${paragraphStyle()}">` +
        `<strong>${label}${PAD}</strong>${text}</p>\n${EMPTY_LINE}`;
      break;
    }

    case "note": {
      const icon = escapeHtml(node.noteIcon ?? "ℹ️");
      const text = escapeHtml(node.text ?? "");
      main =
        `<p style="text-align:justify;">` +
        `<span style="color:#242424;">${icon}</span>` +
        `<span style="color:black;"><i>${text}</i></span></p>`;
      break;
    }

    case "table": {
      const table = node.table;
      if (!table) break;
      const labelPrefix = table.numbered && label ? `<strong>${label}${PAD}</strong>` : "";
      const caption = table.caption
        ? `<p style="text-align:justify;"><strong>${escapeHtml(table.caption)}</strong></p>`
        : "";
      main = `<p style="text-align:justify;">${labelPrefix}</p>${caption}${renderTableData(table)}`;
      break;
    }

    default:
      main = "";
  }

  const childrenHtml = node.children.length
    ? node.children.map((c) => renderNode(c, labels)).join("\n")
    : "";
  return `${main}\n${childrenHtml}`.trim();
}

export function generateHtml(doc: DocumentState): string {
  const labels = computeLabels(doc.nodes);
  const hasDocTitle = !!doc.title;
  let firstTitleSeen = false;

  const rows = doc.nodes
    .map((node) => {
      if (node.type === "title") {
        const needSpacing = firstTitleSeen || hasDocTitle;
        firstTitleSeen = true;
        return (needSpacing ? `${TWO_EMPTY_LINES}\n` : "") + renderNode(node, labels);
      }
      return renderNode(node, labels);
    })
    .join("\n");

  const header = doc.title
    ? `<p style="text-align:center;"><strong>${escapeHtml(doc.title)}</strong></p>`
    : "";

  const body =
    `<table class="ck-table-resized" style="border-collapse:collapse;` +
    `border-style:hidden;border-width:1px;margin-left:auto;margin-right:auto;` +
    `width:1000px;" border="1"><colgroup><col style="width:100%;"></colgroup>` +
    `<tbody><tr><td style="border:1px solid hsl(0, 0%, 0%);">${header}${rows}</td></tr>` +
    `</tbody></table>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(doc.title ?? "Documento")}</title>
</head>
<body>
${body}
</body>
</html>`;
}