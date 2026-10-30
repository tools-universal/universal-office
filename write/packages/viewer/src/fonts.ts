import { FontResolver, METRIC_SUBSTITUTES, isFontFile, type FontVariant } from '@universal-office/fonts';
import { SfntFont } from '@universal-office/docx-layout';
import type { FontProvider, FontFace as EngineFontFace } from '@universal-office/docx-layout';

/**
 * Faces do motor para o viewer — o MESMO critério do editor (<universal-write>,
 * engineFontProvider) e do PDF: mede e pinta só com o ARQUIVO da fonte
 * (resolvedor único de shared/fonts, `getWithFile`); família só-pelo-nome ou
 * sem licença de incorporação vira a substituta métrico-compatível. Assim a
 * tela e a impressão (renderPdf) saem iguais.
 */

/** Arquivos opcionais da base `fonts` — os mesmos que o editor procura
 *  (proprietárias só existem no dev local via `npm run fonts:sync`; 404 = pula). */
const ASSET_FILES: [string, string, FontVariant][] = [
  ['Liberation Sans', 'liberationsans-regular.ttf', 'regular'],
  ['Liberation Sans', 'liberationsans-bold.ttf', 'bold'],
  ['Liberation Sans', 'liberationsans-italic.ttf', 'italic'],
  ['Liberation Sans', 'liberationsans-bolditalic.ttf', 'boldItalic'],
  ['Aptos', 'aptos-regular.ttf', 'regular'],
  ['Aptos', 'aptos-bold.ttf', 'bold'],
  ['Aptos', 'aptos-italic.ttf', 'italic'],
  ['Aptos', 'aptos-bolditalic.ttf', 'boldItalic'],
  ['Calibri', 'calibri.ttf', 'regular'],
  ['Calibri', 'calibrib.ttf', 'bold'],
  ['Calibri', 'calibrii.ttf', 'italic'],
  ['Calibri', 'calibriz.ttf', 'boldItalic'],
];

const variantOf = (bold: boolean, italic: boolean): FontVariant =>
  bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';

type Asset = { font: SfntFont; bytes: Uint8Array };

export class ViewerFonts {
  /** Faces dos arquivos da base `fonts` (família em minúsculas). */
  private assets = new Map<string, Partial<Record<FontVariant, Asset>>>();
  private parsed = new WeakMap<Uint8Array, SfntFont>();
  /** Famílias/variantes que o motor pediu e ainda não havia. */
  private missing = new Map<string, Set<FontVariant>>();
  private attempted = new Set<string>();
  /** Família CSS registrada (FontFace) para cada arquivo — o canvas pinta com o MESMO arquivo que mediu. */
  private cssNames = new WeakMap<Uint8Array, string>();
  private cssSeq = 0;
  private assetsLoad: Promise<void> | null = null;

  constructor(readonly resolver: FontResolver, private readonly onFaceReady: () => void) {}

  /** Carrega (uma vez) os arquivos opcionais da base `fonts` + as tabelas de avanço. */
  loadAssets(base: string | null): Promise<void> {
    this.resolver.suggestBaseUrl(base);
    return (this.assetsLoad ??= base === null ? Promise.resolve() : (async () => {
      const tableName = (family: string, variant: FontVariant): string => {
        const prefix = family.toLowerCase().replace(/\s+/g, '');
        const suffix = variant === 'regular' ? '' : variant === 'boldItalic' ? '-bolditalic' : `-${variant}`;
        return `${prefix}${suffix}-advances.json`;
      };
      await Promise.all(ASSET_FILES.map(async ([family, file, variant]) => {
        const resp = await fetch(`${base}/${file}`).catch(() => null);
        if (!resp?.ok) return;
        try {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          if (!isFontFile(bytes)) return; // 200 com o HTML de fallback de uma SPA: ausente
          const font = new SfntFont(bytes);
          try {
            const r = await fetch(`${base}/${tableName(family, variant)}`);
            if (r.ok) font.setAdvanceTable(await r.json() as Record<string, Record<string, number>>);
          } catch { /* tabela opcional: métricas lineares */ }
          const k = family.toLowerCase();
          if (!this.assets.has(k)) this.assets.set(k, {});
          this.assets.get(k)![variant] = { font, bytes };
        } catch { /* arquivo inválido: pula */ }
      }));
    })());
  }

  private sfnt(bytes: Uint8Array): SfntFont {
    let f = this.parsed.get(bytes);
    if (!f) { f = new SfntFont(bytes); this.parsed.set(bytes, f); }
    return f;
  }

  private note(family: string, v: FontVariant): void {
    let s = this.missing.get(family);
    if (!s) this.missing.set(family, (s = new Set()));
    s.add(v);
  }

  /** Provedor do motor (com cache por chamada de layout). */
  provider(): FontProvider {
    const cache = new Map<string, EngineFontFace | null>();
    return {
      face: (family, bold, italic) => {
        const key = `${family}|${bold ? 1 : 0}${italic ? 1 : 0}`;
        if (cache.has(key)) return cache.get(key)!;
        const out = this.face(family, bold, italic);
        cache.set(key, out);
        return out;
      },
    };
  }

  private face(family: string, bold: boolean, italic: boolean): EngineFontFace | null {
    const want = variantOf(bold, italic);
    const order = [...new Set<FontVariant>([want, bold ? 'bold' : 'regular', italic ? 'italic' : 'regular', 'regular'])];
    const mk = (fam: string, font: SfntFont, bytes: Uint8Array, v: FontVariant, standIn = false): EngineFontFace => {
      const vb = v === 'bold' || v === 'boldItalic', vi = v === 'italic' || v === 'boldItalic';
      return {
        key: `${fam}|${v}`, family: fam, font, bytes, bold, italic,
        ...(bold && !vb ? { synthBold: true } : {}),
        ...(italic && !vi ? { synthItalic: true } : {}),
        ...(standIn ? { standIn: true } : {}),
      };
    };
    const a = this.assets.get(family.toLowerCase());
    if (a) {
      for (const v of order) { const f = a[v]; if (f) return mk(family, f.font, f.bytes, v); }
    }
    const r = this.resolver.getWithFile(family);
    if (!r) { this.note(family, want); return null; }
    if (r.source === 'default') return null; // o motor segue a cadeia de substituição dele
    if (!r.faces[want]) this.note(family, want);
    for (const v of order) {
      let bytes = r.faces[v];
      if (!bytes) continue;
      let fam = family;
      if (!r.embeddable) {
        // licença não deixa embutir: a substituta métrico-compatível (mede e pinta igual ao PDF)
        const sub = METRIC_SUBSTITUTES[family.toLowerCase()];
        const rs = sub ? this.resolver.getWithFile(sub) : undefined;
        const b2 = rs?.faces[v] ?? rs?.faces.regular;
        if (!b2) { if (sub) this.note(sub, v); continue; }
        bytes = b2; fam = sub!;
      }
      // família ausente trocada pela métrico-compatível: o motor ainda aplica antes a
      // regra do Word para família ausente (escrita do Leste Asiático do fontTable…)
      try { return mk(fam, this.sfnt(bytes), bytes, v, r.source === 'substitute'); } catch { /* arquivo ilegível */ }
    }
    return null;
  }

  /** Resolve o que o motor pediu e não havia; true se algo novo chegou (refazer o layout). */
  async loadMissing(): Promise<boolean> {
    const want = new Map<string, Set<FontVariant>>();
    for (const [f, vs] of this.missing) {
      for (const v of vs) {
        const k = `${f.toLowerCase()}|${v}`;
        if (this.attempted.has(k)) continue;
        this.attempted.add(k);
        let s = want.get(f);
        if (!s) want.set(f, (s = new Set()));
        s.add(v);
      }
    }
    this.missing.clear();
    if (!want.size) return false;
    try {
      const rs = await this.resolver.resolveWithFile(want.keys());
      await Promise.all(rs.flatMap((r) => [...(want.get(r.family) ?? [])].filter((v) => !r.faces[v])
        .map((v) => this.resolver.loadFace(r, v))));
    } catch { return false; }
    return true;
  }

  /** Família CSS da face para o canvas: um FontFace por ARQUIVO (pinta com o que mediu). */
  cssOf(face: EngineFontFace): { family: string; weight: 400 | 700; italic: boolean } {
    const bytes = face.bytes;
    if (!bytes) {
      return { family: `"${face.family.replace(/["\\]/g, '')}", "Liberation Sans", sans-serif`, weight: face.bold && !face.synthBold ? 700 : 400, italic: face.italic && !face.synthItalic };
    }
    let name = this.cssNames.get(bytes);
    if (!name) {
      name = `udv-face-${++this.cssSeq}`;
      this.cssNames.set(bytes, name);
      try {
        const ff = new FontFace(name, bytes.slice().buffer);
        document.fonts.add(ff);
        ff.load().then(() => this.onFaceReady(), () => {});
      } catch { /* face inválida para o navegador */ }
    }
    return { family: `"${name}", "Liberation Sans", sans-serif`, weight: 400, italic: false };
  }
}
