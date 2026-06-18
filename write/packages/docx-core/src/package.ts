import { unzipSync, zipSync, type Zippable } from 'fflate';

/**
 * Container OPC (Open Packaging Conventions) de um .docx.
 *
 * REGRA DE OURO: round-trip sem perdas. Toda parte do pacote é preservada
 * byte a byte; só substituímos o conteúdo de uma parte quando uma edição
 * a modifica de fato. A ordem das partes no ZIP é preservada — o Word não
 * exige isso, mas facilita diffs e detecta regressões nossas.
 */
export class DocxPackage {
  /** Mapa caminho-no-zip → bytes, na ordem original do arquivo. */
  private parts: Map<string, Uint8Array>;

  private constructor(parts: Map<string, Uint8Array>) {
    this.parts = parts;
  }

  /** Pacote OPC mínimo para documentos novos (writeDocument completa o resto). */
  static empty(): DocxPackage {
    const enc = new TextEncoder();
    const parts = new Map<string, Uint8Array>();
    parts.set('[Content_Types].xml', enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '</Types>',
    ));
    parts.set('_rels/.rels', enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '</Relationships>',
    ));
    parts.set('word/document.xml', enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>',
    ));
    return new DocxPackage(parts);
  }

  static load(bytes: Uint8Array): DocxPackage {
    let unzipped: ReturnType<typeof unzipSync>;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error('Arquivo não é um pacote OOXML válido (ZIP corrompido ou formato legado .doc)');
    }
    const pkg = new DocxPackage(new Map(Object.entries(unzipped)));
    if (!pkg.getPart('word/document.xml')) {
      throw new Error('Pacote sem word/document.xml — não é um documento do Word');
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
    return this.parts.get(path);
  }

  getPartText(path: string): string | undefined {
    const data = this.parts.get(path);
    return data === undefined ? undefined : new TextDecoder().decode(data);
  }

  setPart(path: string, data: Uint8Array): void {
    this.parts.set(path, data);
  }

  setPartText(path: string, text: string): void {
    this.parts.set(path, new TextEncoder().encode(text));
  }

  /** Conteúdo principal (word/document.xml). */
  documentXml(): string {
    const xml = this.getPartText('word/document.xml');
    if (xml === undefined) throw new Error('Pacote sem word/document.xml');
    return xml;
  }
}
