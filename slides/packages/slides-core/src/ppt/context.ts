/**
 * Contexto compartilhado da conversão .ppt → .pptx: opções, relações (.rels)
 * de uma parte, mídia do pacote e o estado da parte (slide/mestre) em escrita.
 */
import type { PptDocument } from './ppt-reader.js';
import type { TextBlock } from './text.js';
import type { TextConvCtx } from './textconv.js';
import { el, XML_DECL, NS } from './xmlw.js';

/** Opções da conversão. */
export interface ConvertOptions {
  /**
   * Usa os dados de round-trip do PowerPoint 2007+ quando presentes (tema
   * original e aparência das formas do metroBlob) — é o que o próprio
   * PowerPoint faz ao abrir o .ppt. `false` = só os registros 97-2003.
   * Padrão: true.
   */
  useRoundTrip?: boolean;
}

interface Rel { id: string; type: string; target: string; external?: boolean }

/** Relações de uma parte (gera o .rels); tipos curtos usam o namespace officeDocument. */
export class PartRels {
  readonly list: Rel[] = [];
  add(type: string, target: string, external = false): string {
    const found = this.list.find((r) => r.type === type && r.target === target && !!r.external === external);
    if (found) return found.id;
    const id = `rId${this.list.length + 1}`;
    const rel: Rel = { id, type, target };
    if (external) rel.external = true;
    this.list.push(rel);
    return id;
  }
  xml(): string {
    return XML_DECL + el('Relationships', { xmlns: NS.rel },
      this.list.map((r) => el('Relationship', {
        Id: r.id, Type: r.type.startsWith('http') ? r.type : `${NS.relType}/${r.type}`,
        Target: r.target, TargetMode: r.external ? 'External' : undefined,
      })).join(''));
  }
}

/** Estado global da conversão (documento, mídia, opções). */
export interface ConvCtx {
  doc: PptDocument;
  /** pib → caminho da mídia (ppt/media/imageN.ext). */
  media: Map<number, string>;
  /** Partes binárias geradas (mídia). */
  parts: Map<string, Uint8Array>;
  mediaExts: Set<string>;
  useRoundTrip: boolean;
  /** Content-types de partes XML extras (diagramas do round-trip), por caminho. */
  overrides: Map<string, string>;
  /** Nº de diagramas (SmartArt) já emitidos — numeração das partes. */
  diagrams: number;
  /**
   * Orçamento de caracteres de TEXTO convertido (todas as formas, inclusive
   * repetidas): um bloco grande referenciado por milhares de formas
   * (OutlineTextRefAtom) multiplicava a saída sem limite.
   */
  textBudget: number;
}

/** Teto de texto convertido por documento (caracteres) — muito acima de qualquer deck real. */
export const TEXT_BUDGET = 64 * 1024 * 1024;

/** Contexto de uma parte (slide/mestre) sendo escrita. */
export interface PartCtx {
  conv: ConvCtx;
  rels: PartRels;
  text: TextConvCtx;
  /** Esquema de cores efetivo (8 cores 'RRGGBB'). */
  scheme: string[];
  /** Cor de fundo efetiva (para fillType "background"). */
  bgColor?: string;
  /** Parte de MESTRE (formas do mestre/título): o padrão de preenchimento do documento vale. */
  isMaster?: boolean;
  /** Blocos do SlideListWithText (OutlineTextRefAtom). */
  outline: TextBlock[];
  /** slideId do slide (chave do PP9 do outline no documento). */
  slideId?: number;
  /** Ids de forma já usados na parte (evita duplicatas). */
  usedIds: Set<number>;
  /** spids efetivamente emitidos (alvos válidos das animações). */
  spids: Set<number>;
  /** Texto de cada forma por spid (faixas de caractere → parágrafos nas animações). */
  texts: Map<number, string>;
  /** Id OOXML ORIGINAL (cNvPr do shapexml de round-trip) → spid emitido. */
  ooxmlIds: Map<number, number>;
}

/** Esquema de cores padrão do PowerPoint 97 (quando o .ppt não traz um). */
export const DEFAULT_SCHEME = ['FFFFFF', '000000', '808080', '000000', '00CC99', '3333CC', 'CCCCFF', 'B2B2B2'];

/** Novo contexto de parte (os hiperlinks do texto entram nas relações da parte). */
export function newPartCtx(conv: ConvCtx, scheme: string[], styles: TextConvCtx['styles'], outline: TextBlock[], slideNumber?: number, rels = new PartRels()): PartCtx {
  const text: TextConvCtx = {
    doc: conv.doc, scheme, linkRel: (target) => rels.add('hyperlink', target, true),
    bulletBlipRel: (ref) => {
      const key = -1 - ref; // chave própria no mapa de mídia (pibs são ≥ 1)
      let path = conv.media.get(key);
      if (!path) {
        const b = conv.doc.bulletBlips[ref];
        if (!b) return undefined;
        path = `ppt/media/image${conv.media.size + 1}.${b.ext}`;
        conv.media.set(key, path);
        conv.parts.set(path, b.bytes);
        conv.mediaExts.add(b.ext);
      }
      return rels.add('image', '../media/' + path.slice('ppt/media/'.length));
    },
  };
  if (styles) text.styles = styles;
  if (slideNumber !== undefined) text.slideNumber = slideNumber;
  return { conv, rels, text, scheme, outline, usedIds: new Set([1]), spids: new Set(), texts: new Map(), ooxmlIds: new Map() };
}
