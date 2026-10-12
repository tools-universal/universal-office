import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8, zipSync } from 'fflate';
import {
  isWordBinary, convertDocToDocx, DocFormatError, DocxPackage, readFullDocument, parseXml, type XmlElement,
} from '../src/index.js';
import { readCfb } from '../src/doc/cfb.js';
import { DocReader } from '../src/doc/reader.js';
import { FC } from '../src/doc/fib.js';
import { ByteReader, readRec } from '../src/doc/bytes.js';
import { readSpContainer } from '../src/doc/officeart.js';
import { readFonts } from '../src/doc/fonts.js';
import { buildCfb } from './helpers/cfb-writer.js';
import { buildMiniDoc } from './helpers/doc-writer.js';
// comparação estrutural do lab
import { extractDocx, compareDocx } from '../../../tools/doc-lab/compare.mjs';

// Fixtures SINTÉTICAS: .docx com texto inventado salvos como .doc pelo Word real
// (write/tools/doc-lab/gen-fixtures.mjs) + o .docx que o Word salvou de cada .doc
// (<nome>.word.docx), usado como referência estrutural.
const FIX = join(__dirname, 'fixtures', 'doc');
const load = (name: string): Uint8Array => new Uint8Array(readFileSync(join(FIX, name)));
const FIXTURES = readdirSync(FIX).filter((f) => f.endsWith('.doc')).map((f) => f.replace(/\.doc$/, ''));

// ───────────────────────────── utilidades de XML ─────────────────────────────

function partsOf(docx: Uint8Array): Record<string, string> {
  const z = unzipSync(docx);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(z)) if (k.endsWith('.xml') || k.endsWith('.rels')) out[k] = strFromU8(v);
  return out;
}

function all(el: XmlElement | undefined, name: string, acc: XmlElement[] = []): XmlElement[] {
  if (!el) return acc;
  for (const c of el.children) {
    if (typeof c === 'string') continue;
    if (c.name === name) acc.push(c);
    all(c, name, acc);
  }
  return acc;
}

const first = (el: XmlElement | undefined, name: string): XmlElement | undefined => all(el, name)[0];

/** Texto visível de um parágrafo (w:t, tabs e quebras). */
function text(el: XmlElement): string {
  let s = '';
  for (const c of el.children) {
    if (typeof c === 'string') continue;
    if (c.name === 'w:t') s += c.children.filter((x) => typeof x === 'string').join('');
    else if (c.name === 'w:tab') s += '\t';
    else if (c.name === 'w:br') s += '\n';
    else if (['w:instrText', 'w:delText', 'w:txbxContent', 'w:pPr', 'w:rPr'].includes(c.name)) continue;
    else s += text(c);
  }
  return s;
}

const converted = new Map<string, Uint8Array>();
function convert(name: string): Uint8Array {
  let out = converted.get(name);
  if (!out) { out = convertDocToDocx(load(`${name}.doc`)); converted.set(name, out); }
  return out;
}
function doc(name: string): { root: XmlElement; parts: Record<string, string>; paras: XmlElement[] } {
  const parts = partsOf(convert(name));
  const root = parseXml(parts['word/document.xml']!);
  const body = first(root, 'w:body')!;
  return { root, parts, paras: all(body, 'w:p') };
}
const para = (paras: XmlElement[], starts: string): XmlElement => {
  const p = paras.find((x) => text(x).startsWith(starts));
  if (!p) throw new Error(`parágrafo "${starts}" não encontrado`);
  return p;
};
/** rPr do run que contém o texto. */
function runWith(p: XmlElement, t: string): XmlElement | undefined {
  return all(p, 'w:r').find((r) => text(r).includes(t));
}
const attr = (el: XmlElement | undefined, name: string): string | undefined => el?.attrs[name];

// ───────────────────────────── contêiner e erros ─────────────────────────────

describe('detecção e erros (.doc)', () => {
  it('isWordBinary: Compound File com stream WordDocument', () => {
    expect(isWordBinary(load('caracteres.doc'))).toBe(true);
    expect(isWordBinary(zipSync({ 'a.txt': new Uint8Array([1]) }))).toBe(false);
    expect(isWordBinary(new Uint8Array(16))).toBe(false);
    expect(isWordBinary(buildCfb({ 'PowerPoint Document': new Uint8Array(5000) }))).toBe(false);
  });

  /** Reempacota o .doc trocando bytes do FIB (WordDocument). */
  function withFib(patch: (fib: DataView) => void, extra: Record<string, Uint8Array> = {}): Uint8Array {
    const cfb = readCfb(load('caracteres.doc'));
    const streams: Record<string, Uint8Array> = {};
    for (const e of cfb.entries) if (e.type === 'stream') streams[e.name] = cfb.getStream(e.path)!.slice();
    patch(new DataView(streams.WordDocument!.buffer));
    return buildCfb({ WordDocument: streams.WordDocument!, '1Table': streams['1Table'] ?? streams['0Table']!, ...extra });
  }

  it('mensagens em português: não-.doc, sem WordDocument, criptografado, ofuscado, Word 6/95, corrompido', () => {
    expect(() => convertDocToDocx(new Uint8Array(64))).toThrow(DocFormatError);
    expect(() => convertDocToDocx(new Uint8Array(64))).toThrow(/não é um \.doc/);
    expect(() => convertDocToDocx(buildCfb({ 'PowerPoint Document': new Uint8Array(5000) }))).toThrow(/WordDocument/);
    // FibBase.fEncrypted (0x0100) / fObfuscated (0x8000)
    expect(() => convertDocToDocx(withFib((v) => v.setUint16(0x0a, v.getUint16(0x0a, true) | 0x0100, true)))).toThrow(/criptografado/);
    expect(() => convertDocToDocx(withFib((v) => v.setUint16(0x0a, v.getUint16(0x0a, true) | 0x8100, true)))).toThrow(/ofuscação/);
    // nFib do Word 6 (0x65) e FIB sem nFibNew
    expect(() => convertDocToDocx(withFib((v) => v.setUint16(2, 0x0065, true)))).toThrow(/anterior ao Word 97/);
    // criptografia "nova" (EncryptionInfo no contêiner)
    expect(() => convertDocToDocx(withFib(() => {}, { EncryptionInfo: new Uint8Array(100) }))).toThrow(/senha/);
    // FIB truncado / assinatura inválida
    expect(() => convertDocToDocx(buildCfb({ WordDocument: new Uint8Array(40), '1Table': new Uint8Array(10) }))).toThrow(/corrompido/);
    expect(() => convertDocToDocx(withFib((v) => v.setUint16(0, 0x1234, true)))).toThrow(/corrompido/);
  });

  it('reempacotar o mesmo .doc (streams essenciais) converte igual', () => {
    const repacked = withFib(() => {});
    const a = partsOf(convertDocToDocx(repacked))['word/document.xml'];
    const b = partsOf(convert('caracteres'))['word/document.xml'];
    expect(a).toBe(b);
  });

  it('bytes corrompidos: só DocFormatError (ou um .docx legível), nunca outra exceção', () => {
    const base = load('tabelas.doc');
    let seed = 12345;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let k = 0; k < 40; k++) {
      const b = base.slice();
      for (let j = 0; j < 30; j++) b[512 + Math.floor(rnd() * (b.length - 512))] = Math.floor(rnd() * 256);
      try {
        const out = convertDocToDocx(b);
        readFullDocument(DocxPackage.load(out));
      } catch (e) {
        expect(e).toBeInstanceOf(DocFormatError);
      }
    }
  });
});

// ───────────────────────────── contra o .docx do Word ─────────────────────────────

describe('conversão × .docx salvo pelo Word (estrutura)', () => {
  // únicas diferenças aceitas: a grade (tblGrid) de tabelas com ajuste automático,
  // que o Word recalcula pelo conteúdo ao salvar
  const ACEITAS = new Set(['tabelas.grade']);
  for (const name of FIXTURES) {
    it(`${name}: abre no docx-core e bate com o Word`, () => {
      const out = convert(name);
      const full = readFullDocument(DocxPackage.load(out));
      expect(full.blocks.length).toBeGreaterThan(0);
      const res = compareDocx(extractDocx(out, parseXml), extractDocx(load(`${name}.word.docx`), parseXml));
      const cats = Object.keys(res.cats).filter((c) => !ACEITAS.has(c));
      expect(cats, res.details.join('\n')).toEqual([]);
      expect(res.paras.ours).toBe(res.paras.word);
    });
  }
});

// ───────────────────────────── recursos específicos ─────────────────────────────

describe('texto e caracteres', () => {
  it('formatação de caractere (CHPX → w:rPr)', () => {
    const { paras } = doc('caracteres');
    const p1 = para(paras, 'Negrito');
    expect(first(runWith(p1, 'Negrito'), 'w:b')).toBeDefined();
    expect(first(runWith(p1, 'itálico'), 'w:i')).toBeDefined();
    expect(attr(first(runWith(p1, 'sublinhado'), 'w:u'), 'w:val')).toBe('single');
    expect(attr(first(runWith(p1, 'duplo'), 'w:u'), 'w:val')).toBe('double');
    expect(attr(first(runWith(p1, 'pontilhado'), 'w:u'), 'w:val')).toBe('dotted');
    expect(attr(first(runWith(p1, 'ondulado'), 'w:u'), 'w:val')).toBe('wave');
    expect(attr(first(runWith(p1, 'palavras'), 'w:u'), 'w:val')).toBe('words');
    expect(first(runWith(p1, ' tachado'), 'w:strike')).toBeDefined();
    expect(first(runWith(p1, 'tachado duplo'), 'w:dstrike')).toBeDefined();
    const p2 = para(paras, 'Maiúsculas');
    expect(first(runWith(p2, 'Maiúsculas'), 'w:caps')).toBeDefined();
    expect(first(runWith(p2, 'Versalete'), 'w:smallCaps')).toBeDefined();
    expect(first(runWith(p2, 'oculto'), 'w:vanish')).toBeDefined();
    expect(attr(first(runWith(p2, 'sobrescrito'), 'w:vertAlign'), 'w:val')).toBe('superscript');
    expect(attr(first(runWith(p2, 'subscrito'), 'w:vertAlign'), 'w:val')).toBe('subscript');
    const p3 = para(paras, 'Oito pontos');
    expect(attr(first(runWith(p3, 'Oito'), 'w:sz'), 'w:val')).toBe('16');
    expect(attr(first(runWith(p3, 'quatorze'), 'w:sz'), 'w:val')).toBe('28');
    expect(attr(first(runWith(p3, 'vermelho'), 'w:color'), 'w:val')).toBe('FF0000');
    expect(attr(first(runWith(p3, 'azul escuro'), 'w:color'), 'w:val')).toBe('1F4E79');
    expect(attr(first(runWith(p3, 'realçado'), 'w:highlight'), 'w:val')).toBe('yellow');
    expect(attr(first(runWith(p3, 'expandido'), 'w:spacing'), 'w:val')).toBe('40');
    expect(attr(first(runWith(p3, 'elevado'), 'w:position'), 'w:val')).toBe('6');
    expect(attr(first(runWith(p3, 'kerning'), 'w:kern'), 'w:val')).toBe('28');
    const p4 = para(paras, 'Arial');
    expect(attr(first(runWith(p4, 'Arial'), 'w:rFonts'), 'w:ascii')).toBe('Arial');
    expect(attr(first(runWith(p4, 'Times New Roman'), 'w:rFonts'), 'w:hAnsi')).toBe('Times New Roman');
    const sym = first(p4, 'w:sym');
    expect(attr(sym, 'w:font')).toBe('Symbol');
    expect(attr(sym, 'w:char')).toBe('F0E3');
    expect(attr(first(runWith(p4, 'inglês'), 'w:lang'), 'w:val')).toBe('en-US');
  });

  it('caracteres especiais, cp1252 e Unicode', () => {
    const { paras } = doc('caracteres');
    const p5 = para(paras, 'Tab:');
    expect(text(p5)).toBe('Tab:\tdepois do tab\nquebra de linha; espaço\u00a0rígido; hífenincondicional; hífenopcional.');
    expect(first(p5, 'w:noBreakHyphen')).toBeDefined();
    expect(first(p5, 'w:softHyphen')).toBeDefined();
    expect(text(para(paras, 'Pontuação'))).toBe('Pontuação: – — “aspas” ‘simples’ … • € ™ Œ œ Š š Ÿ ƒ ‰ ‹ › † ‡ ˆ ˜ ¶ § © ® °');
    expect(text(para(paras, 'Outras'))).toBe('Outras escritas: Ελληνικά, Русский, 汉字.');
    const brk = para(paras, 'Antes da quebra');
    expect(all(brk, 'w:br').some((b) => b.attrs['w:type'] === 'page')).toBe(true);
  });

  it('peças comprimidas (cp1252 com o mapeamento 0x80-0x9F), FKPs e Word 97 mínimo', () => {
    // o Word moderno grava UTF-16: um .doc mínimo montado à mão exercita a peça comprimida
    const bytes = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
    const mini = buildMiniDoc([
      { bytes: [...bytes('Ol'), 0xe1, ...bytes(' '), 0x93, ...bytes('mundo'), 0x94, ...bytes(' '), 0x96, ...bytes(' '), 0x85, 0x95, 0x99, 0x8c, 0x9f, 0x8a, 0x9a],
        chpx: [0x35, 0x08, 0x01], papx: [0x03, 0x24, 0x01, 0x61, 0x24, 0x01] },
      { bytes: bytes('segundo') },
    ]);
    const r = new DocReader(mini);
    expect(r.pieces.every((p) => p.compressed)).toBe(true);
    const out = convertDocToDocx(mini);
    const ps = all(first(parseXml(partsOf(out)['word/document.xml']!), 'w:body'), 'w:p');
    expect(ps.map(text)).toEqual(['Olá “mundo” – …•™ŒŸŠš', 'segundo']);
    expect(first(first(ps[0], 'w:r'), 'w:b')).toBeDefined();
    expect(attr(first(ps[0], 'w:jc'), 'w:val')).toBe('center');
    expect(first(ps[1], 'w:pPr')).toBeUndefined();
    // Word 97 (nFib 0xC1, sem Copts no DOP): ainda assim modo de compatibilidade 11
    expect(partsOf(out)['word/settings.xml']).toContain('w:val="11"');
    readFullDocument(DocxPackage.load(out));
    // a fixture cp1252 (gravada pelo Word real) também usa peça comprimida
    expect(new DocReader(load('cp1252.doc')).pieces.some((p) => p.compressed)).toBe(true);
    const { paras } = doc('cp1252');
    expect(text(paras[0]!)).toBe('Acentuação: ação, coração, pão, avó, você, à, ü.');
    expect(text(paras[1]!)).toBe('Pontuação cp1252: – — “duplas” ‘simples’ „baixas‚ … • † ‡ ‰ ‹ › ™ ƒ ˆ ˜ Š š Œ œ Ÿ.');
  });

  it('marcas de revisão viram w:ins / w:del com autor (SttbfRMark)', () => {
    // as fixtures são geradas sem dados pessoais: o Word grava o autor como "Autor"
    const { paras } = doc('caracteres');
    const p = para(paras, 'Revisão');
    const ins = first(p, 'w:ins');
    const del = first(p, 'w:del');
    expect(attr(ins, 'w:author')).toBe('Autor');
    expect(text(ins!)).toBe('texto inserido');
    expect(attr(del, 'w:author')).toBe('Autor');
    expect(all(del, 'w:delText').map((d) => d.children.join('')).join('')).toBe('texto removido');
    expect(new DocReader(load('caracteres.doc')).revisionAuthors()).toContain('Autor');
  });
});

describe('parágrafos', () => {
  it('alinhamento, recuos, espaçamento, quebras de página, bordas, sombreamento', () => {
    const { paras } = doc('paragrafos');
    const ppr = (s: string): XmlElement => first(para(paras, s), 'w:pPr')!;
    expect(attr(first(ppr('Centralizado'), 'w:jc'), 'w:val')).toBe('center');
    expect(attr(first(ppr('À direita'), 'w:jc'), 'w:val')).toBe('right');
    expect(attr(first(ppr('Justificado'), 'w:jc'), 'w:val')).toBe('both');
    const ind = first(ppr('Recuos esquerdo'), 'w:ind')!;
    expect([ind.attrs['w:left'], ind.attrs['w:right'], ind.attrs['w:firstLine']]).toEqual(['1134', '567', '567']);
    const hang = first(ppr('Recuo deslocado'), 'w:ind')!;
    expect([hang.attrs['w:left'], hang.attrs['w:hanging']]).toEqual(['1134', '567']);
    const sp = first(ppr('Espaçamento antes'), 'w:spacing')!;
    expect([sp.attrs['w:before'], sp.attrs['w:after'], sp.attrs['w:line'], sp.attrs['w:lineRule']]).toEqual(['240', '120', '360', 'auto']);
    expect(first(ppr('Entrelinhas exatamente'), 'w:spacing')!.attrs).toMatchObject({ 'w:line': '300', 'w:lineRule': 'exact' });
    expect(first(ppr('Entrelinhas pelo menos'), 'w:spacing')!.attrs).toMatchObject({ 'w:line': '400', 'w:lineRule': 'atLeast' });
    const keep = ppr('Manter com');
    expect(first(keep, 'w:keepNext')).toBeDefined();
    expect(first(keep, 'w:keepLines')).toBeDefined();
    expect(attr(first(keep, 'w:widowControl'), 'w:val')).toBe('0');
    const bdr = first(ppr('Com bordas'), 'w:pBdr')!;
    expect(first(bdr, 'w:top')!.attrs).toMatchObject({ 'w:val': 'single', 'w:sz': '12', 'w:color': 'FF0000' });
    expect(attr(first(bdr, 'w:left'), 'w:val')).toBe('double');
    expect(first(bdr, 'w:bottom')!.attrs).toMatchObject({ 'w:val': 'dotted', 'w:sz': '8', 'w:color': '0000FF' });
    expect(attr(first(ppr('Com bordas'), 'w:shd'), 'w:fill')).toBe('D9D9D9');
    expect(first(ppr('Espaçamento contextual 1'), 'w:contextualSpacing')).toBeDefined();
    expect(attr(first(ppr('Parágrafo com nível'), 'w:outlineLvl'), 'w:val')).toBe('1');
    expect(first(ppr('Quebra de página antes'), 'w:pageBreakBefore')).toBeDefined();
    const frame = first(ppr('Capitular'), 'w:framePr')!;
    expect(frame.attrs).toMatchObject({ 'w:dropCap': 'drop', 'w:lines': '3' });
  });

  it('tabulações com alinhamento e preenchimento', () => {
    const { paras } = doc('paragrafos');
    const tabs = all(first(para(paras, 'A\t'), 'w:tabs'), 'w:tab').map((t) => `${t.attrs['w:val']}:${t.attrs['w:pos']}:${t.attrs['w:leader'] ?? ''}`);
    // na ordem gravada no .doc (o Word não reordena)
    expect(tabs).toEqual(['left:1440:', 'center:4320:dot', 'right:6480:hyphen', 'decimal:8000:underscore', 'bar:2880:']);
  });
});

describe('estilos', () => {
  it('STSH → styles.xml: nomes internos em inglês, basedOn/next, delta próprio, docDefaults', () => {
    const { parts, paras } = doc('estilos');
    const styles = parseXml(parts['word/styles.xml']!);
    const byId = new Map(all(styles, 'w:style').map((s) => [s.attrs['w:styleId']!, s]));
    const h1 = byId.get('Heading1')!;
    expect(attr(first(h1, 'w:name'), 'w:val')).toBe('heading 1');
    expect(attr(first(h1, 'w:basedOn'), 'w:val')).toBe('Normal');
    expect(attr(first(h1, 'w:next'), 'w:val')).toBe('Normal');
    expect(first(first(h1, 'w:rPr'), 'w:b')).toBeDefined();
    expect(attr(first(h1, 'w:outlineLvl'), 'w:val')).toBe('0');
    const h2 = byId.get('Heading2')!;
    expect(attr(first(h2, 'w:basedOn'), 'w:val')).toBe('Heading1');
    expect(first(first(h2, 'w:rPr'), 'w:i')).toBeDefined();
    expect(byId.get('Normal')!.attrs['w:default']).toBe('1');
    expect(attr(first(byId.get('TableNormal'), 'w:name'), 'w:val')).toBe('Normal Table');
    expect(byId.get('Title')).toBeDefined();
    // estilos do usuário: nome preservado, styleId derivado do nome
    const dest = byId.get('Destaque')!;
    expect(dest.attrs['w:customStyle']).toBe('1');
    expect(attr(first(dest, 'w:color'), 'w:val')).toBe('C00000');
    expect(first(dest, 'w:ind')!.attrs['w:left']).toBe('567');
    const filho = byId.get('DestaqueFilho')!;
    expect(attr(first(filho, 'w:basedOn'), 'w:val')).toBe('Destaque');
    expect(attr(first(filho, 'w:b'), 'w:val')).toBe('0');
    expect(first(filho, 'w:i')).toBeDefined();
    const cod = [...byId.values()].find((s) => attr(first(s, 'w:name'), 'w:val') === 'Código')!;
    expect(cod.attrs['w:type']).toBe('character');
    const tab = [...byId.values()].find((s) => attr(first(s, 'w:name'), 'w:val') === 'Tabela Teste')!;
    expect(tab.attrs['w:type']).toBe('table');
    expect(attr(first(first(tab, 'w:tblBorders'), 'w:top'), 'w:color')).toBe('0070C0');
    // docDefaults: fontes padrão do Stshif
    expect(attr(first(first(styles, 'w:docDefaults'), 'w:rFonts'), 'w:ascii')).toBe('Calibri');
    // uso nos parágrafos
    expect(attr(first(para(paras, 'Primeiro título'), 'w:pStyle'), 'w:val')).toBe('Heading1');
    expect(attr(first(runWith(para(paras, 'Corpo normal'), 'estilo de caractere'), 'w:rStyle'), 'w:val')).toBe(cod.attrs['w:styleId']);
    const direto = para(paras, 'Destaque com formatação direta');
    expect(attr(first(direto, 'w:pStyle'), 'w:val')).toBe('Destaque');
    expect(attr(first(first(direto, 'w:pPr'), 'w:jc'), 'w:val')).toBe('right');
    expect(attr(first(runWith(direto, 'Destaque'), 'w:sz'), 'w:val')).toBe('20');
    // o .doc não guarda o vínculo da tabela com o estilo (sprmTIstd = Normal Table):
    // as bordas do estilo vêm como formatação direta, como no .docx do Word
    const tbl = first(doc('estilos').root, 'w:tbl')!;
    expect(first(tbl, 'w:tblStyle')).toBeUndefined();
    expect(attr(first(first(tbl, 'w:tblBorders'), 'w:top'), 'w:color')).toBe('0070C0');
  });
});

describe('listas', () => {
  it('PlfLst/PlfLfo → numbering.xml completo', () => {
    const { parts, paras } = doc('listas');
    const num = parseXml(parts['word/numbering.xml']!);
    const abs = all(num, 'w:abstractNum');
    expect(abs.length).toBe(3);
    const lvl = (a: XmlElement, i: number): XmlElement => all(a, 'w:lvl').find((l) => l.attrs['w:ilvl'] === String(i))!;
    const val = (el: XmlElement | undefined, n: string): string | undefined => attr(first(el, n), 'w:val');
    // marcadores: caractere + fonte do marcador
    const bullets = abs.find((a) => val(a, 'w:multiLevelType') === 'hybridMultilevel')!;
    expect(val(lvl(bullets, 0), 'w:numFmt')).toBe('bullet');
    expect(val(lvl(bullets, 0), 'w:lvlText')).toBe('');
    expect(attr(first(lvl(bullets, 0), 'w:rFonts'), 'w:ascii')).toBe('Symbol');
    expect(val(lvl(bullets, 1), 'w:lvlText')).toBe('o');
    expect(attr(first(lvl(bullets, 2), 'w:rFonts'), 'w:ascii')).toBe('Wingdings');
    // multinível: placeholders, formatos, sufixos, recuos
    const multi = abs.find((a) => val(lvl(a, 1), 'w:lvlText') === '%1.%2.')!;
    expect(val(lvl(multi, 0), 'w:lvlText')).toBe('%1.');
    expect(val(lvl(multi, 2), 'w:numFmt')).toBe('lowerLetter');
    expect(val(lvl(multi, 2), 'w:lvlText')).toBe('%3)');
    expect(val(lvl(multi, 2), 'w:suff')).toBe('space');
    expect(val(lvl(multi, 3), 'w:suff')).toBe('nothing');
    expect(first(lvl(multi, 1), 'w:ind')!.attrs).toMatchObject({ 'w:left': '792', 'w:hanging': '360' });
    // capítulos: texto literal + isLgl
    const cap = abs.find((a) => val(lvl(a, 0), 'w:numFmt') === 'upperRoman')!;
    expect(val(lvl(cap, 0), 'w:lvlText')).toBe('Capítulo %1');
    expect(first(lvl(cap, 1), 'w:isLgl')).toBeDefined();
    // w:num = LFO (numId = ilfo) com reinício em 5
    const nums = all(num, 'w:num');
    expect(nums.length).toBe(4);
    const restart = nums.find((n) => first(n, 'w:startOverride'))!;
    expect(val(restart, 'w:startOverride')).toBe('5');
    // parágrafos
    const numPr = (s: string): string => {
      const np = first(para(paras, s), 'w:numPr')!;
      return `${val(np, 'w:ilvl')}/${val(np, 'w:numId')}`;
    };
    expect(numPr('marcador nível 2')).toMatch(/^1\//);
    expect(numPr('item com letra')).toMatch(/^2\//);
    expect(numPr('item cinco').split('/')[1]).toBe(restart.attrs['w:numId']);
    // recuo da lista não vira formatação direta; o recuo gravado depois do ilfo, sim
    expect(first(first(para(paras, 'item um ponto um'), 'w:pPr'), 'w:ind')).toBeUndefined();
    expect(first(para(paras, 'Item com recuo próprio'), 'w:ind')!.attrs).toMatchObject({ 'w:left': '1080', 'w:hanging': '720' });
  });
});

describe('tabelas', () => {
  it('estrutura, bordas, sombreamento, mesclas, alturas, cabeçalho, aninhamento', () => {
    const { root } = doc('tabelas');
    const body = first(root, 'w:body')!;
    const tbls = body.children.filter((c): c is XmlElement => typeof c !== 'string' && c.name === 'w:tbl');
    expect(tbls.length).toBe(3);
    const [t1, t2, t3] = tbls as [XmlElement, XmlElement, XmlElement];
    const rows = all(t1, 'w:tr');
    expect(rows.length).toBe(4);
    expect(first(rows[0], 'w:tblHeader')).toBeDefined();
    expect(first(rows[0], 'w:trHeight')!.attrs).toMatchObject({ 'w:val': '400', 'w:hRule': 'exact' });
    expect(attr(first(rows[1], 'w:trHeight'), 'w:val')).toBe('600');
    expect(first(rows[2], 'w:cantSplit')).toBeDefined();
    expect(attr(first(all(rows[0], 'w:tc')[0], 'w:shd'), 'w:fill')).toBe('BDD7EE');
    const r1 = all(rows[1], 'w:tc');
    expect(r1.length).toBe(2);
    expect(attr(first(r1[0], 'w:gridSpan'), 'w:val')).toBe('2');
    expect(attr(first(r1[0], 'w:vAlign'), 'w:val')).toBe('center');
    expect(attr(first(r1[1], 'w:vMerge'), 'w:val')).toBe('restart');
    expect(first(all(rows[2], 'w:tc')[2], 'w:vMerge')!.attrs['w:val']).toBeUndefined();
    expect(all(t1, 'w:gridCol').map((g) => g.attrs['w:w'])).toEqual(['3000', '3000', '3000']);
    expect(attr(first(first(t1, 'w:tblBorders'), 'w:insideV'), 'w:val')).toBe('single');
    // centralizada, largura em %, bordas da célula
    expect(attr(first(first(t2, 'w:tblPr'), 'w:jc'), 'w:val')).toBe('center');
    expect(first(t2, 'w:tblW')!.attrs).toMatchObject({ 'w:w': '3000', 'w:type': 'pct' });
    const cellB = first(all(t2, 'w:tc')[0], 'w:tcBorders')!;
    expect(first(cellB, 'w:top')!.attrs).toMatchObject({ 'w:sz': '18', 'w:color': 'FF0000' });
    expect(attr(first(cellB, 'w:bottom'), 'w:val')).toBe('double');
    // recuo, margens de célula e tabela aninhada
    expect(attr(first(t3, 'w:tblInd'), 'w:w')).toBe('720');
    expect(attr(first(first(t3, 'w:tblCellMar'), 'w:left'), 'w:w')).toBe('170');
    const nested = first(all(t3, 'w:tc')[1], 'w:tbl')!;
    expect(all(nested, 'w:tr').length).toBe(2);
    expect(all(nested, 'w:tc').map((c) => text(c))).toEqual(['int 1', 'int 2', 'int 3', 'int 4']);
    const cellParas = all(all(t3, 'w:tc')[1], 'w:p').filter((p) => !all(nested, 'w:p').includes(p)).map((p) => text(p));
    expect(cellParas).toEqual(['antes da aninhada', 'depois da aninhada']);
    // o modelo do docx-core enxerga as tabelas
    const full = readFullDocument(DocxPackage.load(convert('tabelas')));
    expect(full.blocks.filter((b) => b.type === 'table').length).toBe(3);
  });
});

describe('seções, cabeçalhos e rodapés', () => {
  it('PlcfSed/SEPX → sectPr; PlcfHdd → partes de cabeçalho/rodapé com herança', () => {
    const { root, parts } = doc('secoes');
    const sects = all(root, 'w:sectPr');
    expect(sects.length).toBe(3);
    const [s1, s2, s3] = sects as [XmlElement, XmlElement, XmlElement];
    expect(first(s1, 'w:pgSz')!.attrs).toMatchObject({ 'w:w': '11906', 'w:h': '16838' });
    expect(first(s1, 'w:pgMar')!.attrs).toMatchObject({ 'w:top': '1134', 'w:right': '1134', 'w:bottom': '1418', 'w:left': '1701', 'w:header': '567', 'w:footer': '510' });
    expect(all(s1, 'w:headerReference').map((h) => h.attrs['w:type'])).toEqual(['default']);
    expect(all(s1, 'w:footerReference').map((h) => h.attrs['w:type'])).toEqual(['default']);
    expect(first(s2, 'w:pgSz')!.attrs).toMatchObject({ 'w:w': '15840', 'w:h': '12240', 'w:orient': 'landscape' });
    expect(first(s2, 'w:cols')!.attrs).toMatchObject({ 'w:num': '2', 'w:space': '720', 'w:sep': '1' });
    expect(all(s2, 'w:headerReference').length).toBe(0); // herda da seção anterior
    expect(attr(first(s3, 'w:type'), 'w:val')).toBe('oddPage');
    expect(first(s3, 'w:titlePg')).toBeDefined();
    expect(first(s3, 'w:pgNumType')!.attrs).toMatchObject({ 'w:fmt': 'lowerRoman', 'w:start': '1' });
    expect(all(s3, 'w:headerReference').map((h) => h.attrs['w:type']).sort()).toEqual(['default', 'even', 'first']);
    expect(parts['word/settings.xml']).toContain('<w:evenAndOddHeaders/>');
    const rels = parseXml(parts['word/_rels/document.xml.rels']!);
    const target = (rid: string): string => all(rels, 'Relationship').find((r) => r.attrs.Id === rid)!.attrs.Target!;
    const hdrText = (ref: XmlElement): string => all(parseXml(parts[`word/${target(ref.attrs['r:id']!)}`]!), 'w:p').map(text).join('|');
    const byType = Object.fromEntries(all(s3, 'w:headerReference').map((h) => [h.attrs['w:type'], hdrText(h)]));
    expect(byType).toEqual({ default: 'Seção 3 — páginas ímpares', first: 'Seção 3 — primeira página', even: 'Seção 3 — páginas pares' });
    // rodapé com campo PAGE
    const ftr = parts[`word/${target(first(s1, 'w:footerReference')!.attrs['r:id']!)}`]!;
    expect(ftr).toContain('<w:instrText xml:space="preserve"> PAGE </w:instrText>');
    expect(hdrText(first(s1, 'w:headerReference')!)).toBe('Cabeçalho da seção 1');
    // o docx-core lê as 3 seções
    const full = readFullDocument(DocxPackage.load(convert('secoes')));
    expect(full.sections.length).toBe(3);
  });
});

describe('notas, campos, marcadores e comentários', () => {
  it('notas de rodapé/fim (automáticas e marca própria)', () => {
    const { parts, paras } = doc('notas-campos');
    const p = para(paras, 'Texto com nota');
    const refs = all(p, 'w:footnoteReference');
    expect(refs.map((r) => r.attrs['w:id'])).toEqual(['1', '2', '3']);
    expect(refs[2]!.attrs['w:customMarkFollows']).toBe('1');
    expect(first(p, 'w:endnoteReference')).toBeDefined();
    const fn = parseXml(parts['word/footnotes.xml']!);
    const notes = all(fn, 'w:footnote').filter((n) => !n.attrs['w:type']);
    expect(notes.map((n) => all(n, 'w:p').map(text).join('|'))).toEqual([' Primeira nota de rodapé.', ' Segunda nota, com negrito.', '* Nota com marca personalizada.']);
    expect(first(notes[0], 'w:footnoteRef')).toBeDefined();
    const en = parseXml(parts['word/endnotes.xml']!);
    expect(all(en, 'w:endnote').filter((n) => !n.attrs['w:type']).map((n) => text(first(n, 'w:p')!))).toEqual([' Nota de fim.']);
  });

  it('campos (0x13/0x14/0x15 → fldChar/instrText) com resultado, aninhados', () => {
    const { paras } = doc('notas-campos');
    const instr = (p: XmlElement): string[] => all(p, 'w:instrText').map((i) => i.children.join('').trim());
    const p = para(paras, 'Página');
    expect(instr(p)).toEqual(['PAGE', 'NUMPAGES', 'DATE \\@ "dd/MM/yyyy"']);
    // DATE é atualizado pelo Word ao salvar: o resultado gravado é a data do salvamento
    expect(text(p)).toMatch(/^Página 1 de 1; data \d\d\/\d\d\/\d{4}\.$/);
    expect(all(p, 'w:fldChar').map((f) => f.attrs['w:fldCharType'])).toEqual(['begin', 'separate', 'end', 'begin', 'separate', 'end', 'begin', 'separate', 'end']);
    // HYPERLINK simples vira w:hyperlink (relação externa), como o Word grava
    const link = para(paras, 'Link');
    expect(instr(link)).toEqual([]);
    const h = first(link, 'w:hyperlink')!;
    expect(text(h)).toBe('exemplo');
    const rels = parseXml(doc('notas-campos').parts['word/_rels/document.xml.rels']!);
    const rel = all(rels, 'Relationship').find((r) => r.attrs.Id === h.attrs['r:id'])!;
    expect(rel.attrs).toMatchObject({ Target: 'https://exemplo.invalid/pagina', TargetMode: 'External' });
    // o docx-core enxerga o link
    const full = readFullDocument(DocxPackage.load(convert('notas-campos')));
    const runs = full.blocks.flatMap((b) => (b.type === 'paragraph' ? b.paragraph.runs : []));
    expect(runs.some((r) => r.props.link === 'https://exemplo.invalid/pagina')).toBe(true);
    // resultado do campo aninhado dentro da instrução do IF é instrução também
    const nested = para(paras, 'Campo aninhado');
    expect(instr(nested)).toEqual(['IF', 'PAGE', '1', '= 1 "primeira" "outra"']);
    expect(text(nested)).toBe('Campo aninhado: primeira.');
  });

  it('marcadores e comentários', () => {
    const { parts, paras } = doc('notas-campos');
    const p = para(paras, 'Texto marcado');
    const bk = first(p, 'w:bookmarkStart')!;
    expect(bk.attrs['w:name']).toBe('marcador_teste');
    expect(all(p, 'w:bookmarkEnd').some((e) => e.attrs['w:id'] === bk.attrs['w:id'])).toBe(true);
    const c = para(paras, 'Trecho comentado');
    expect(first(c, 'w:commentRangeStart')).toBeDefined();
    expect(first(c, 'w:commentRangeEnd')).toBeDefined();
    expect(first(c, 'w:commentReference')).toBeDefined();
    const com = parseXml(parts['word/comments.xml']!);
    const cm = first(com, 'w:comment')!;
    // autor/iniciais anonimizados na geração (sem dados pessoais nas fixtures)
    expect(cm.attrs['w:author']).toBe('Autor');
    expect(cm.attrs['w:initials']).toBe('A');
    expect(all(cm, 'w:p').map(text).join('')).toBe('Comentário de exemplo.');
  });
});

describe('imagens e desenhos', () => {
  it('imagens em linha (PICF + BLIP), recorte, mídia no pacote', () => {
    const out = convert('imagens');
    const z = unzipSync(out);
    const media = Object.keys(z).filter((k) => k.startsWith('word/media/'));
    expect(media.length).toBe(2); // mesmas imagens deduplicadas
    for (const m of media) expect([...z[m]!.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const { paras, parts } = doc('imagens');
    const ext = (s: string): number[] => {
      const e = first(first(para(paras, s), 'wp:inline'), 'wp:extent')!;
      return [Math.round(Number(e.attrs.cx) / 36000), Math.round(Number(e.attrs.cy) / 36000)]; // mm
    };
    expect(ext('Imagem em linha')).toEqual([40, 20]);
    expect(ext('Mesma imagem')).toEqual([20, 10]);
    expect(ext('Imagem recortada')).toEqual([15, 15]);
    // corte 16.16 (6554/65536) → 1/1000 de %: 10001
    const crop = first(para(paras, 'Imagem recortada'), 'a:srcRect')!;
    expect(Math.abs(Number(crop.attrs.l) - 10000)).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(crop.attrs.t) - 20000)).toBeLessThanOrEqual(1);
    expect(Math.abs(Number(crop.attrs.r) - 10000)).toBeLessThanOrEqual(1);
    expect(crop.attrs.b).toBeUndefined();
    expect(parts['[Content_Types].xml']).toContain('Extension="png"');
  });

  it('formas flutuantes (FSPA + OfficeArt): imagem com quebra, atrás do texto, caixa de texto, elipse, linha horizontal', () => {
    const { paras } = doc('imagens');
    const a1 = first(para(paras, 'Imagem flutuante'), 'wp:anchor')!;
    expect(first(a1, 'wp:wrapSquare')).toBeDefined();
    expect(Math.round(Number(first(first(a1, 'wp:positionH'), 'wp:posOffset')!.children[0]) / 36000)).toBe(20);
    expect(Math.round(Number(first(first(a1, 'wp:positionV'), 'wp:posOffset')!.children[0]) / 36000)).toBe(10);
    expect(first(a1, 'pic:pic')).toBeDefined();
    const a2 = first(para(paras, 'Imagem atrás'), 'wp:anchor')!;
    expect(a2.attrs.behindDoc).toBe('1');
    const a3 = first(para(paras, 'Parágrafo com caixa'), 'wp:anchor')!;
    const tx = first(a3, 'w:txbxContent')!;
    expect(all(tx, 'w:p').map(text)).toEqual(['Caixa de texto', 'segunda linha da caixa']);
    expect(attr(first(first(a3, 'wps:spPr'), 'a:srgbClr'), 'val')).toBe('FFF2CC');
    const a4 = first(para(paras, 'Elipse'), 'wp:anchor')!;
    expect(attr(first(a4, 'a:prstGeom'), 'prst')).toBe('ellipse');
    expect(first(a4, 'wp:wrapTopAndBottom')).toBeDefined();
    const hr = first(paras.find((p) => first(p, 'v:rect'))!, 'v:rect')!;
    expect(hr.attrs['o:hr']).toBe('t');
  });
});

// Regressões (formas OfficeArt): cada classe tem a fixture "formas"
// (gerada pelo Word) e, quando o Word atual não grava mais aquele arranjo de
// bytes, uma variação sintética dela.
describe('formas OfficeArt (regressões)', () => {
  /** Formas VML do .docx do Word, na ordem do documento. */
  function wordVml(xml: string): Record<string, string>[] {
    const out: Record<string, string>[] = [];
    for (const m of xml.matchAll(/<v:(shape|rect|roundrect|oval|line)\s([^>]*?)\/?>/g)) {
      if (!/z-index:/.test(m[2]!)) continue;
      const a: Record<string, string> = { kind: m[1]! };
      for (const x of m[2]!.matchAll(/([\w:]+)="([^"]*)"/g)) a[x[1]!] = x[2]!;
      out.push(a);
    }
    return out;
  }
  const zIndex = (v: Record<string, string>): number => Number(/z-index:(-?\d+)/.exec(v.style ?? '')![1]);
  const anchors = (xml: string): XmlElement[] => all(parseXml(xml), 'wp:anchor');
  const ref = partsOf(load('formas.word.docx'));

  it('caixa sem preenchimento e sem linha (booleanos 0x1BF/0x1FF)', () => {
    const { parts } = doc('formas');
    const box = anchors(parts['word/header1.xml']!).find((a) => text(first(a, 'w:txbxContent')!).startsWith('Rótulo'))!;
    const spPr = first(box, 'wps:spPr')!;
    expect(spPr.children.some((c) => typeof c !== 'string' && c.name === 'a:noFill')).toBe(true);
    expect(first(first(spPr, 'a:ln'), 'a:noFill')).toBeDefined();
    const w = wordVml(ref['word/header1.xml']!).find((v) => v.type === '#_x0000_t202')!;
    expect([w.filled, w.stroked]).toEqual(['f', 'f']);
  });

  it('FOPT + TertiaryFOPT da mesma forma: booleanos somados bit a bit (não sobrescritos)', () => {
    // SpContainer sintético: FOPT com fUsefFilled=1/fFilled=0 e fUsefLine=1/fLine=0;
    // TertiaryFOPT com OUTROS bits dos mesmos conjuntos (como em .doc reais)
    const rec = (verInst: number, type: number, body: number[]): number[] => {
      const len = body.length;
      return [verInst & 0xff, verInst >> 8, type & 0xff, type >> 8, len & 0xff, (len >> 8) & 0xff, 0, 0, ...body];
    };
    const u32 = (v: number): number[] => [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff];
    const opt = (id: number, v: number): number[] => [id & 0xff, id >> 8, ...u32(v)];
    const fsp = rec(0x0002 | (202 << 4), 0xf00a, [...u32(1025), ...u32(0xa00)]);
    const fopt = rec(0x0003 | (2 << 4), 0xf00b, [...opt(0x1bf, 0x00100000), ...opt(0x1ff, 0x00080000)]);
    const tert = rec(0x0003 | (2 << 4), 0xf122, [...opt(0x1bf, 0x00600000), ...opt(0x1ff, 0x00c00000)]);
    const bytes = new Uint8Array(rec(0x000f, 0xf004, [...fsp, ...fopt, ...tert]));
    const shape = readSpContainer(readRec(new ByteReader(bytes), 0, bytes.length)!);
    const fill = shape.props.get(0x1bf)!.value, line = shape.props.get(0x1ff)!.value;
    expect((fill >>> 20) & 1).toBe(1); // fUsefFilled continua valendo…
    expect((fill >>> 4) & 1).toBe(0); // …com fFilled = 0
    expect((fill >>> 21) & 3).toBe(3); // e os bits da TertiaryFOPT entram
    expect([(line >>> 19) & 1, (line >>> 3) & 1]).toEqual([1, 0]);
  });

  it('atrás do texto / fora da célula / sem sobreposição (0x3BF), também sem o fBelowText do FSPA', () => {
    const check = (docx: Uint8Array): void => {
      const a = anchors(partsOf(docx)['word/document.xml']!)[0]!;
      expect([a.attrs.behindDoc, a.attrs.layoutInCell, a.attrs.allowOverlap]).toEqual(['1', '0', '0']);
    };
    check(convert('formas'));
    const w = wordVml(ref['word/document.xml']!)[0]!;
    expect(zIndex(w)).toBeLessThan(0);
    expect([w['o:allowincell'], w['o:allowoverlap']]).toEqual(['f', 'f']);
    // .doc antigos: FSPA.fBelowText = 0 e só a propriedade diz "atrás do texto"
    const cfb = readCfb(load('formas.doc'));
    const streams: Record<string, Uint8Array> = {};
    for (const e of cfb.entries) if (e.type === 'stream') streams[e.name] = cfb.getStream(e.path)!.slice();
    const r = new DocReader(load('formas.doc'));
    const { fc, lcb } = r.fib.fcLcb(FC.PlcSpaMom);
    const table = streams[r.fib.fWhichTblStm ? '1Table' : '0Table']!;
    const n = (lcb - 4) / 30;
    for (let i = 0; i < n; i++) {
      const o = fc + (n + 1) * 4 + i * 26 + 20;
      table[o + 1]! &= ~0x40; // fBelowText (bit 14 dos flags)
    }
    check(convertDocToDocx(buildCfb(streams)));
  });

  it('ordem Z = ordem das formas no desenho (não a ordem do texto)', () => {
    const ours = anchors(partsOf(convert('formas'))['word/document.xml']!).filter((a) => a.attrs.behindDoc === '0').map((a) => Number(a.attrs.relativeHeight));
    const word = wordVml(ref['word/document.xml']!).map(zIndex).filter((z) => z > 0);
    const rank = (v: number[]): number[] => v.map((x) => v.filter((y) => y < x).length);
    expect(ours.length).toBe(word.length);
    expect(rank(ours)).toEqual(rank(word));
    // o primeiro retângulo (vermelho) fica na frente do segundo (azul)
    expect(ours[0]!).toBeGreaterThan(ours[1]!);
  });

  it('conectores e geometrias com ajuste (tabela msospt completa)', () => {
    const as = anchors(partsOf(convert('formas'))['word/document.xml']!);
    const prst = as.map((a) => attr(first(a, 'a:prstGeom'), 'prst'));
    expect(prst).toEqual(['rect', 'rect', 'rect', 'bentConnector3', 'straightConnector1', 'roundRect', 'rightArrow']);
    const bent = as[3]!;
    expect(first(bent, 'wps:cNvCnPr')).toBeDefined();
    // sem preenchimento: só a linha (a:ln) tem cor
    expect(first(bent, 'wps:spPr')!.children.filter((c) => typeof c !== 'string' && c.name === 'a:solidFill')).toEqual([]);
    expect(attr(first(first(first(bent, 'wps:spPr'), 'a:ln'), 'a:srgbClr'), 'val')).toBe('7030A0');
    const gd = (a: XmlElement): string[] => all(a, 'a:gd').map((g) => `${g.attrs.name}=${Math.round(Number(g.attrs.fmla!.split(' ')[1]) / 1000)}`);
    expect(gd(as[5]!)).toEqual(['adj=35']);
    expect(gd(as[6]!)).toEqual(['adj1=30', 'adj2=70']);
    const types = wordVml(ref['word/document.xml']!).map((v) => v.type ?? v.kind);
    expect(types).toContain('#_x0000_t34');
  });

  it('SttbfFfn: nome alternativo com lixo de memória é descartado, o válido fica', () => {
    const ffn = (name: string, alt: string): number[] => {
      const chars = [...name, '\0', ...alt, '\0'].flatMap((c) => [c.charCodeAt(0) & 0xff, c.charCodeAt(0) >> 8]);
      const body = [0x26, 0x90, 0x01, 0, name.length + 1, ...new Array(10).fill(0), ...new Array(24).fill(0), ...chars];
      return [body.length, ...body];
    };
    const table = new Uint8Array([2, 0, 0, 0, ...ffn('Arial Narrow', '﷽﷽﷽rrow'), ...ffn('Helv', 'Arial')]);
    const fib = { fcLcb: () => ({ fc: 0, lcb: table.length }) } as unknown as Parameters<typeof readFonts>[0];
    const fonts = readFonts(fib, table);
    expect(fonts.map((f) => [f.name, f.altName])).toEqual([['Arial Narrow', undefined], ['Helv', 'Arial']]);
  });

  it('WordArt (geoText) vira texto WordArt; a forma-mestre (hspMaster) não é desenhada', () => {
    const hdr = partsOf(convert('formas'))['word/header1.xml']!;
    const as = anchors(hdr);
    // como o Word: só a caixa e a marca-d'água (o mestre oculto fica de fora)
    expect(as.length).toBe(wordVml(ref['word/header1.xml']!).length);
    const art = as.find((a) => first(a, 'wps:bodyPr')?.attrs.fromWordArt === '1')!;
    expect(text(first(art, 'w:txbxContent')!)).toBe('RASCUNHO');
    expect(attr(first(art, 'w:color'), 'w:val')).toBe('FBE4D5');
    expect(attr(first(art, 'w:rFonts'), 'w:ascii')).toBe('Arial');
    expect(attr(first(art, 'w:sz'), 'w:val')).toBe('88');
    expect(art.attrs.behindDoc).toBe('1');
    expect(attr(first(art, 'a:xfrm'), 'rot')).toBe(String(315 * 60000));
    expect(first(first(art, 'wps:spPr'), 'a:noFill')).toBeDefined();
  });
});

describe('degradês OfficeArt (fixture degrades)', () => {
  // as formas foram desenhadas com estes degradês (DrawingML e uma em VML); o Word gravou o
  // .doc (fillType 7, ângulo 0x18B, foco 0x18C, cores 0x181/0x183 e a lista 0x197)
  it('ângulo, foco espelhado e lista de cores voltam ao degradê de origem', () => {
    const as = all(parseXml(partsOf(convert('degrades'))['word/document.xml']!), 'wp:anchor');
    const grads = as.map((a) => {
      const g = first(a, 'a:gradFill')!;
      return [all(g, 'a:gs').map((s) => `${attr(first(s, 'a:srgbClr'), 'val')}@${s.attrs.pos}`).join(' '), attr(first(g, 'a:lin'), 'ang')];
    });
    const WG = 'FFFFFF@0 999999@100000';
    expect(grads).toEqual([
      [WG, '5400000'], [WG, '0'], [WG, '2700000'],
      [WG, '16200000'], ['999999@0 FFFFFF@50000 999999@100000', '5400000'], ['C04040@0 FFFFFF@40000 2E5C8A@100000', '5400000'],
      // VML: ângulo −45 (vale 135 → a:lin 315°), foco 0 e "fill lighten(153)" de 3A7A5C
      ['89AF9D@0 3A7A5C@100000', '18900000'],
    ]);
  });
});

describe('configurações (DOP → settings.xml)', () => {
  it('defaultTabStop e w:compat do modo de compatibilidade 11', () => {
    const { parts } = doc('caracteres');
    const st = parseXml(parts['word/settings.xml']!);
    expect(attr(first(st, 'w:defaultTabStop'), 'w:val')).toBe('708');
    const compat = first(st, 'w:compat')!;
    const cs = first(compat, 'w:compatSetting')!;
    expect(cs.attrs).toMatchObject({ 'w:name': 'compatibilityMode', 'w:val': '11' });
    // mesmas opções que o Word grava ao salvar o .doc como .docx
    const ref = parseXml(partsOf(load('caracteres.word.docx'))['word/settings.xml']!);
    const names = (c: XmlElement | undefined): string[] => (c ? c.children.filter((x): x is XmlElement => typeof x !== 'string' && x.name !== 'w:compatSetting').map((x) => x.name) : []);
    expect(names(compat)).toEqual(names(first(ref, 'w:compat')));
  });

  it('tipografia, grade de desenho e formulários como o Word grava', () => {
    const keys = ['printFormsData', 'saveFormsData', 'alignBordersAndEdges', 'bordersDoNotSurroundHeader', 'bordersDoNotSurroundFooter',
      'hyphenationZone', 'doNotHyphenateCaps', 'drawingGridHorizontalSpacing', 'drawingGridVerticalSpacing',
      'displayHorizontalDrawingGridEvery', 'displayVerticalDrawingGridEvery', 'doNotUseMarginsForDrawingGridOrigin',
      'doNotShadeFormData', 'noPunctuationKerning', 'characterSpacingControl', 'doNotIncludeSubdocsInStats'];
    const pick = (xml: string): string[] => {
      const st = parseXml(xml);
      return keys.flatMap((k) => { const n = first(st, `w:${k}`); return n ? [`${k}=${attr(n, 'w:val') ?? 'on'}`] : []; });
    };
    for (const f of ['caracteres', 'notas-campos']) {
      const ours = pick(doc(f).parts['word/settings.xml']!);
      expect(ours, f).toEqual(pick(partsOf(load(`${f}.word.docx`))['word/settings.xml']!));
      expect(ours.some((x) => x.startsWith('characterSpacingControl='))).toBe(true);
    }
  });
});
