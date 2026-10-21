// Revisão ortográfica do <universal-write> sobre o motor ÚNICO dos apps
// (@universal-office/spell — Hunspell em Worker). Aqui só fica o que é do
// Write: o idioma de cada run (w:lang do run → estilo de caractere → estilo do
// parágrafo → padrões do documento), o que não se revisa (w:noProof, campos,
// marcas de nota, objetos) e o cache dos erros POR PARÁGRAFO, que a pintura
// consulta de forma síncrona. O motor carrega sob demanda, no 1º parágrafo.
import type { Paragraph, Run, RPr, StyleSheet } from '@universal-office/docx-core';

/** Uma palavra errada: posição no texto do parágrafo (run.text concatenado). */
export interface Misspelling {
  start: number;
  end: number;
  word: string;
  /** dicionário que a revisou (BCP 47) */
  lang: string;
}

/** O pedaço do motor que o Write usa (o SpellChecker compartilhado). */
export interface SpellEngine {
  checkText(text: string, lang: string): Promise<{ word: string; start: number; end: number }[]>;
  suggest(word: string, lang: string): Promise<string[]>;
  add(word: string): Promise<void>;
  ignore(word: string): void;
  resolve(lang: string): { id: string; exact: boolean } | undefined;
  onChange(cb: () => void): () => void;
  dispose(): void;
}

/** Idioma padrão quando nem run, estilos ou padrões do documento dizem (o alvo de fidelidade). */
export const DEFAULT_SPELL_LANG = 'pt-BR';

/** Trecho revisável de um parágrafo: mesmo idioma, sem campos/objetos/noProof
 *  (esses caracteres viram espaço — as posições continuam as do parágrafo). */
export interface SpellSpan { lang: string; text: string }

type Resolved = { lang?: string; noProof?: boolean };

/** Idioma e w:noProof efetivos de um run (direto → estilo de caractere →
 *  estilo do parágrafo → padrões do documento), com cache por estilo. */
export class LangResolver {
  private styleCache = new Map<string, Resolved>();

  constructor(private sheet: StyleSheet | undefined, private fallback = DEFAULT_SPELL_LANG) {}

  private style(id: string | undefined, seen = new Set<string>()): Resolved {
    if (!id || !this.sheet) return {};
    const hit = this.styleCache.get(id);
    if (hit) return hit;
    const def = this.sheet.styles[id];
    let out: Resolved = {};
    if (def && !seen.has(id)) {
      seen.add(id);
      const base = this.style(def.basedOn, seen);
      out = { lang: def.rPr?.lang?.val ?? base.lang, noProof: def.rPr?.noProof ?? base.noProof };
    }
    this.styleCache.set(id, out);
    return out;
  }

  run(run: Run, para: Paragraph): { lang: string; noProof: boolean } {
    const rpr: RPr | undefined = run.rpr;
    const ch = this.style(rpr?.rStyle);
    const ps = this.style(para.props.styleId ?? para.ppr?.pStyle ?? this.sheet?.defaults.paragraph);
    const dd = this.sheet?.docDefaults.rPr;
    return {
      lang: rpr?.lang?.val ?? ch.lang ?? ps.lang ?? dd?.lang?.val ?? this.fallback,
      noProof: rpr?.noProof ?? ch.noProof ?? ps.noProof ?? dd?.noProof ?? false,
    };
  }
}

/** Runs que não se revisam: campos (o resultado é do Word), marcas de nota,
 *  objetos, inlines de plugin e texto excluído em revisão. */
const skipRun = (r: Run): boolean =>
  !!(r.field || r.fieldResult || r.noteRef || r.custom || r.image || r.textbox || r.shape || r.group || r.math || r.props.isMath || r.formField || r.props.del);

/** Trechos por idioma de um parágrafo: um texto por idioma, do tamanho do
 *  parágrafo, com espaço no lugar do que é de outro idioma ou não se revisa. */
export function spellSpans(para: Paragraph, langs: LangResolver): SpellSpan[] {
  const full = para.runs.map((r) => r.text).join('');
  if (!/\p{L}/u.test(full)) return [];
  const byLang = new Map<string, string[]>();
  let at = 0;
  for (const r of para.runs) {
    const n = r.text.length;
    const { lang, noProof } = langs.run(r, para);
    if (!skipRun(r) && !noProof) {
      let arr = byLang.get(lang);
      if (!arr) { arr = Array.from({ length: full.length }, () => ' '); byLang.set(lang, arr); }
      for (let k = 0; k < n; k++) arr[at + k] = r.text[k]!;
    }
    at += n;
  }
  return [...byLang].map(([lang, chars]) => ({ lang, text: chars.join('') }));
}

/** Chave do conteúdo revisável de um parágrafo (texto + idiomas). */
const keyOf = (spans: SpellSpan[]): string => spans.map((s) => `${s.lang}\u0001${s.text}`).join('\u0002');

/**
 * Cache dos erros por parágrafo. `get` é síncrono (para a pintura): devolve o
 * resultado guardado se o texto não mudou; senão agenda a revisão em lote e
 * devolve o resultado anterior (ou nada) até ela voltar — então `onUpdate`.
 */
export class ParagraphSpell {
  private byPara = new WeakMap<Paragraph, { key: string; list: Misspelling[] }>();
  /** mesmo texto em outro objeto (desfazer recria os parágrafos): sem revisar de novo */
  private byKey = new Map<string, Misspelling[]>();
  private queue = new Map<Paragraph, SpellSpan[]>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private offChange: () => void;

  constructor(
    private engine: SpellEngine,
    private langs: () => LangResolver,
    private onUpdate: () => void,
    private delay = 120,
  ) {
    // dicionário do usuário / ignorar tudo / dicionário carregado: revisa de novo
    this.offChange = engine.onChange(() => this.invalidate());
  }

  invalidate(): void {
    this.generation++;
    this.byPara = new WeakMap();
    this.byKey.clear();
    this.onUpdate();
  }

  dispose(): void {
    this.offChange();
    if (this.timer) clearTimeout(this.timer);
    this.queue.clear();
  }

  /** Erros do parágrafo, ou undefined se ainda não revisado. */
  get(para: Paragraph): Misspelling[] | undefined {
    const spans = spellSpans(para, this.langs());
    if (!spans.length) return [];
    const key = keyOf(spans);
    const hit = this.byPara.get(para);
    if (hit?.key === key) return hit.list;
    const known = this.byKey.get(key);
    if (known) { this.byPara.set(para, { key, list: known }); return known; }
    this.queue.set(para, spans);
    this.schedule();
    return hit?.list;
  }

  /** Revisão imediata (diálogo F7): espera o motor. */
  async check(para: Paragraph): Promise<Misspelling[]> {
    const spans = spellSpans(para, this.langs());
    if (!spans.length) return [];
    const key = keyOf(spans);
    const hit = this.byPara.get(para);
    if (hit?.key === key) return hit.list;
    const list = await this.run(spans);
    this.store(para, key, list);
    return list;
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, this.delay);
  }

  private async flush(): Promise<void> {
    const batch = [...this.queue];
    this.queue.clear();
    const gen = this.generation;
    let changed = false;
    for (const [para, spans] of batch) {
      let list: Misspelling[];
      try { list = await this.run(spans); } catch { continue; }
      if (gen !== this.generation) return;
      this.store(para, keyOf(spans), list);
      changed = true;
    }
    if (changed) this.onUpdate();
  }

  private store(para: Paragraph, key: string, list: Misspelling[]): void {
    this.byPara.set(para, { key, list });
    if (this.byKey.size > 4000) this.byKey.clear();
    this.byKey.set(key, list);
  }

  private async run(spans: SpellSpan[]): Promise<Misspelling[]> {
    const out: Misspelling[] = [];
    for (const s of spans) {
      // idioma sem dicionário (de-DE, zxx…): sem revisão, como o Word sem o revisor instalado
      const dict = this.engine.resolve(s.lang);
      if (!dict) continue;
      for (const m of await this.engine.checkText(s.text, dict.id)) out.push({ ...m, lang: dict.id });
    }
    return out.sort((a, b) => a.start - b.start);
  }
}

/** Erro que contém (ou toca) a posição. */
export function misspellingAt(list: readonly Misspelling[] | undefined, offset: number): Misspelling | undefined {
  return list?.find((m) => offset >= m.start && offset <= m.end);
}

/** Onda do sublinhado de erro (twips): de x1 a x2 sobre a linha de base. */
export function wavePath(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, amp = 18, period = 60): void {
  ctx.beginPath();
  ctx.moveTo(x1, y);
  let up = true;
  for (let x = x1; x < x2; x += period / 2) {
    const nx = Math.min(x2, x + period / 2);
    ctx.quadraticCurveTo((x + nx) / 2, y + (up ? -amp : amp), nx, y);
    up = !up;
  }
}
