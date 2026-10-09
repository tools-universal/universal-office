import { describe, expect, it } from 'vitest';
import { zipSync, zlibSync, strToU8 } from 'fflate';
import { readCfb } from '../src/ppt/cfb.js';
import { readPptDocument, PptFormatError } from '../src/ppt/index.js';
import { decodeBlip } from '../src/ppt/officeart.js';
import { ByteReader, readRec } from '../src/ppt/records.js';
import { zipPartText, serializeXml } from '../src/ppt/roundtrip.js';
import { paragraphsXml, type TextConvCtx } from '../src/ppt/textconv.js';
import type { TextBlock } from '../src/ppt/text.js';
import type { PptDocument } from '../src/ppt/ppt-reader.js';
import { buildCfb } from './helpers/cfb-writer.js';

// Entradas FORJADAS (o .ppt é dado não confiável aberto no navegador): cada
// caso travava a aba ou alocava centenas de MB a GB antes das correções.

const fast = <T>(fn: () => T, ms: number): T => {
  const t0 = performance.now();
  const v = fn();
  expect(performance.now() - t0).toBeLessThan(ms);
  return v;
};

describe('Compound File forjado', () => {
  it('tamanho de setor absurdo em versão desconhecida → erro imediato (antes: FAT de 256 MiB)', () => {
    const f = new Uint8Array(1024);
    f.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const v = new DataView(f.buffer);
    v.setUint16(0x1a, 5, true); v.setUint16(0x1c, 0xfffe, true); v.setUint16(0x1e, 28, true); v.setUint16(0x20, 6, true);
    expect(() => fast(() => readCfb(f), 200)).toThrow(/setor inválido/);
  });

  it('stream que DECLARA 4 GiB num arquivo pequeno lê no máximo o que existe', () => {
    const f = buildCfb({ 'PowerPoint Document': new Uint8Array(6000).fill(7) });
    // tamanho do stream (entrada 1 do diretório, setor do diretório = 1 → offset 1024)
    const dirOff = (new DataView(f.buffer).getUint32(0x30, true) + 1) * 512;
    new DataView(f.buffer).setUint32(dirOff + 128 + 0x78, 0xffffffff, true);
    const s = fast(() => readCfb(f).getStream('PowerPoint Document')!, 200);
    expect(s.length).toBeLessThanOrEqual(f.length);
  });

  it('miniFAT que declara milhões de setores não aloca além do arquivo', () => {
    const f = buildCfb({ 'Current User': new Uint8Array(100), 'PowerPoint Document': new Uint8Array(5000) });
    new DataView(f.buffer).setUint32(0x40, 0x7fffffff, true); // numMiniFatSectors
    const cfb = fast(() => readCfb(f), 200);
    expect(cfb.getStream('Current User')!.length).toBe(100);
  });
});

describe('PowerPoint Document forjado', () => {
  /** Stream com um PersistDirectoryAtom grande + N UserEditAtoms encadeados apontando PARA ELE. */
  function persistBomb(pdEntries: number, edits: number): Uint8Array {
    const words: number[] = [];
    for (let id = 1, left = pdEntries; left > 0;) {
      const n = Math.min(4095, left);
      words.push(((n << 20) | id) >>> 0);
      for (let k = 0; k < n; k++) words.push(0);
      id += n; left -= n;
    }
    const pdLen = words.length * 4;
    const ueLen = 28;
    const buf = new Uint8Array(8 + pdLen + edits * (8 + ueLen));
    const v = new DataView(buf.buffer);
    v.setUint16(2, 0x1772, true); v.setUint32(4, pdLen, true); // PersistDirectoryAtom
    words.forEach((w, i) => v.setUint32(8 + i * 4, w, true));
    let off = 8 + pdLen, prev = 0;
    for (let e = 0; e < edits; e++) {
      v.setUint16(off + 2, 0x0ff5, true); v.setUint32(off + 4, ueLen, true); // UserEditAtom
      v.setUint32(off + 8 + 8, prev, true); // offsetLastEdit
      v.setUint32(off + 8 + 12, 0, true); // offsetPersistDirectory → o MESMO diretório
      prev = off; off += 8 + ueLen;
    }
    return buf;
  }

  it('N edições apontando o mesmo diretório: lido uma vez (antes: N×M inserções, minutos)', () => {
    const doc = persistBomb(100_000, 20_000);
    const f = buildCfb({ 'PowerPoint Document': doc });
    // sem DocumentContainer o arquivo é recusado — o que importa é recusar RÁPIDO
    expect(() => fast(() => readPptDocument(f), 3000)).toThrow(PptFormatError);
  });

  it('stream grande e zerado sem "Current User": a varredura não materializa milhões de registros', () => {
    const f = buildCfb({ 'PowerPoint Document': new Uint8Array(8 * 1024 * 1024) });
    expect(() => fast(() => readPptDocument(f), 3000)).toThrow(/UserEditAtom/);
  });
});

describe('imagem (BLIP) comprimida forjada', () => {
  /** Registro BlipEMF: 16 bytes de UID + cabeçalho de metarquivo (34 bytes) + dados zlib. */
  function emfBlip(payload: Uint8Array, cbSize: number): ReturnType<typeof readRec> {
    const z = zlibSync(payload, { level: 9 });
    const len = 16 + 34 + z.length;
    const b = new Uint8Array(8 + len);
    const v = new DataView(b.buffer);
    v.setUint16(0, 0x3d4 << 4, true); v.setUint16(2, 0xf01a, true); v.setUint32(4, len, true);
    v.setUint32(8 + 16, cbSize, true); // cbSize
    b[8 + 16 + 32] = 0; // compression = deflate
    b.set(z, 8 + 16 + 34);
    return readRec(new ByteReader(b), 0);
  }

  it('bomba de descompressão (80 MB de zeros) é descartada, não alocada', () => {
    const rec = emfBlip(new Uint8Array(80 * 1024 * 1024), 0)!;
    expect(fast(() => decodeBlip(rec), 3000)).toBeUndefined();
  });

  it('orçamento do documento: passou do teto total, a imagem fica de fora', () => {
    const rec = emfBlip(new Uint8Array(10_000).fill(1), 10_000)!;
    expect(decodeBlip(rec, { left: 1_000 })).toBeUndefined();
    const budget = { left: 1_000_000 };
    expect(decodeBlip(rec, budget)?.bytes.length).toBe(10_000);
    expect(budget.left).toBe(1_000_000 - 10_000);
  });
});

describe('round-trip forjado', () => {
  it('zip que declara 4 GiB descompactados é ignorado (o fflate pré-alocaria o declarado)', () => {
    const zip = zipSync({ 'drs/shapexml.xml': strToU8('<p:sp/>') });
    // central directory: 'PK\x01\x02' … tamanho descompactado em +24
    const cd = zip.findIndex((_, i) => zip[i] === 0x50 && zip[i + 1] === 0x4b && zip[i + 2] === 1 && zip[i + 3] === 2);
    new DataView(zip.buffer).setUint32(cd + 24, 0xfffffff0, true);
    expect(fast(() => zipPartText(zip, 'shapexml.xml'), 200)).toBeUndefined();
  });

  it('nomes de elemento/atributo inválidos não vão crus para o XML gerado', () => {
    const xml = serializeXml({ name: 'a:x', attrs: { ok: '1', 'b"c': '2', 'd<e': '3' }, children: [{ name: 'p"x', attrs: {}, children: [] }, 'texto'] });
    expect(xml).toBe('<a:x ok="1">texto</a:x>');
  });
});

describe('texto com muitas corridas', () => {
  it('100 mil corridas de 1 caractere convertem em tempo linear (antes: O(n²))', () => {
    const n = 100_000;
    const text = 'x'.repeat(n);
    const block: TextBlock = {
      textType: 4, text,
      pfRuns: [{ count: n + 1, indentLevel: 0, pf: {} }] as TextBlock['pfRuns'],
      cfRuns: Array.from({ length: n + 1 }, (_, i) => ({ count: 1, cf: { size: 10 + (i % 2) } })) as unknown as TextBlock['cfRuns'],
    };
    const doc = { fonts: [], hyperlinks: new Map(), docCF: {}, docPF: {} } as unknown as PptDocument;
    const ctx: TextConvCtx = { doc, scheme: ['FFFFFF', '000000', '808080', '000000', 'BBE0E3', '333399', '009999', '99CC00'] };
    const xml = fast(() => paragraphsXml(block, ctx), 4000);
    expect((xml.match(/<a:r>/g) ?? []).length).toBe(n);
  });
});
