// Numeração do documento (word/numbering.xml) editável SEM PERDAS: o texto da parte é a
// verdade (o que não mexemos sai byte a byte); listas novas e mudanças entram como o Word
// as grava (oráculo write/tools/home-lab exp-lists/listkeys/listcmds.ps1; memória
// word-lists-facts). Sem DOM — testável em Node.
import { readNumbering, type Numbering, type NumLevel } from '@universal-office/docx-core';
import type { LibraryList } from './list-library.js';

/** Raiz da parte nova (só os espaços de nomes que o conteúdo usa). */
const ROOT_OPEN = '<w:numbering xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
  + 'xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
  + 'xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
  + 'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" '
  + 'mc:Ignorable="w14 w15">';
const PART_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

const hex8 = (): string => Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, '0');

/** Textos e identificadores que dependem do idioma do documento/da interface. */
export interface ListLocale {
  /** LCID dos w:tplc (0416 pt-BR, 0409 en-US) */
  lcid: string;
  /** styleId de "heading N" (1…9) no documento */
  heading: (n: number) => string;
  article: string;
  section: string;
  chapter: string;
}

/** Os w:lvl de um modelo da biblioteca no idioma pedido. */
export function libraryLevels(def: LibraryList, loc: ListLocale): string[] {
  return def.levels.map((l) => l
    .replace(/\{LCID\}/g, loc.lcid)
    .replace(/\{H(\d)\}/g, (_m, n: string) => loc.heading(Number(n)))
    .replace(/\{ARTICLE\}/g, loc.article).replace(/\{SECTION\}/g, loc.section).replace(/\{CHAPTER\}/g, loc.chapter));
}

export class DocNumbering {
  /** versões do texto da parte (null = o documento não tem numeração); o desfazer guarda só o índice */
  private versions: (string | null)[];
  private v = 0;
  private cache: { xml: string | null; parsed: Numbering } | null = null;

  constructor(xml: string | null | undefined) { this.versions = [xml ?? null]; }

  /** texto atual da parte */
  get xml(): string | null { return this.versions[this.v] ?? null; }
  get version(): number { return this.v; }
  /** a parte mudou desde que abriu (só então é regravada) */
  get dirty(): boolean { return this.xml !== this.versions[0]; }
  /** volta a uma versão (desfazer/refazer); true se mudou */
  restore(v: number): boolean {
    if (v === this.v || v < 0 || v >= this.versions.length) return false;
    this.v = v;
    return true;
  }

  /** A numeração lida (o motor de layout usa esta). */
  parsed(): Numbering {
    if (this.cache?.xml !== this.xml) this.cache = { xml: this.xml, parsed: readNumbering(this.xml ?? undefined) };
    return this.cache.parsed;
  }

  private ensure(): string {
    return this.xml ?? `${PART_HEAD}${ROOT_OPEN}</w:numbering>`;
  }

  private set(xml: string): void {
    if (xml === this.xml) return;
    // (as versões ficam todas: os passos de refazer apontam para elas)
    this.versions.push(xml);
    this.v = this.versions.length - 1;
  }

  /** w:abstractNum cru pelo id. */
  abstractXml(id: number): string | undefined {
    return new RegExp(`<w:abstractNum\\b[^>]*\\bw:abstractNumId="${id}"[^>]*>[\\s\\S]*?</w:abstractNum>`).exec(this.xml ?? '')?.[0];
  }
  /** w:num cru pelo numId. */
  numXml(numId: number): string | undefined {
    return new RegExp(`<w:num\\b[^>]*\\bw:numId="${numId}"[^>]*(?:/>|>[\\s\\S]*?</w:num>)`).exec(this.xml ?? '')?.[0];
  }

  /** numId do w:numPr de um estilo de numeração (o editor liga à folha de estilos). */
  styleNum: (styleId: string) => number | undefined = () => undefined;

  /** abstractNum efetivo de uma lista: segue o w:numStyleLink até o do estilo de lista
   *  (w:styleLink), como o motor. */
  abstractOf(numId: number): number | undefined {
    const p = this.parsed();
    let n = p.nums[numId];
    for (let d = 0; n && d < 4; d++) {
      const link = p.abstractNums[n.abstractNumId]?.numStyleLink;
      const to = link ? this.styleNum(link) : undefined;
      const next = to !== undefined && to !== n.numId ? p.nums[to] : undefined;
      if (!next) return n.abstractNumId;
      n = next;
    }
    return n?.abstractNumId;
  }

  /** Nível efetivo de uma lista (o lvlOverride/lvl do w:num por cima do abstractNum). */
  level(numId: number, ilvl: number): NumLevel | undefined {
    const n = this.parsed().nums[numId];
    if (!n) return undefined;
    const ov = n.overrides[ilvl]?.lvl;
    if (ov) return ov;
    const absId = this.abstractOf(numId);
    return absId !== undefined ? this.parsed().abstractNums[absId]?.levels[ilvl] : undefined;
  }

  private nextId(attr: 'w:abstractNumId' | 'w:numId'): number {
    const re = attr === 'w:abstractNumId' ? /<w:abstractNum\b[^>]*\bw:abstractNumId="(\d+)"/g : /<w:num\b[^>]*\bw:numId="(\d+)"/g;
    let max = attr === 'w:abstractNumId' ? -1 : 0;
    for (const m of (this.xml ?? '').matchAll(re)) max = Math.max(max, Number(m[1]));
    return max + 1;
  }

  /**
   * Lista nova: w:abstractNum (nsid e tmpl sorteados, como o Word; os modelos de títulos
   * têm tmpl fixo) + w:num. Devolve o numId.
   */
  addList(levels: string[], o: { multiLevelType: string; tmpl?: string; styleLink?: string; numStyleLink?: string }): number {
    const absId = this.nextId('w:abstractNumId');
    // (o Word 2013+ marca toda lista nova; só com o prefixo w15 declarado na raiz)
    const w15 = /\sxmlns:w15="/.test(this.ensure()) ? ' w15:restartNumberingAfterBreak="0"' : '';
    const abs = `<w:abstractNum w:abstractNumId="${absId}"${w15}><w:nsid w:val="${hex8()}"/><w:multiLevelType w:val="${o.multiLevelType}"/>`
      + `<w:tmpl w:val="${o.tmpl ?? hex8()}"/>${o.styleLink ? `<w:styleLink w:val="${o.styleLink}"/>` : ''}`
      + `${o.numStyleLink ? `<w:numStyleLink w:val="${o.numStyleLink}"/>` : ''}${levels.join('')}</w:abstractNum>`;
    this.insertAbstract(abs);
    return this.addNum(absId);
  }

  /** w:num novo para um abstractNum (com w:lvlOverride, se pedido). */
  addNum(absId: number, overrides = ''): number {
    const numId = this.nextId('w:numId');
    const num = `<w:num w:numId="${numId}"><w:abstractNumId w:val="${absId}"/>${overrides}</w:num>`;
    let x = this.ensure();
    const tail = x.search(/<w:numIdMacAtCleanup\b|<\/w:numbering>\s*$/);
    x = x.slice(0, tail) + num + x.slice(tail);
    this.set(x);
    return numId;
  }

  /** Cópia de um abstractNum (nsid novo, mesmo tmpl; os w:tplc viram FFFFFFFF) — Reiniciar
   *  em 1 do Word (medido: cmd-NumberingRestart). */
  copyAbstract(absId: number): number | undefined {
    const raw = this.abstractXml(absId);
    if (!raw) return undefined;
    const id = this.nextId('w:abstractNumId');
    const copy = raw.replace(/w:abstractNumId="\d+"/, `w:abstractNumId="${id}"`)
      .replace(/<w:nsid w:val="[0-9A-Fa-f]+"\/>/, `<w:nsid w:val="${hex8()}"/>`)
      .replace(/(<w:lvl\b[^>]*?) w:tplc="[0-9A-Fa-f]+"/g, '$1 w:tplc="FFFFFFFF"');
    this.insertAbstract(copy);
    return id;
  }

  private insertAbstract(abs: string): void {
    let x = this.ensure();
    // todo w:abstractNum vem antes dos w:num (CT_Numbering); depois dos w:numPicBullet
    const at = x.search(/<w:num\b|<w:numIdMacAtCleanup\b|<\/w:numbering>\s*$/);
    x = x.slice(0, at) + abs + x.slice(at);
    this.set(x);
  }

  /** Troca o w:lvl `ilvl` do abstractNum (o nível já formatado como o Word grava). */
  setLevel(absId: number, ilvl: number, lvl: string): void {
    const raw = this.abstractXml(absId);
    if (!raw) return;
    const re = new RegExp(`<w:lvl\\b[^>]*\\bw:ilvl="${ilvl}"[^>]*>[\\s\\S]*?</w:lvl>`);
    const next = re.test(raw) ? raw.replace(re, () => lvl) : raw.replace(/<\/w:abstractNum>$/, () => `${lvl}</w:abstractNum>`);
    this.replaceAbstract(absId, raw, next);
  }

  /** Troca todos os níveis do abstractNum (formato da biblioteca de vários níveis). */
  setLevels(absId: number, levels: string[], o: { multiLevelType?: string; tmpl?: string } = {}): void {
    const raw = this.abstractXml(absId);
    if (!raw) return;
    let next = raw.replace(/<w:lvl\b[\s\S]*<\/w:lvl>/, () => levels.join(''));
    if (o.multiLevelType) next = next.replace(/<w:multiLevelType w:val="\w+"\/>/, () => `<w:multiLevelType w:val="${o.multiLevelType}"/>`);
    if (o.tmpl) next = next.replace(/<w:tmpl w:val="[0-9A-Fa-f]+"\/>/, () => `<w:tmpl w:val="${o.tmpl}"/>`);
    this.replaceAbstract(absId, raw, next);
  }

  /** XML cru de um nível do abstractNum. */
  levelXml(absId: number, ilvl: number): string | undefined {
    const raw = this.abstractXml(absId);
    return raw ? new RegExp(`<w:lvl\\b[^>]*\\bw:ilvl="${ilvl}"[^>]*>[\\s\\S]*?</w:lvl>`).exec(raw)?.[0] : undefined;
  }

  private replaceAbstract(absId: number, raw: string, next: string): void {
    if (raw === next) return;
    const x = this.xml!;
    const at = x.indexOf(raw);
    if (at < 0) return;
    this.set(x.slice(0, at) + next + x.slice(at + raw.length));
    void absId;
  }

  /**
   * O texto a gravar: níveis sem parágrafo ficam w:tentative="1" (como o Word grava) — só
   * nos abstractNum que o editor criou/mudou (`touched`); os de origem saem crus.
   */
  withTentative(touched: ReadonlySet<number>, used: ReadonlyMap<number, ReadonlySet<number>>): string | null {
    if (!this.xml || !touched.size) return this.xml;
    let x = this.xml;
    for (const absId of touched) {
      const raw = new RegExp(`<w:abstractNum\\b[^>]*\\bw:abstractNumId="${absId}"[^>]*>[\\s\\S]*?</w:abstractNum>`).exec(x)?.[0];
      if (!raw) continue;
      // listas de vários níveis ligadas a títulos (w:multiLevelType multilevel) não têm w:tentative
      if (!/hybridMultilevel/.test(raw)) continue;
      const u = used.get(absId) ?? new Set<number>();
      const next = raw.replace(/<w:lvl\b([^>]*)>/g, (_m, attrs: string) => {
        const ilvl = Number(/w:ilvl="(\d+)"/.exec(attrs)?.[1] ?? 0);
        const clean = attrs.replace(/ w:tentative="1"/, '');
        return u.has(ilvl) ? `<w:lvl${clean}>` : `<w:lvl${clean} w:tentative="1">`;
      });
      if (next !== raw) x = x.replace(raw, () => next);
    }
    return x;
  }
}

/** Um w:lvl cru lido como o motor o lê. */
export function parseLevel(lvl: string): NumLevel | undefined {
  const levels = readNumbering(`<w:numbering><w:abstractNum w:abstractNumId="0">${lvl}</w:abstractNum></w:numbering>`).abstractNums[0]?.levels;
  return levels ? Object.values(levels)[0] : undefined;
}

/** Mesmo formato de nível (formato, texto, fonte do marcador, imagem)? */
export function sameLevelFormat(a: NumLevel | undefined, b: NumLevel | undefined): boolean {
  if (!a || !b) return false;
  return (a.numFmt ?? 'decimal') === (b.numFmt ?? 'decimal') && (a.lvlText ?? '') === (b.lvlText ?? '')
    && (a.rPr?.rFonts?.ascii ?? '') === (b.rPr?.rFonts?.ascii ?? '') && a.lvlPicBulletId === b.lvlPicBulletId;
}

/** Indentação (twips) de um nível: w:ind left/hanging/firstLine do lvl. */
export function levelIndent(l: NumLevel | undefined): { left: number; hanging: number } {
  const ind = l?.pPr?.ind;
  return { left: ind?.left ?? 0, hanging: ind?.hanging ?? (ind?.firstLine !== undefined ? -ind.firstLine : 0) };
}
