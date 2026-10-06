import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { isCfb, convertPptToPptx, readPptDocument, PptFormatError } from '../src/ppt/index.js';
import { readCfb } from '../src/ppt/cfb.js';
import { PptxPackage, readPresentation, readSlide, parseXml, descend, childElements } from '../src/index.js';

// Corpus: decks gerados pelo PowerPoint real em .pptx E .ppt (lab de reprodução,
// tools/ppt-lab/playback/gen-playback.ps1). Não versionados — os testes de
// corpus são pulados quando os arquivos não existem.
const samples = join(__dirname, '../../../samples');
const pb = (name: string): string => join(samples, 'playback', name);
const load = (p: string): Uint8Array => new Uint8Array(readFileSync(p));

// ───────────────────────── Compound File mínimo (escritor de teste) ─────────────────────────

/**
 * Monta um Compound File v3 (setores de 512 bytes) com streams na raiz.
 * Streams < 4096 bytes vão para o mini stream (miniFAT), como manda a spec.
 */
function buildCfb(streams: Record<string, Uint8Array>): Uint8Array {
  const SS = 512, MS = 64, CUTOFF = 4096;
  const names = Object.keys(streams);
  const ENDC = 0xfffffffe, FREE = 0xffffffff, FATSECT = 0xfffffffd;
  // mini stream
  const mini: number[] = []; // bytes do mini stream
  const miniFat: number[] = [];
  const miniStart = new Map<string, number>();
  for (const n of names) {
    const d = streams[n]!;
    if (d.length >= CUTOFF || d.length === 0) continue;
    const first = mini.length / MS;
    const cnt = Math.ceil(d.length / MS);
    miniStart.set(n, first);
    for (let i = 0; i < cnt; i++) miniFat.push(i === cnt - 1 ? ENDC : first + i + 1);
    const padded = new Uint8Array(cnt * MS); padded.set(d);
    mini.push(...padded);
  }
  // layout de setores: [FAT][diretório][miniFAT][mini stream][streams grandes]
  const sectors: Uint8Array[] = [];
  const fat: number[] = [];
  const alloc = (data: Uint8Array): number => {
    const first = sectors.length;
    const cnt = Math.max(1, Math.ceil(data.length / SS));
    for (let i = 0; i < cnt; i++) {
      const s = new Uint8Array(SS);
      s.set(data.subarray(i * SS, Math.min(data.length, (i + 1) * SS)));
      sectors.push(s);
      fat.push(i === cnt - 1 ? ENDC : first + i + 1);
    }
    return first;
  };
  sectors.push(new Uint8Array(SS)); fat.push(FATSECT); // setor 0 = FAT (1 setor basta)
  const dirEntries = 1 + names.length;
  const dirBytes = new Uint8Array(Math.ceil(dirEntries / 4) * SS);
  const dirStart = alloc(dirBytes);
  const mfBytes = new Uint8Array(Math.max(1, miniFat.length) * 4);
  new DataView(mfBytes.buffer).setUint32(0, FREE, true);
  miniFat.forEach((v, i) => new DataView(mfBytes.buffer).setUint32(i * 4, v, true));
  const miniFatStart = miniFat.length ? alloc(mfBytes) : ENDC;
  const miniStreamStart = mini.length ? alloc(new Uint8Array(mini)) : ENDC;
  const bigStart = new Map<string, number>();
  for (const n of names) {
    const d = streams[n]!;
    if (d.length >= CUTOFF) bigStart.set(n, alloc(d));
  }
  // diretório: raiz + streams encadeados como irmãos à direita
  const dv = new DataView(dirBytes.buffer);
  const entry = (i: number, name: string, type: number, start: number, size: number, child: number, right: number): void => {
    const o = i * 128;
    for (let k = 0; k < name.length; k++) dv.setUint16(o + k * 2, name.charCodeAt(k), true);
    dv.setUint16(o + 0x40, (name.length + 1) * 2, true);
    dv.setUint8(o + 0x42, type);
    dv.setUint32(o + 0x44, FREE, true);
    dv.setUint32(o + 0x48, right, true);
    dv.setUint32(o + 0x4c, child, true);
    dv.setUint32(o + 0x74, start, true);
    dv.setUint32(o + 0x78, size, true);
  };
  entry(0, 'Root Entry', 5, miniStreamStart, mini.length, names.length ? 1 : FREE, FREE);
  names.forEach((n, i) => {
    const d = streams[n]!;
    const start = d.length >= CUTOFF ? bigStart.get(n)! : d.length ? miniStart.get(n)! : ENDC;
    entry(i + 1, n, 2, start, d.length, FREE, i + 2 <= names.length ? i + 2 : FREE);
  });
  for (let i = dirEntries; i < dirBytes.length / 128; i++) {
    dv.setUint32(i * 128 + 0x44, FREE, true); dv.setUint32(i * 128 + 0x48, FREE, true); dv.setUint32(i * 128 + 0x4c, FREE, true);
  }
  sectors[dirStart]!.set(dirBytes.subarray(0, SS));
  for (let i = 1; i < dirBytes.length / SS; i++) sectors[dirStart + i]!.set(dirBytes.subarray(i * SS, (i + 1) * SS));
  // FAT
  const fatSector = sectors[0]!;
  const fv = new DataView(fatSector.buffer);
  for (let i = 0; i < SS / 4; i++) fv.setUint32(i * 4, i < fat.length ? fat[i]! : FREE, true);
  // cabeçalho
  const hdr = new Uint8Array(SS);
  const hv = new DataView(hdr.buffer);
  hdr.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  hv.setUint16(0x18, 0x3e, true); hv.setUint16(0x1a, 3, true); hv.setUint16(0x1c, 0xfffe, true);
  hv.setUint16(0x1e, 9, true); hv.setUint16(0x20, 6, true);
  hv.setUint32(0x2c, 1, true); hv.setUint32(0x30, dirStart, true); hv.setUint32(0x38, CUTOFF, true);
  hv.setUint32(0x3c, miniFatStart, true); hv.setUint32(0x40, miniFat.length ? 1 : 0, true);
  hv.setUint32(0x44, ENDC, true); hv.setUint32(0x48, 0, true);
  hv.setUint32(0x4c, 0, true);
  for (let i = 1; i < 109; i++) hv.setUint32(0x4c + i * 4, FREE, true);
  const out = new Uint8Array(SS * (1 + sectors.length));
  out.set(hdr);
  sectors.forEach((s, i) => out.set(s, SS * (i + 1)));
  return out;
}

describe('Compound File ([MS-CFB])', () => {
  it('isCfb reconhece a assinatura D0CF11E0', () => {
    expect(isCfb(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]))).toBe(true);
    expect(isCfb(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0, 0, 0]))).toBe(false); // zip (.pptx)
    expect(isCfb(new Uint8Array(3))).toBe(false);
  });

  it('lê streams da FAT e do mini stream', () => {
    const small = new TextEncoder().encode('pequeno stream no mini stream');
    const big = new Uint8Array(5000).map((_, i) => i % 251);
    const cfb = readCfb(buildCfb({ 'Current User': small, 'PowerPoint Document': big }));
    expect(cfb.entries.map((e) => e.path).sort()).toEqual(['', 'Current User', 'PowerPoint Document']);
    expect(new TextDecoder().decode(cfb.getStream('current user')!)).toBe('pequeno stream no mini stream');
    expect(cfb.getStream('PowerPoint Document')).toEqual(big);
    expect(cfb.getStream('Pictures')).toBeUndefined();
  });

  it('erros em português para arquivos inválidos/criptografados', () => {
    expect(() => convertPptToPptx(new Uint8Array(64))).toThrow(PptFormatError);
    expect(() => convertPptToPptx(new Uint8Array(64))).toThrow(/não é um \.ppt/);
    expect(() => convertPptToPptx(buildCfb({ WordDocument: new Uint8Array(5000) }))).toThrow(/PowerPoint Document/);
    expect(() => convertPptToPptx(buildCfb({ EncryptionInfo: new Uint8Array(100), EncryptedPackage: new Uint8Array(5000) })))
      .toThrow(/criptografada/);
    expect(() => convertPptToPptx(buildCfb({ 'PowerPoint Document': new Uint8Array(5000) }))).toThrow(/UserEditAtom/);
  });
});

// ───────────────────────── corpus do PowerPoint ─────────────────────────

function slidesXml(pptx: Uint8Array): ReturnType<typeof parseXml>[] {
  const parts = unzipSync(pptx);
  const out: ReturnType<typeof parseXml>[] = [];
  for (let i = 1; parts[`ppt/slides/slide${i}.xml`]; i++) out.push(parseXml(strFromU8(parts[`ppt/slides/slide${i}.xml`]!)));
  return out;
}

describe('Conversão .ppt → .pptx (corpus do PowerPoint)', () => {
  const texto = pb('pb-texto.ppt');

  it('pacote válido para o leitor do viewer: tamanho, slides, ids = spid', () => {
    if (!existsSync(texto)) return;
    const pkg = PptxPackage.load(convertPptToPptx(load(texto)));
    const pres = readPresentation(pkg);
    expect(pres.slideW).toBe(12192000); // 7680 mestre-unidades × 1587,5
    expect(pres.slideH).toBe(6858000);
    expect(pres.slides.length).toBe(9);
    const s1 = readSlide(pkg, pres.slides[0]!.target!);
    expect(s1.shapes.map((s) => s.id)).toEqual(['13314', '13315']);
    expect(s1.bg).toEqual({ type: 'solid', color: '#F4F4F0' });
  });

  it('texto: tamanho/negrito/cor explícitos, numeração automática (PP9) e margens da régua', () => {
    if (!existsSync(texto)) return;
    const pkg = PptxPackage.load(convertPptToPptx(load(texto)));
    const s1 = readSlide(pkg, readPresentation(pkg).slides[0]!.target!);
    const title = s1.shapes[0]!.txBody!.paragraphs[0]!;
    expect(title.runs[0]).toMatchObject({ text: 'Texto por parágrafo (esmaecer)', sz: 28, bold: true, color: '#1E1E1E', font: 'Aptos' });
    const list = s1.shapes[1]!.txBody!.paragraphs;
    expect(list.length).toBe(5);
    expect(list[0]).toMatchObject({ bullet: true, bulletAutoNum: 'arabicPeriod', marL: 514350, indent: -514350 });
    expect(list[4]!.runs[0]!.text).toBe('Quinto e último');
  });

  it('animações: <p:timing> do PPT10 com mainSeq, efeito, alvo por parágrafo e bldLst', () => {
    if (!existsSync(texto)) return;
    const [sld] = slidesXml(convertPptToPptx(load(texto)));
    const timing = descend(sld!, 'p:timing')!;
    expect(timing).toBeDefined();
    const xml = JSON.stringify(timing);
    expect(xml).toContain('"nodeType":"mainSeq"');
    expect(xml).toContain('"presetID":"10"');
    expect(xml).toContain('"presetClass":"entr"');
    const pRg = descend(timing, 'p:pRg')!;
    expect(pRg.attrs).toEqual({ st: '0', end: '0' });
    expect(descend(timing, 'p:spTgt')!.attrs['spid']).toBe('13315');
    expect(descend(timing, 'p:bldP')!.attrs).toMatchObject({ spid: '13315', grpId: '0', build: 'p' });
  });

  it('transições: tipo/direção/velocidade/avanço conferidos com o PowerPoint', () => {
    const f = pb('pb-transicoes-classicas.ppt');
    if (!existsSync(f)) return;
    const slides = slidesXml(convertPptToPptx(load(f)));
    const tr = (i: number): { attrs: Record<string, string>; fx?: { name: string; attrs: Record<string, string> } } => {
      const t = descend(slides[i - 1]!, 'p:transition')!;
      return { attrs: t.attrs, fx: childElements(t)[0] };
    };
    expect(tr(1)).toMatchObject({ attrs: { spd: 'slow', advTm: '1000' }, fx: { name: 'p:fade', attrs: {} } });
    expect(tr(3).fx).toMatchObject({ name: 'p:cut', attrs: { thruBlk: '1' } });
    expect(tr(4).fx).toMatchObject({ name: 'p:fade', attrs: { thruBlk: '1' } });
    expect(tr(6)).toMatchObject({ attrs: { advTm: '1000' }, fx: { name: 'p:push', attrs: { dir: 'u' } } });
    expect(tr(6).attrs['spd']).toBeUndefined(); // rápido = padrão
    expect(tr(10).fx).toMatchObject({ name: 'p:split', attrs: { orient: 'vert', dir: 'in' } });
    expect(tr(21).fx).toMatchObject({ name: 'p:cover', attrs: { dir: 'ld' } });
    expect(tr(24).fx).toMatchObject({ name: 'p:blinds', attrs: {} });
    expect(tr(25).fx).toMatchObject({ name: 'p:blinds', attrs: { dir: 'vert' } });
    expect(tr(26).fx).toMatchObject({ name: 'p:wheel', attrs: { spokes: '1' } });
    expect(tr(11).fx?.name).toBe('p:fade'); // "revelar" (2010) → esmaecer no .ppt
  });

  it('slide oculto vira show="0"', () => {
    const f = pb('pb-tempo.ppt');
    if (!existsSync(f)) return;
    const slides = slidesXml(convertPptToPptx(load(f)));
    expect(slides[10]!.attrs['show']).toBe('0');
    expect(slides.filter((s) => s.attrs['show'] === '0').length).toBe(1);
  });

  it('imagens: blips PNG do stream "Pictures" viram ppt/media e <p:pic>', () => {
    const f = pb('pb-midia.ppt');
    if (!existsSync(f)) return;
    const pptx = convertPptToPptx(load(f));
    const parts = unzipSync(pptx);
    const media = Object.keys(parts).filter((p) => p.startsWith('ppt/media/'));
    expect(media.length).toBeGreaterThan(0);
    for (const m of media) expect(Array.from(parts[m]!.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const pkg = PptxPackage.load(pptx);
    const s1 = readSlide(pkg, readPresentation(pkg).slides[0]!.target!);
    expect(s1.shapes.some((s) => s.image?.mime === 'image/png')).toBe(true);
  });

  it('round-trip do PowerPoint 2007+: contorno oculto (shapexml) só com useRoundTrip', () => {
    const f = pb('pb-enfase.ppt');
    if (!existsSync(f)) return;
    const withRt = PptxPackage.load(convertPptToPptx(load(f)));
    const binOnly = PptxPackage.load(convertPptToPptx(load(f), { useRoundTrip: false }));
    const shape = (pkg: PptxPackage) => readSlide(pkg, readPresentation(pkg).slides[0]!.target!).shapes[1]!;
    expect(shape(withRt).lineNone).toBe(true);
    expect(shape(binOnly).lineNone).toBeUndefined();
    expect(shape(binOnly).lineColor).toBe('#042433'); // cor da linha "oculta" gravada no binário
    expect(shape(withRt).fill).toEqual(shape(binOnly).fill);
  });

  it('arquivos 97-2003 de outro gravador (LibreOffice): gradientes, rotação, forma livre', () => {
    const f = join(samples, 'legacy', 'lo-stress-shapes.ppt');
    if (!existsSync(f)) return;
    const pkg = PptxPackage.load(convertPptToPptx(load(f)));
    const pres = readPresentation(pkg);
    const shape = (slide: number, id: string) => readSlide(pkg, pres.slides[slide - 1]!.target!).shapes.find((s) => s.id === id)!;
    // fillAngle 0 = de baixo para cima (preenchimento embaixo, fundo em cima)
    expect(shape(2, '14338').fill).toMatchObject({ type: 'gradient', angleDeg: 270,
      stops: [{ pos: 0, color: '#FFFFFF' }, { pos: 1, color: '#4472C4' }] });
    // radial: cor de fundo no centro, preenchimento na borda
    expect(shape(2, '14341').fill).toMatchObject({ type: 'gradient', path: 'shape',
      stops: [{ pos: 0, color: '#FFFFFF' }, { pos: 1, color: '#963CC8' }] });
    // seta girada 90°: âncora binária "deitada" volta a paisagem (cx > cy)
    const arrow = shape(4, '16388');
    expect(arrow.xfrm).toMatchObject({ rot: 5400000 });
    expect(arrow.xfrm!.cx).toBeGreaterThan(arrow.xfrm!.cy);
    // IMsoArray com tamanho declarado sem o cabeçalho (peculiaridade do LibreOffice)
    const free = shape(4, '16395');
    expect(free.custGeom?.subs[0]?.map((s) => s.c).join('')).toBe('MLLLLZ');
  });

  it('cabeçalho/rodapé 97-2003: placeholders do mestre conforme o HeadersFooters do slide', () => {
    const f = join(samples, 'legacy', 'lo-footer-test.ppt');
    if (!existsSync(f)) return;
    const slides = slidesXml(convertPptToPptx(load(f)));
    const phTypes = (i: number): string[] => {
      const out: string[] = [];
      const walk = (e: ReturnType<typeof parseXml>): void => { for (const c of childElements(e)) { if (c.name === 'p:ph') out.push(c.attrs['type'] ?? 'obj'); walk(c); } };
      walk(slides[i]!);
      return out;
    };
    expect(phTypes(0)).not.toContain('ftr');                 // slide 1: sem rodapé
    expect(phTypes(1)).toEqual(expect.arrayContaining(['ftr', 'sldNum']));
    const xml = JSON.stringify(slides[1]);
    expect(xml).toContain('Rodapé de teste');
    expect(descend(slides[1]!, 'a:fld')!.attrs['type']).toBe('slidenum');
  });

  it('WordArt clássico (gtext): texto sem caixa preenchida, na cor/fonte do WordArt', () => {
    const f = join(samples, 'legacy', 'lo-wordart-test.ppt');
    if (!existsSync(f)) return;
    const pkg = PptxPackage.load(convertPptToPptx(load(f)));
    const slide = readSlide(pkg, readPresentation(pkg).slides[2]!.target!);
    const wa = slide.shapes.find((s) => s.txBody?.paragraphs[0]?.runs[0]?.text === 'Arte em Texto')!;
    expect(wa).toBeDefined();
    expect(wa.fill).toEqual({ type: 'none' });
    expect(wa.txBody!.paragraphs[0]!.runs[0]).toMatchObject({ bold: true, color: '#C00000', font: 'Arial Black' });
  });

  it('notas do apresentador viram notesSlide (placeholder body) + notesMaster', () => {
    const f = pb('showcase_animado.ppt');
    if (!existsSync(f)) return;
    const parts = unzipSync(convertPptToPptx(load(f)));
    expect(parts['ppt/notesMasters/notesMaster1.xml']).toBeDefined();
    const rels = strFromU8(parts['ppt/slides/_rels/slide1.xml.rels']!);
    expect(rels).toContain('../notesSlides/notesSlide1.xml');
    const notes = parseXml(strFromU8(parts['ppt/notesSlides/notesSlide1.xml']!));
    const body = childElements(descend(notes, 'p:spTree')!, 'p:sp').find((sp) => descend(sp, 'p:ph')?.attrs['type'] === 'body')!;
    expect(JSON.stringify(body)).toContain('Slide de abertura.');
    expect(strFromU8(parts['ppt/presentation.xml']!)).toContain('<p:notesMasterIdLst>');
  });

  it('todo o corpus converte; alvos das animações existem no slide', () => {
    const decks = ['pb-entrada', 'pb-enfase', 'pb-saida', 'pb-tempo', 'pb-texto', 'pb-trajetorias', 'pb-midia',
      'pb-transicoes-classicas', 'pb-transicoes-dinamicas', 'showcase_animado'];
    for (const d of decks) {
      const f = pb(`${d}.ppt`);
      if (!existsSync(f)) continue;
      const pptx = convertPptToPptx(load(f));
      const pkg = PptxPackage.load(pptx);
      const pres = readPresentation(pkg);
      expect(pres.slides.length, d).toBe(readPptDocument(load(f)).slides.length);
      slidesXml(pptx).forEach((sld, i) => {
        readSlide(pkg, pres.slides[i]!.target!);
        const ids = new Set<string>();
        const walk = (el: ReturnType<typeof parseXml>): void => {
          for (const c of childElements(el)) {
            if (c.name === 'p:cNvPr' && c.attrs['id']) ids.add(c.attrs['id']);
            walk(c);
          }
        };
        walk(descend(sld, 'p:spTree')!);
        const timing = descend(sld, 'p:timing');
        if (!timing) return;
        const check = (el: ReturnType<typeof parseXml>): void => {
          for (const c of childElements(el)) {
            if ((c.name === 'p:spTgt' || c.name === 'p:bldP' || c.name === 'p:bldGraphic') && c.attrs['spid']) {
              expect(ids.has(c.attrs['spid']), `${d} slide ${i + 1} spid ${c.attrs['spid']}`).toBe(true);
            }
            check(c);
          }
        };
        check(timing);
      });
    }
  });
});
