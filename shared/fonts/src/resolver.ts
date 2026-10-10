// Resolvedor de fontes ÚNICO dos web components (Write, Sheet, Slides): dada a
// família pedida pelo documento, decide o que desenha — e com quais bytes,
// quando o app precisa medir/embutir (Write). As fontes EMBUTIDAS no arquivo
// continuam com cada componente (o ciclo de vida delas é o do documento);
// aqui fica todo o resto.
//
// Ordem (ver FontSource): host → local-access → bundled → page → installed →
// substitute → default. Medido em Chrome/Edge/Firefox (Windows): fontes
// instaladas são visíveis PELO NOME em todos (menos as do cache do Office e,
// no Firefox privado/ETP estrito, as que não são do sistema base); só o
// Chromium enumera e dá os bytes (queryLocalFonts, com permissão).
import {
  BUNDLED, DEFAULT_FAMILY, METRIC_SUBSTITUTES, PROBE_FAMILIES, bundledFileName,
} from './catalog.js';
import { browserEnvironment, type FontEnvironment } from './environment.js';
import { isEmbeddable, standaloneFace } from './sfnt.js';
import {
  VARIANTS, variantOf, variantOfStyle,
  type FontSource, type FontVariant, type HostFontFace, type HostFontProvider, type LocalFontData, type ResolvedFont,
} from './types.js';

type Faces = Partial<Record<FontVariant, Uint8Array>>;

export interface FontResolverOptions {
  /** Base (URL) das fontes abertas embarcadas (`<base>/carlito-regular.ttf`…). */
  baseUrl?: string | null;
  /** Fontes do SO fornecidas pelo host (Electron). */
  host?: HostFontProvider | null;
}

/** A fonte só existe PELO NOME no navegador (sem os bytes do arquivo). */
const needsFile = (r: ResolvedFont): boolean => r.source === 'installed' || r.source === 'page';

const css = (family: string): string => `"${family.replace(/["\\]/g, '\\$&')}"`;

export class FontResolver {
  private static sharedInstance: FontResolver | null = null;

  /** O resolvedor da página (as fontes de `document.fonts` são globais). */
  static shared(): FontResolver {
    return (FontResolver.sharedInstance ??= new FontResolver(browserEnvironment()));
  }

  private baseUrl: string | null = null;
  private host: HostFontProvider | null = null;
  private resolved = new Map<string, ResolvedFont>();
  private pending = new Map<string, Promise<ResolvedFont>>();
  private listeners = new Set<(families: string[]) => void>();
  /** Famílias (minúsculas) cujos FontFaces fomos NÓS que registramos. */
  private own = new Set<string>();
  private bundledLoads = new Map<string, Promise<Faces>>();
  /** Variante de embarcada sendo baixada (arquivo|variante). */
  private faceLoads = new Map<string, Promise<Uint8Array | undefined>>();
  private localFonts: LocalFontData[] | null = null;
  /** Substituta/padrão COM arquivo das famílias só-pelo-nome (getWithFile). */
  private fileFallbacks = new Map<string, ResolvedFont>();
  private pendingFile = new Map<string, Promise<ResolvedFont>>();
  private hostList: Promise<string[]> | null = null;

  constructor(private readonly env: FontEnvironment) {}

  /** Configura base das embarcadas e/ou host. Trocar o host refaz as resoluções. */
  configure(opts: FontResolverOptions): void {
    if (opts.baseUrl !== undefined) this.baseUrl = opts.baseUrl ? opts.baseUrl.replace(/\/$/, '') : null;
    if (opts.host !== undefined && opts.host !== this.host) {
      this.host = opts.host;
      this.hostList = null;
      this.invalidate(() => true);
    }
  }

  /** Base sugerida por um componente (atributo `fonts`): só vale se ninguém configurou. */
  suggestBaseUrl(url: string | null | undefined): void {
    if (url && this.baseUrl === null) this.baseUrl = url.replace(/\/$/, '');
  }

  get hasHost(): boolean {
    return !!this.host;
  }

  /** Resolução já pronta (síncrono); undefined se ainda não resolvida. */
  get(family: string): ResolvedFont | undefined {
    return this.resolved.get(family.toLowerCase());
  }

  /** Avisa quando famílias (re)resolvem — repintar/medir de novo. */
  onChange(cb: (families: string[]) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Pilha CSS para desenhar a família (síncrono). Ainda não resolvida: dispara
   * a resolução em segundo plano e devolve o nome pedido + os substitutos + o
   * padrão (o navegador já usa a instalada, se houver); ao resolver,
   * `onChange` avisa.
   *
   * `fallbacks`: o SUBSTITUTO DO APP para família que não existe em lugar
   * nenhum (resolvida como `default`) — cada app imita o seu programa de
   * referência (o PowerPoint desenha família ausente com métricas da Calibri;
   * o Excel cai na Aptos Narrow). O primeiro que resolver para uma fonte de
   * verdade vence; nenhum: o padrão (Liberation Sans).
   */
  cssStack(family?: string | null, fallbacks: readonly string[] = [], variant: FontVariant = 'regular'): string {
    const tail = `${css(DEFAULT_FAMILY)}, sans-serif`;
    if (!family) return tail;
    const r = this.get(family);
    if (!r) {
      void this.resolve([family, ...fallbacks]);
      return [family, ...fallbacks].map(css).join(', ') + `, ${tail}`;
    }
    const use = (x: ResolvedFont): string => {
      this.wantVariant(x, variant);
      return x.cssFamily === DEFAULT_FAMILY ? tail : `${css(x.cssFamily)}, ${tail}`;
    };
    if (r.source !== 'default') return use(r);
    for (const fb of fallbacks) {
      const f = this.get(fb);
      if (!f) {
        void this.resolve([fb]);
        return `${css(fb)}, ${tail}`;
      }
      if (f.source !== 'default') return use(f);
    }
    return use(r);
  }

  /** Quem desenha usa uma variante que a embarcada ainda não baixou (só a
   *  regular vem de início): baixa essa face, uma vez — o onChange repinta. */
  private wantVariant(r: ResolvedFont, v: FontVariant): void {
    if (v === 'regular' || r.faces[v]) return;
    if (r.source !== 'bundled' && r.source !== 'substitute' && r.source !== 'default') return;
    void this.loadFace(r, v);
  }

  /** Resolve as famílias (idempotente; pedidos em andamento são reaproveitados). */
  async resolve(families: Iterable<string>): Promise<ResolvedFont[]> {
    const wanted = new Map<string, string>();
    for (const f of families) if (f && !wanted.has(f.toLowerCase())) wanted.set(f.toLowerCase(), f);
    const missing = [...wanted].filter(([k]) => !this.resolved.has(k) && !this.pending.has(k)).map(([, f]) => f);
    if (missing.length) {
      // grava ANTES de avisar: quem ouve onChange já encontra o resultado em get()
      const batch = this.resolveBatch(missing).then((rs) => {
        for (const r of rs) this.resolved.set(r.family.toLowerCase(), r);
        return rs;
      });
      missing.forEach((f, i) => {
        const key = f.toLowerCase();
        const p = batch.then((rs) => rs[i]!);
        this.pending.set(key, p);
        void p.finally(() => this.pending.delete(key)).catch(() => {});
      });
      void batch.then((rs) => this.emit(rs.map((r) => r.family)), () => {});
    }
    return Promise.all([...wanted].map(([k]) => this.resolved.get(k) ?? this.pending.get(k)!));
  }

  /** Bytes de uma família ABERTA embarcada (ex.: o padrão) — das variantes pedidas. */
  async bundledFaces(family: string = DEFAULT_FAMILY, variants: readonly FontVariant[] = ['regular']): Promise<Faces> {
    const faces = await this.loadBundled(family);
    const b = BUNDLED[family.toLowerCase()];
    if (b) await Promise.all(variants.map((v) => this.loadBundledFace(b, faces, v)));
    return faces;
  }

  /**
   * Bytes de UMA variante da família resolvida, baixando se preciso — as
   * embarcadas (bundled/substituta/padrão) chegam só com a regular; as outras
   * vêm quando alguém mede/embute aquela variante. undefined: não há o arquivo.
   */
  async loadFace(r: ResolvedFont, v: FontVariant): Promise<Uint8Array | undefined> {
    if (r.faces[v]) return r.faces[v];
    if (r.source !== 'bundled' && r.source !== 'substitute' && r.source !== 'default') return undefined;
    const b = BUNDLED[r.cssFamily.toLowerCase()];
    if (!b) return undefined;
    return this.loadBundledFace(b, await this.loadBundled(b.family), v);
  }

  /**
   * Resolução que EXIGE o arquivo da fonte (síncrono) — para quem mede e embute
   * o texto com as métricas do arquivo (o Write). Família que o navegador só
   * expõe PELO NOME (`installed`/`page`, sem bytes) vira a substituta
   * métrico-compatível ou o padrão — como um editor que não acha a fonte, e
   * igual na tela e no PDF. undefined: ainda não resolvida (ver resolveWithFile).
   */
  getWithFile(family: string): ResolvedFont | undefined {
    const r = this.get(family);
    if (!r || !needsFile(r)) return r;
    return this.fileFallbacks.get(family.toLowerCase());
  }

  /** resolve() exigindo o arquivo (ver getWithFile); avisa por onChange. */
  async resolveWithFile(families: Iterable<string>): Promise<ResolvedFont[]> {
    const rs = await this.resolve(families);
    return Promise.all(rs.map((r) => (needsFile(r) ? this.fileFallback(r) : r)));
  }

  /**
   * Famílias para um seletor de fonte. Com host: as dele. Senão, as que a
   * Local Font Access já entregou (se permitida) ou as SONDADAS pelo nome
   * (lista PROBE_FAMILIES) + as embarcadas e as que têm substituta.
   * `withFile`: só as que dá para usar COM o arquivo (sem as sondadas pelo
   * nome nem as `@font-face` da página) — o seletor do Write.
   */
  async listFamilies(opts: { withFile?: boolean } = {}): Promise<string[]> {
    const names = new Map<string, string>();
    const add = (n: string) => { if (n && !names.has(n.toLowerCase())) names.set(n.toLowerCase(), n); };
    for (const b of Object.values(BUNDLED)) add(b.family);
    for (const k of Object.keys(METRIC_SUBSTITUTES)) {
      const r = PROBE_FAMILIES.find((p) => p.toLowerCase() === k);
      if (r) add(r);
    }
    for (const r of this.resolved.values()) if (r.source !== 'default' && !(opts.withFile && needsFile(r))) add(r.family);
    if (!opts.withFile) for (const n of this.env.pageFamilies(this.own).values()) add(n);
    if (this.host) {
      try { for (const n of await (this.hostList ??= this.host.list())) add(n); } catch { /* host sem lista */ }
    } else if (await this.localAccessFonts()) {
      for (const f of this.localFonts!) add(f.family);
    } else if (!opts.withFile) {
      for (const p of PROBE_FAMILIES) if (this.env.isInstalled(p)) add(p);
    }
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }

  /**
   * Pede a Local Font Access (Chromium): CHAMAR NUM GESTO DO USUÁRIO (abrir o
   * seletor de fonte, exportar). Concedida, refaz as famílias que ficaram sem
   * bytes (instaladas/substitutas/padrão) para usar a fonte real.
   */
  async requestLocalAccess(): Promise<boolean> {
    if (this.host || !this.env.localAccess) return false;
    if (this.localFonts) return true;
    try {
      this.localFonts = await this.env.localAccess.query();
    } catch {
      return false;
    }
    this.invalidate((r) => r.source === 'installed' || r.source === 'substitute' || r.source === 'default');
    return true;
  }

  // ───────────────────────── internos ─────────────────────────

  private emit(families: string[]): void {
    if (!families.length) return;
    for (const cb of this.listeners) {
      try { cb(families); } catch { /* ouvinte com erro não derruba os outros */ }
    }
  }

  /** Substituta (ou padrão) COM arquivo para uma família só-pelo-nome; uma vez. */
  private fileFallback(r: ResolvedFont): Promise<ResolvedFont> {
    const key = r.family.toLowerCase();
    const done = this.fileFallbacks.get(key);
    if (done) return Promise.resolve(done);
    let p = this.pendingFile.get(key);
    if (!p) {
      p = (async () => {
        const sub = METRIC_SUBSTITUTES[key];
        const subFaces = sub ? await this.loadBundled(sub) : {};
        const out: ResolvedFont = Object.keys(subFaces).length
          ? { family: r.family, cssFamily: sub!, source: 'substitute', faces: subFaces, embeddable: true }
          : { family: r.family, cssFamily: DEFAULT_FAMILY, source: 'default', faces: await this.loadBundled(DEFAULT_FAMILY), embeddable: true };
        this.fileFallbacks.set(key, out);
        this.pendingFile.delete(key);
        this.emit([r.family]);
        return out;
      })();
      this.pendingFile.set(key, p);
    }
    return p;
  }

  /** Esquece resoluções (para refazer com uma fonte melhor) e avisa. */
  private invalidate(which: (r: ResolvedFont) => boolean): void {
    this.fileFallbacks.clear();
    const again: string[] = [];
    for (const [k, r] of this.resolved) if (which(r)) { this.resolved.delete(k); again.push(r.family); }
    if (again.length) void this.resolve(again);
  }

  private async localAccessFonts(): Promise<boolean> {
    if (this.localFonts) return true;
    const la = this.env.localAccess;
    if (!la || !(await la.granted())) return false;
    try {
      this.localFonts = await la.query();
      return true;
    } catch {
      return false;
    }
  }

  private async resolveBatch(families: string[]): Promise<ResolvedFont[]> {
    // host: UMA ida só para o lote (IPC no Electron)
    let hostFaces: HostFontFace[] = [];
    if (this.host) {
      try { hostFaces = await this.host.resolve(families); } catch { hostFaces = []; }
    }
    const byFamily = new Map<string, HostFontFace[]>();
    for (const f of hostFaces) {
      const k = f.family.toLowerCase();
      byFamily.set(k, [...(byFamily.get(k) ?? []), f]);
    }
    const hasLocal = !this.host && (await this.localAccessFonts());
    const out: ResolvedFont[] = [];
    for (const family of families) {
      out.push(await this.resolveOne(family, byFamily.get(family.toLowerCase()) ?? [], hasLocal));
    }
    return out;
  }

  private async resolveOne(family: string, hostFaces: HostFontFace[], hasLocal: boolean): Promise<ResolvedFont> {
    const key = family.toLowerCase();
    const result = (source: FontSource, cssFamily: string, faces: Faces = {}, embeddable = true): ResolvedFont =>
      ({ family, cssFamily, source, faces, embeddable });

    // 1. host
    if (hostFaces.length) {
      const faces: Faces = {};
      let embeddable = true;
      for (const f of hostFaces) {
        const v = variantOf(f.bold ?? Number(f.weight) >= 600, f.style === 'italic');
        if (faces[v]) continue;
        const bytes = new Uint8Array(f.bytes);
        if (await this.env.addFace(family, v, bytes)) {
          faces[v] = bytes;
          if (f.embeddable === false) embeddable = false;
        }
      }
      if (Object.keys(faces).length) {
        this.own.add(key);
        return result('host', family, faces, embeddable);
      }
    }

    // 2. Local Font Access (já permitida)
    if (hasLocal && this.localFonts) {
      const faces: Faces = {};
      let embeddable = true;
      // pela família; ou pelo NOME COMPLETO da face — famílias "legadas" do
      // Windows ("Segoe UI Light") a API entrega como família "Segoe UI" +
      // estilo "Light": a face "Segoe UI Light" é a regular da legada
      const byFull = new Map<string, FontVariant>([
        [key, 'regular'], [`${key} regular`, 'regular'], [`${key} bold`, 'bold'],
        [`${key} italic`, 'italic'], [`${key} bold italic`, 'boldItalic'],
      ]);
      for (const fd of this.localFonts) {
        const v = fd.family.toLowerCase() === key ? variantOfStyle(fd.style) : byFull.get((fd.fullName ?? '').toLowerCase());
        if (!v) continue;
        if (faces[v]) continue;
        try {
          const bytes = standaloneFace(new Uint8Array(await (await fd.blob()).arrayBuffer()), fd.postscriptName);
          if (await this.env.addFace(family, v, bytes)) {
            faces[v] = bytes;
            if (!isEmbeddable(bytes)) embeddable = false;
          }
        } catch { /* face ilegível: segue */ }
      }
      if (Object.keys(faces).length) {
        this.own.add(key);
        return result('local-access', family, faces, embeddable);
      }
    }

    // 3. embarcada com o mesmo nome
    if (BUNDLED[key]) {
      const faces = await this.loadBundled(family);
      if (Object.keys(faces).length) return result('bundled', BUNDLED[key]!.family, faces);
    }

    // 4. @font-face da página
    const page = this.env.pageFamilies(this.own).get(key);
    if (page) {
      await this.env.loadPageFamily(page);
      return result('page', page);
    }

    // 5. instalada, pelo nome — ou por local() (o Firefox não casa pelo nome
    //    famílias "legadas" como "Segoe UI Light", mas casa por local())
    if (this.env.isInstalled(family)) return result('installed', family);
    if (await this.env.loadLocal(family, 'regular')) {
      this.own.add(key);
      await Promise.all(VARIANTS.slice(1).map((v) => this.env.loadLocal(family, v)));
      return result('installed', family);
    }

    // 6. substituta métrico-compatível
    const sub = METRIC_SUBSTITUTES[key];
    if (sub) {
      const faces = await this.loadBundled(sub);
      if (Object.keys(faces).length) return result('substitute', sub, faces);
    }

    // 7. padrão
    return result('default', DEFAULT_FAMILY, await this.loadBundled(DEFAULT_FAMILY));
  }

  /**
   * Família embarcada da `baseUrl`, uma vez: baixa SÓ a regular. As outras
   * variantes vêm quando alguém as usa — quem desenha avisa pelo cssStack
   * (variante), quem mede/embute pede loadFace — e chegam UMA vez, para todos.
   * O objeto `Faces` é compartilhado: variantes que chegarem depois aparecem
   * em toda resolução que usa o arquivo.
   */
  private loadBundled(family: string): Promise<Faces> {
    const b = BUNDLED[family.toLowerCase()];
    if (!b || !this.baseUrl) return Promise.resolve({});
    let p = this.bundledLoads.get(b.file);
    if (!p) {
      const base = this.baseUrl;
      p = (async () => {
        const faces: Faces = {};
        const bytes = await this.env.fetchBytes(`${base}/${bundledFileName(b.file, 'regular')}`);
        if (!bytes || !(await this.env.addFace(b.family, 'regular', bytes))) {
          this.bundledLoads.delete(b.file); // base errada/ausente: tenta de novo depois
          return faces;
        }
        faces.regular = bytes;
        this.own.add(b.family.toLowerCase());
        return faces;
      })();
      this.bundledLoads.set(b.file, p);
    }
    return p;
  }

  /** Baixa (uma vez) os bytes de uma variante de família embarcada e avisa. */
  private loadBundledFace(b: { family: string; file: string }, faces: Faces, v: FontVariant): Promise<Uint8Array | undefined> {
    if (faces[v]) return Promise.resolve(faces[v]);
    if (!this.baseUrl || !faces.regular) return Promise.resolve(undefined);
    const key = `${b.file}|${v}`;
    let p = this.faceLoads.get(key);
    if (!p) {
      const url = `${this.baseUrl}/${bundledFileName(b.file, v)}`;
      p = (async () => {
        const bytes = await this.env.fetchBytes(url);
        if (!bytes) return undefined;
        faces[v] = bytes;
        await this.env.addFace(b.family, v, bytes);
        const fams = [...this.resolved.values(), ...this.fileFallbacks.values()].filter((r) => r.faces === faces).map((r) => r.family);
        this.emit([...new Set(fams)]);
        return bytes;
      })();
      this.faceLoads.set(key, p);
    }
    return p;
  }
}
