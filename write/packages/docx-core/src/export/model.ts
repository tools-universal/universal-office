// Tipos de entrada + helpers compartilhados pelos exportadores (HTML/Markdown).
// O editor monta um ExportDoc a partir do seu estado vivo (model.paragraphs +
// tableAnchors + fullDoc) e passa para toHtml()/toMarkdown().
import type {
  Paragraph,
  Run,
  TableBlock,
  CommentInfo,
  SectPr,
} from '../core.js';

export interface ExportDoc {
  title?: string;
  /** Parágrafos top-level do corpo, na ordem (estado vivo do editor). */
  paragraphs: Paragraph[];
  /** Tabelas ancoradas "antes do parágrafo N" (reconstrói a ordem do documento). */
  tableAnchors?: { beforePara: number; table: TableBlock }[];
  comments?: CommentInfo[];
  footnotes?: Map<number, Paragraph[]>;
  endnotes?: Map<number, Paragraph[]>;
  sectPr?: SectPr;
  /**
   * Cache de data URIs pré-computados por imagem (id por referência).
   * Quando presente, é consultado ANTES de `dataUri(img)` — assim o editor
   * pode injetar versões comprimidas (downsample + JPEG) sem que os
   * exportadores precisem de DOM/canvas.
   */
  imageDataUris?: WeakMap<{ data: Uint8Array; ext: string }, string>;
}

export type OrderedBlock =
  | { kind: 'para'; p: Paragraph }
  | { kind: 'table'; t: TableBlock };

/** Intercala parágrafos e tabelas na ordem original do documento. */
export function orderedBlocks(doc: ExportDoc): OrderedBlock[] {
  const out: OrderedBlock[] = [];
  const byPara = new Map<number, TableBlock[]>();
  for (const a of doc.tableAnchors ?? []) {
    const arr = byPara.get(a.beforePara) ?? [];
    arr.push(a.table);
    byPara.set(a.beforePara, arr);
  }
  for (let i = 0; i < doc.paragraphs.length; i++) {
    for (const t of byPara.get(i) ?? []) out.push({ kind: 'table', t });
    out.push({ kind: 'para', p: doc.paragraphs[i]! });
  }
  for (const t of byPara.get(doc.paragraphs.length) ?? []) out.push({ kind: 'table', t });
  return out;
}

/** Nível de título (1..6) de um parágrafo, ou 0 se não for título. */
export function headingLevel(p: Paragraph): number {
  const id = p.props.styleId ?? '';
  let m = id.match(/(?:heading|t[íi]tulo|titulo)\s*([1-9])/i);
  if (m) return Math.min(6, parseInt(m[1]!, 10));
  m = id.match(/^h([1-6])$/i);
  if (m) return parseInt(m[1]!, 10);
  if (/^(title|t[íi]tulo)$/i.test(id)) return 1;
  return 0;
}

/** Texto puro de um parágrafo (campos PAGE/etc. já resolvidos no run.text). */
export function paraPlainText(p: Paragraph): string {
  return p.runs.map((r) => r.text).join('');
}

export function isListItem(p: Paragraph): boolean {
  return !!p.props.numbering;
}

// ───────────────────────── util de codificação ─────────────────────────

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

export function imgMime(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
  if (e === 'png') return 'image/png';
  if (e === 'gif') return 'image/gif';
  if (e === 'bmp') return 'image/bmp';
  if (e === 'svg') return 'image/svg+xml';
  if (e === 'webp') return 'image/webp';
  if (e === 'tif' || e === 'tiff') return 'image/tiff';
  return `image/${e}`;
}

/** base64 de bytes — funciona no browser (btoa) e no Node (Buffer). */
export function base64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const g = globalThis as { btoa?: (s: string) => string; Buffer?: { from(s: string, e: string): { toString(e: string): string } } };
  if (typeof g.btoa === 'function') return g.btoa(bin);
  if (g.Buffer) return g.Buffer.from(bin, 'binary').toString('base64');
  throw new Error('sem base64 (btoa/Buffer) no ambiente');
}

export function dataUri(img: { data: Uint8Array; ext: string }): string {
  return `data:${imgMime(img.ext)};base64,${base64(img.data)}`;
}

/** dataUri usando o cache do ExportDoc quando disponível (versão comprimida). */
export function resolveImageUri(
  img: { data: Uint8Array; ext: string },
  cache?: WeakMap<{ data: Uint8Array; ext: string }, string>,
): string {
  const cached = cache?.get(img);
  return cached ?? dataUri(img);
}

export const twipsToPx = (t: number): number => Math.round((t / 1440) * 96);
export const twipsToPt = (t: number): number => +(t / 20).toFixed(2);
export const halfPtToPt = (h: number): number => h / 2;
