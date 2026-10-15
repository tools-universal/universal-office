/** Utilitários de escrita de XML do conversor .xls → pacote OOXML. */

/**
 * Escapa texto para conteúdo/atributo XML. Caracteres de controle (exceto
 * TAB/LF/CR) viram referências numéricas — o parser do sheet-core as decodifica
 * e o texto chega intacto ao renderizador.
 */
export function xmlText(s: string): string {
  // caminho rápido: nada a escapar
  if (!/[&<>"\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/.test(s)) return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x26) out += '&amp;';
    else if (c === 0x3c) out += '&lt;';
    else if (c === 0x3e) out += '&gt;';
    else if (c === 0x22) out += '&quot;';
    else if (c < 0x20 && c !== 9 && c !== 10 && c !== 13) out += c === 0 ? '' : `&#x${c.toString(16)};`;
    else if (c >= 0xd800 && c <= 0xdbff) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) { out += s[i]! + s[i + 1]!; i++; } else out += '\ufffd';
    } else if ((c >= 0xdc00 && c <= 0xdfff) || c === 0xfffe || c === 0xffff) out += '\ufffd';
    else out += s[i]!;
  }
  return out;
}

const COLS: string[] = [];

/** Coluna 0-based → letras (0 → A, 26 → AA). */
export function colName(c: number): string {
  const hit = COLS[c];
  if (hit !== undefined) return hit;
  let n = c + 1;
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  if (c < 16384) COLS[c] = s;
  return s;
}

/** Ref A1 de (linha, coluna) 0-based. */
export function cellRef(row: number, col: number): string {
  return colName(col) + (row + 1);
}

/** Range A1 (célula única colapsa em "A1"). */
export function rangeRef(r1: number, c1: number, r2: number, c2: number): string {
  const a = cellRef(r1, c1);
  return r1 === r2 && c1 === c2 ? a : `${a}:${cellRef(r2, c2)}`;
}

export const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
export const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
export const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const NS_PKG_RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';
export const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** Arquivo .rels a partir de uma lista de relacionamentos. */
export function relsXml(rels: { id: string; type: string; target: string; external?: boolean }[]): string {
  let x = `${XML_HEAD}<Relationships xmlns="${NS_PKG_RELS}">`;
  for (const r of rels) {
    x += `<Relationship Id="${r.id}" Type="${r.type}" Target="${xmlText(r.target)}"${r.external ? ' TargetMode="External"' : ''}/>`;
  }
  return x + '</Relationships>';
}
