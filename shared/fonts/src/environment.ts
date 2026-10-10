// Tudo o que o resolvedor precisa do NAVEGADOR, atrás de uma interface (os
// testes usam um ambiente falso).
import { faceDescriptors, type FontVariant, type LocalFontData } from './types.js';

export interface FontEnvironment {
  /** A família está instalada e o navegador a usa pelo NOME? */
  isInstalled(family: string): boolean;
  /** Registra `family` como FontFace `local()` da variante (nome completo da face). */
  loadLocal(family: string, v: FontVariant): Promise<boolean>;
  /** Registra um FontFace a partir dos bytes. */
  addFace(family: string, v: FontVariant, bytes: Uint8Array): Promise<boolean>;
  /** Famílias (minúsculas → nome) declaradas em `document.fonts` por terceiros. */
  pageFamilies(exclude: ReadonlySet<string>): Map<string, string>;
  /** Carrega as faces que a página declarou para a família. */
  loadPageFamily(family: string): Promise<void>;
  fetchBytes(url: string): Promise<Uint8Array | null>;
  /** Local Font Access API (só Chromium); null se não existe. */
  localAccess: {
    /** Permissão JÁ concedida (não pergunta). */
    granted(): Promise<boolean>;
    /** Enumera (pode pedir permissão: chamar num gesto do usuário). */
    query(): Promise<LocalFontData[]>;
  } | null;
}

const PROBE_TEXT = 'mmmmmmmmmmlli1WQ@#Ωβ';
const GENERICS = ['monospace', 'serif', 'sans-serif'] as const;
const cssName = (family: string): string => `"${family.replace(/["\\]/g, '\\$&')}"`;
const unquote = (s: string): string => s.trim().replace(/^(["'])(.*)\1$/, '$2');

export function browserEnvironment(): FontEnvironment {
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  const context = () => {
    if (ctx) return ctx;
    ctx = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(8, 8).getContext('2d')
      : document.createElement('canvas').getContext('2d');
    return ctx;
  };
  const width = (font: string): number => {
    const c = context();
    if (!c) return 0;
    c.font = font;
    return c.measureText(PROBE_TEXT).width;
  };
  const baseWidths = new Map<string, number>();
  const generic = (g: string): number => {
    let w = baseWidths.get(g);
    if (w === undefined) baseWidths.set(g, (w = width(`72px ${g}`)));
    return w;
  };

  const qlf = typeof window !== 'undefined'
    ? (window as unknown as { queryLocalFonts?: () => Promise<LocalFontData[]> }).queryLocalFonts
    : undefined;

  return {
    // Mede o texto com a família + uma genérica; se a largura mudar em
    // alguma das três genéricas, o navegador achou a família.
    isInstalled(family) {
      return GENERICS.some((g) => width(`72px ${cssName(family)}, ${g}`) !== generic(g));
    },
    async loadLocal(family, v) {
      // local() casa o nome COMPLETO da face ("Segoe UI Light", "Calibri Bold")
      const names = v === 'regular' ? [family, `${family} Regular`]
        : v === 'bold' ? [`${family} Bold`]
        : v === 'italic' ? [`${family} Italic`]
        : [`${family} Bold Italic`];
      for (const n of names) {
        try {
          const face = new FontFace(family, `local(${cssName(n)})`, faceDescriptors(v));
          await face.load();
          document.fonts.add(face);
          return true;
        } catch { /* nome não existe: tenta o próximo */ }
      }
      return false;
    },
    async addFace(family, v, bytes) {
      try {
        const face = new FontFace(family, bytes.slice().buffer, faceDescriptors(v));
        await face.load();
        document.fonts.add(face);
        return true;
      } catch {
        return false;
      }
    },
    pageFamilies(exclude) {
      const out = new Map<string, string>();
      if (typeof document === 'undefined' || !document.fonts) return out;
      for (const f of document.fonts as unknown as Iterable<FontFace>) {
        const name = unquote(f.family);
        const key = name.toLowerCase();
        if (!exclude.has(key)) out.set(key, name);
      }
      return out;
    },
    async loadPageFamily(family) {
      const n = cssName(family);
      await Promise.allSettled([
        document.fonts.load(`16px ${n}`), document.fonts.load(`bold 16px ${n}`),
        document.fonts.load(`italic 16px ${n}`), document.fonts.load(`italic bold 16px ${n}`),
      ]);
    },
    async fetchBytes(url) {
      try {
        const res = await fetch(url);
        return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
      } catch {
        return null;
      }
    },
    localAccess: typeof qlf === 'function'
      ? {
          async granted() {
            try {
              const st = await navigator.permissions.query({ name: 'local-fonts' as PermissionName });
              return st.state === 'granted';
            } catch {
              return false;
            }
          },
          query: () => qlf.call(window),
        }
      : null,
  };
}
