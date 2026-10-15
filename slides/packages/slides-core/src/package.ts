import { unzipSync, zipSync, type Zippable } from 'fflate';
import { isCfb, convertPptToPptx } from './ppt/index.js';

/**
 * Container OPC de um .pptx. REGRA DE OURO (igual ao sheet/write): round-trip
 * sem perdas — toda parte e preservada byte a byte; so regeneramos quando uma
 * edicao a modifica. A ordem das partes no ZIP e preservada (diffs limpos).
 */
export class PptxPackage {
  private parts: Map<string, Uint8Array>;
  private constructor(parts: Map<string, Uint8Array>) { this.parts = parts; }

  static load(bytes: Uint8Array): PptxPackage {
    // .ppt binário (97-2003, contêiner CFB): converte p/ OOXML em memória
    // (slides-core/ppt) — o resto do pipeline só conhece .pptx
    if (isCfb(bytes)) bytes = convertPptToPptx(bytes);
    let unzipped: ReturnType<typeof unzipSync>;
    // o fflate pré-aloca o tamanho DECLARADO de cada entrada: tamanho
    // impossível para o deflate (> ~1032:1) é zip forjado — a entrada fica de fora
    try { unzipped = unzipSync(bytes, { filter: (f) => f.originalSize <= Math.max(1 << 20, f.size * 1100) }); }
    catch { throw new Error('Arquivo nao e um pacote OOXML valido (ZIP corrompido ou .ppt legado)'); }
    const pkg = new PptxPackage(new Map(Object.entries(unzipped)));
    if (!pkg.getPart('ppt/presentation.xml')) {
      throw new Error('Pacote sem ppt/presentation.xml — nao e uma apresentacao valida');
    }
    return pkg;
  }

  /**
   * Partes de OUTRO pacote OPC (planilha: os desenhos de `xl/drawings/` usam o
   * mesmo leitor DrawingML) — sem exigir `ppt/presentation.xml`. Os bytes são
   * compartilhados, não copiados.
   */
  static fromParts(parts: Map<string, Uint8Array>): PptxPackage {
    return new PptxPackage(parts);
  }

  save(): Uint8Array {
    const zippable: Zippable = {};
    for (const [path, data] of this.parts) zippable[path] = data;
    return zipSync(zippable, { level: 6 });
  }

  partNames(): string[] { return [...this.parts.keys()]; }
  getPart(path: string): Uint8Array | undefined { return this.parts.get(path) ?? this.parts.get(this.caseless(path)); }
  getPartText(path: string): string | undefined {
    const d = this.getPart(path);
    return d === undefined ? undefined : new TextDecoder().decode(d);
  }
  setPartText(path: string, text: string): void { this.setPart(path, new TextEncoder().encode(text)); }
  setPart(path: string, data: Uint8Array): void { this.parts.set(path, data); this.lower = null; }
  removePart(path: string): void { this.parts.delete(path); this.lower = null; }

  /** Índice minúsculo → nome real (sob demanda). */
  private lower: Map<string, string> | null = null;
  /** Nomes de parte OPC não diferenciam maiúsculas (rels apontando `Image1.PNG` para `image1.png`). */
  private caseless(path: string): string {
    if (!this.lower) {
      this.lower = new Map();
      for (const k of this.parts.keys()) if (!this.lower.has(k.toLowerCase())) this.lower.set(k.toLowerCase(), k);
    }
    return this.lower.get(path.toLowerCase()) ?? path;
  }

  presentationXml(): string {
    const xml = this.getPartText('ppt/presentation.xml');
    if (xml === undefined) throw new Error('Pacote sem ppt/presentation.xml');
    return xml;
  }

  /** Resolve o caminho de uma parte alvo a partir de um relacionamento (.rels). */
  resolveRelTarget(fromPart: string, target: string): string {
    if (target.startsWith('/')) return target.slice(1);
    let dir = fromPart.includes('/') ? fromPart.slice(0, fromPart.lastIndexOf('/')) : '';
    // resolve "../" relativos (slides/_rels/slide1.xml.rels -> ../slideLayouts/..)
    let t = target;
    while (t.startsWith('../')) { t = t.slice(3); dir = dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : ''; }
    return dir ? `${dir}/${t}` : t;
  }
}
