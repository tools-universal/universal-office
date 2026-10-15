import { unzipSync, zipSync, type Zippable } from 'fflate';

/**
 * Container OPC (Open Packaging Conventions) de um .xlsx.
 *
 * REGRA DE OURO: round-trip sem perdas. Toda parte do pacote é preservada
 * byte a byte; só substituímos o conteúdo de uma parte quando uma edição
 * a modifica de fato. A ordem das partes no ZIP é preservada — o app de referência não
 * exige isso, mas facilita diffs e detecta regressões nossas.
 */
export class XlsxPackage {
  /** Mapa caminho-no-zip → bytes, na ordem original do arquivo. */
  private parts: Map<string, Uint8Array>;

  private constructor(parts: Map<string, Uint8Array>) {
    this.parts = parts;
  }

  /** Pacote OPC mínimo para workbooks novos. */
  static empty(): XlsxPackage {
    const enc = new TextEncoder();
    const parts = new Map<string, Uint8Array>();
    parts.set('[Content_Types].xml', enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>',
    ));
    parts.set('_rels/.rels', enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
    ));
    parts.set('xl/workbook.xml', enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>' +
      '</workbook>',
    ));
    parts.set('xl/_rels/workbook.xml.rels', enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>',
    ));
    parts.set('xl/worksheets/sheet1.xml', enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>',
    ));
    parts.set('xl/styles.xml', enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
      '</styleSheet>',
    ));
    return new XlsxPackage(parts);
  }

  /** Pacote a partir de partes já montadas em memória (conversor de .xls). */
  static fromParts(parts: Map<string, Uint8Array>): XlsxPackage {
    const pkg = new XlsxPackage(new Map(parts));
    if (!pkg.getPart('xl/workbook.xml')) throw new Error('Pacote sem xl/workbook.xml');
    return pkg;
  }

  static load(bytes: Uint8Array): XlsxPackage {
    let unzipped: ReturnType<typeof unzipSync>;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error('Arquivo não é um pacote OOXML válido (ZIP corrompido ou formato legado .xls/.xlsb)');
    }
    const pkg = new XlsxPackage(new Map(Object.entries(unzipped)));
    if (!pkg.getPart('xl/workbook.xml')) {
      throw new Error('Pacote sem xl/workbook.xml — não é uma pasta de trabalho do app de referência');
    }
    return pkg;
  }

  save(): Uint8Array {
    const zippable: Zippable = {};
    for (const [path, data] of this.parts) zippable[path] = data;
    return zipSync(zippable, { level: 6 });
  }

  partNames(): string[] {
    return [...this.parts.keys()];
  }

  getPart(path: string): Uint8Array | undefined {
    return this.parts.get(path) ?? this.parts.get(this.caseless(path));
  }

  getPartText(path: string): string | undefined {
    const data = this.getPart(path);
    return data === undefined ? undefined : new TextDecoder().decode(data);
  }

  setPart(path: string, data: Uint8Array): void {
    this.parts.set(path, data);
    this.lower = null;
  }

  setPartText(path: string, text: string): void {
    this.setPart(path, new TextEncoder().encode(text));
  }

  /** Remove a parte (nome sem diferenciar maiúsculas). Devolve se existia. */
  deletePart(path: string): boolean {
    const real = this.parts.has(path) ? path : this.caseless(path);
    const had = this.parts.delete(real);
    if (had) this.lower = null;
    return had;
  }

  /** Índice minúsculo → nome real (montado sob demanda). */
  private lower: Map<string, string> | null = null;
  /**
   * Nomes de parte OPC NÃO diferenciam maiúsculas: o Excel abre pacotes com
   * `worksheets/Sheet1.xml` e `_rels/sheet1.xml.rels` (o desenho da aba vem desse rels).
   */
  private caseless(path: string): string {
    if (!this.lower) {
      this.lower = new Map();
      for (const k of this.parts.keys()) if (!this.lower.has(k.toLowerCase())) this.lower.set(k.toLowerCase(), k);
    }
    return this.lower.get(path.toLowerCase()) ?? path;
  }

  /** Conteúdo principal (xl/workbook.xml). */
  workbookXml(): string {
    const xml = this.getPartText('xl/workbook.xml');
    if (xml === undefined) throw new Error('Pacote sem xl/workbook.xml');
    return xml;
  }

  /**
   * Resolve o caminho de uma parte alvo a partir de um relacionamento.
   * Relativos ao diretório do .rels (ex.: workbook.xml.rels está em xl/_rels/,
   * target "worksheets/sheet1.xml" → "xl/worksheets/sheet1.xml").
   */
  resolveRelTarget(fromPart: string, target: string): string {
    if (target.startsWith('/')) return target.slice(1);
    let dir = fromPart.includes('/') ? fromPart.slice(0, fromPart.lastIndexOf('/')) : '';
    let t = target;
    // resolve "../" (ex.: worksheets/_rels/sheet1.xml.rels -> ../comments1.xml = xl/comments1.xml)
    while (t.startsWith('../')) {
      t = t.slice(3);
      dir = dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : '';
    }
    return dir ? `${dir}/${t}` : t;
  }
}
