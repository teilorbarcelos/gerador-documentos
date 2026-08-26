/** Extrai, na ordem de aparecimento, os rótulos numerados (ex.: "1", "4.1.2")
 *  de um HTML no formato do modelo (rótulos dentro de <strong>). */
export function extractLabels(html: string): string[] {
  const labels: string[] = [];
  const strongRe = /<strong>([\s\S]*?)<\/strong>/g;
  let m: RegExpExecArray | null;
  while ((m = strongRe.exec(html)) !== null) {
    const inner = m[1].replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    const numMatch = /^(\d+(?:\.\d+)*)/.exec(inner);
    if (numMatch) labels.push(numMatch[1]);
  }
  return labels;
}
