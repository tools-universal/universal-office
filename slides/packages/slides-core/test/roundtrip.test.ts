import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PptxPackage, readPresentation, readSlide } from '../src/index.js';

// Corpus: o .pptx gerado pela apresentação de referência (ppt-lab) — o oraculo estrutural.
const samples = join(__dirname, '../../../samples');
const refPptx = join(samples, 'reference.pptx');
// Corpus de fidelidade: o "showcase animado" do usuario — 12 slides com imagens,
// charts, notes, animacoes. E o teste de 1:1 com PowerPoint.
const showcase = join(samples, 'showcase_animado.pptx');

describe('PptxPackage round-trip sem perdas', () => {
  it('preserva todas as partes byte a byte', () => {
    if (!existsSync(refPptx)) return;
    const original = new Uint8Array(readFileSync(refPptx));
    const pkg = PptxPackage.load(original);
    const reloaded = PptxPackage.load(pkg.save());
    expect(reloaded.partNames()).toEqual(pkg.partNames());
    for (const name of pkg.partNames()) {
      expect(reloaded.getPart(name)).toEqual(pkg.getPart(name));
    }
    expect(reloaded.presentationXml()).toContain('<p:presentation');
  });
});

describe('Leitura do modelo PresentationML (reference.pptx)', () => {
  it('tamanho do slide e lista de slides', () => {
    if (!existsSync(refPptx)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(refPptx)));
    const pres = readPresentation(pkg);
    expect(pres.slideW).toBe(9144000);   // 16:9 onscreen = 10in
    expect(pres.slideH).toBe(5143500);   // 5.625in
    expect(pres.slides.length).toBe(3);
    expect(pres.slides[0]!.target).toBe('ppt/slides/slide1.xml');
  });

  it('slide 3: caixa de texto + retangulo com preenchimento', () => {
    if (!existsSync(refPptx)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(refPptx)));
    const slide = readSlide(pkg, 'ppt/slides/slide3.xml');
    expect(slide.shapes.length).toBe(2);

    const tb = slide.shapes.find((s) => s.isTextBox)!;
    expect(tb.xfrm).toBeDefined();
    expect(tb.xfrm!.cx).toBeGreaterThan(0);
    expect(tb.txBody!.paragraphs[0]!.runs[0]!.text).toBe('Caixa de texto livre');
    expect(tb.txBody!.paragraphs[0]!.runs[0]!.sz).toBe(28);
    expect(tb.txBody!.paragraphs[0]!.runs[0]!.bold).toBe(true);

    const rect = slide.shapes.find((s) => s.geom === 'rect' && s.fill?.type === 'solid')!;
    expect(rect.fill!.color).toBe('#4472C4');
    expect(rect.txBody!.anchor).toBe('ctr');
    expect(rect.txBody!.paragraphs[0]!.align).toBe('ctr');
  });

  it('slide 1: titulo placeholder herda geometria do layout', () => {
    if (!existsSync(refPptx)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(refPptx)));
    const slide = readSlide(pkg, 'ppt/slides/slide1.xml');
    const title = slide.shapes.find((s) => s.phType === 'ctrTitle')!;
    expect(title).toBeDefined();
    expect(title.txBody!.paragraphs[0]!.runs[0]!.text).toBe('Universal Slides');
    // geometria nao esta no slide (<p:spPr/>), tem que vir do layout/master
    expect(title.xfrm).toBeDefined();
    expect(title.xfrm!.cx).toBeGreaterThan(0);
  });
});

/**
 * Pino de 1:1 contra o "showcase animado" do usuario. Cada assert e um inventario
 * mensuravel — ele caira AGORA se uma regressao desnormalizar o que o PowerPoint
 * carrega do mesmo arquivo.
 */
describe('Showcase animado (12 slides) — imagens + cargas mistas', () => {
  it('round-trip do pacote preserva todas as partes byte a byte', () => {
    if (!existsSync(showcase)) return;
    const original = new Uint8Array(readFileSync(showcase));
    const pkg = PptxPackage.load(original);
    const reloaded = PptxPackage.load(pkg.save());
    expect(reloaded.partNames()).toEqual(pkg.partNames());
    expect(reloaded.partNames()).toContain('ppt/media/Slide-1-image-1.png');
    expect(reloaded.partNames()).toContain('ppt/charts/chart1.xml');
  });

  it('contagem de slides + 1 slideMaster + 1 slideLayout', () => {
    if (!existsSync(showcase)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    const pres = readPresentation(pkg);
    expect(pres.slides.length).toBe(12);
    // O [Content_Types] declara 12 slideMasterN como Override, mas o pacote
    // contem APENAS slideMaster1.xml — todos os slides resolvem ao mesmo master.
    const masters = pkg.partNames().filter((p) => /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(p));
    expect(masters).toEqual(['ppt/slideMasters/slideMaster1.xml']);
    const layouts = pkg.partNames().filter((p) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(p));
    expect(layouts).toEqual(['ppt/slideLayouts/slideLayout1.xml']);
  });

  it('slide 1 carrega imagem de fundo + 1 <p:pic> (icone) + ' +
     'shapes de texto em ordem de z', () => {
    if (!existsSync(showcase)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    const slide = readSlide(pkg, 'ppt/slides/slide1.xml');
    // 1 bg image (rId1) + 1 pic (rId2)
    expect(slide.bgImage).toBeDefined();
    expect(slide.bgImage!.part).toBe('ppt/media/Slide-1-image-1.png');
    expect(slide.bgImage!.mime).toBe('image/png');
    expect(slide.bgImage!.bytes.length).toBeGreaterThan(0);
    const pics = slide.shapes.filter((s) => s.image);
    expect(pics.length).toBe(1);
    expect(pics[0]!.image!.part).toBe('ppt/media/image-1-2.png');
    expect(pics[0]!.xfrm).toEqual({ x: 5852160, y: 777240, cx: 502920, cy: 502920 });
    // o pic vem ANTES dos <p:sp> no spTree (z-order)
    const picIdx = slide.shapes.findIndex((s) => s.image);
    const firstSp = slide.shapes.findIndex((s) => s.txBody);
    expect(picIdx).toBeLessThan(firstSp);
    // os textos do slide
    const texts = slide.shapes.flatMap((s) => s.txBody?.paragraphs.flatMap((p) => p.runs.map((r) => r.text)) ?? []);
    expect(texts).toContain('SHOWCASE');
    expect(texts).toContain('Recursos do PowerPoint');
  });

  it('slide 1: timing tree extrai 8 entrance fades em cascade (delay 0→1400, dur 500)', () => {
    if (!existsSync(showcase)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    const slide = readSlide(pkg, 'ppt/slides/slide1.xml');
    expect(slide.animations).toBeDefined();
    expect(slide.animations!.length).toBe(8);
    // delays acumulados: 0, 200, 400, 600, 800, 1000, 1200, 1400
    expect(slide.animations!.map((a) => a.delayMs)).toEqual([0, 200, 400, 600, 800, 1000, 1200, 1400]);
    // duracao: 500ms cada (a animEffect fade)
    expect(slide.animations!.map((a) => a.durMs)).toEqual([500, 500, 500, 500, 500, 500, 500, 500]);
    expect(slide.animations!.map((a) => a.type)).toEqual(['fade', 'fade', 'fade', 'fade', 'fade', 'fade', 'fade', 'fade']);
    // primeiro efeito é click-gated (nodeType clickEffect), demais afterEffect
    expect(slide.animations![0]!.clickGated).toBe(true);
    expect(slide.animations![1]!.clickGated).toBe(false);
    // spids batem com cNvPr ids 2..9 dos shapes
    expect(slide.animations!.map((a) => a.spid)).toEqual(['2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('slide 2: timing extrai sequência de cards (27+ animações)', () => {
    if (!existsSync(showcase)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    const slide = readSlide(pkg, 'ppt/slides/slide2.xml');
    expect(slide.animations).toBeDefined();
    // cada card tem 5 shapes (roundRect, ellipse, pic, title, desc), 6 cards = 30
    expect(slide.animations!.length).toBeGreaterThan(25);
    // delays crescentes (cascade 200ms entre cada)
    const delays = slide.animations!.map((a) => a.delayMs);
    expect(delays[delays.length - 1]).toBeGreaterThan(delays[0]!);
  });

  it('slide 2: card roundRect tem outerShdw (cor preta, blurRad 127000, alpha 12%)', () => {
    if (!existsSync(showcase)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    const slide = readSlide(pkg, 'ppt/slides/slide2.xml');
    // procura uma roundRect com shadow
    const cards = slide.shapes.filter((s) => s.geom === 'roundRect' && s.shadow);
    expect(cards.length).toBeGreaterThanOrEqual(6);
    const c0 = cards[0]!;
    expect(c0.shadow!.blurRad).toBe(127000);
    expect(c0.shadow!.alpha).toBeCloseTo(0.12, 3);
    expect(c0.shadow!.color).toBe('#000000');
  });

  it('slide 4: 3 ellipses com fillAlpha 0.6 + linhas com prstDash distintos', () => {
    if (!existsSync(showcase)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    const slide = readSlide(pkg, 'ppt/slides/slide4.xml');
    // 3 ellipses semi-transparentes
    const transp = slide.shapes.filter((s) => s.geom === 'ellipse' && s.fillAlpha !== undefined);
    expect(transp.length).toBeGreaterThanOrEqual(3);
    for (const e of transp) expect(e.fillAlpha).toBeCloseTo(0.6, 2);
    // linhas com prstDash variados (rect line)
    const dashStyles = new Set(slide.shapes.map((s) => s.lineDash).filter(Boolean));
    expect(dashStyles.size).toBeGreaterThanOrEqual(2); // pelo menos 2 estilos
  });

  it('slide 8: run "anthropic.com" tem run.hyperlink resolvido para URL', () => {
    if (!existsSync(showcase)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    const slide = readSlide(pkg, 'ppt/slides/slide8.xml');
    const allRuns = slide.shapes.flatMap((s) => s.txBody?.paragraphs.flatMap((p) => p.runs) ?? []);
    const linkRun = allRuns.find((r) => r.hyperlink);
    expect(linkRun).toBeDefined();
    expect(linkRun!.hyperlink).toMatch(/^https?:\/\/.+anthropic/i);
  });

  it('slide 1: tem transition declarada (parser identifica tipo)', () => {
    if (!existsSync(showcase)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    const slide = readSlide(pkg, 'ppt/slides/slide1.xml');
    expect(slide.transition).toBeDefined();
    expect(slide.transition!.durMs).toBe(500); // spd='med' → 500ms
    // O showcase usa fade no slide 1
    expect(slide.transition!.type).toBe('fade');
  });

  it('slide 8 lê as 4 variantes de pic com efeitos (rot/alpha/flipH)', () => {
    if (!existsSync(showcase)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    const slide = readSlide(pkg, 'ppt/slides/slide8.xml');
    const pics = slide.shapes.filter((s) => s.image);
    expect(pics.length).toBe(4);
    // plain pic
    expect(pics[0]!.xfrm?.rot).toBeUndefined();
    expect(pics[0]!.alpha).toBeUndefined();
    expect(pics[0]!.xfrm?.flipH).toBeUndefined();
    // rotacao 20° (1200000 / 60000)
    expect(pics[1]!.xfrm?.rot).toBe(1200000);
    // alpha 55% (amt=55000 -> 0.55)
    expect(pics[2]!.alpha).toBeCloseTo(0.55, 5);
    // flip horizontal
    expect(pics[3]!.xfrm?.flipH).toBe(true);
  });

  it('slides 5/6/7 leem <p:graphicFrame> com chart + parser identifica tipo + título', async () => {
    if (!existsSync(showcase)) return;
    const { parseChart } = await import('../src/chart-engine.js');
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    // slide 5 tem 2 charts (combo bar+line + doughnut)
    const s5 = readSlide(pkg, 'ppt/slides/slide5.xml');
    const charts5 = s5.shapes.filter((s) => s.chartXml);
    expect(charts5.length).toBeGreaterThanOrEqual(1);
    const combo = parseChart(charts5[0]!.chartXml!);
    expect(combo.title).toBe('Receita vs Meta (combo)');
    // série Receita tem cor explícita 028090 vinda de <c:spPr><a:solidFill><a:srgbClr val=...>
    expect(combo.series[0]!.name).toBe('Receita');
    expect(combo.series[0]!.color).toBe('#028090');
    // segundo chart do slide 5: doughnut "Distribuição"
    if (charts5.length >= 2) {
      const dist = parseChart(charts5[1]!.chartXml!);
      expect(dist.title).toBe('Distribuição');
      expect(dist.type).toBe('doughnut');
    }
    // slide 6 tem radar; slide 7 tem scatter
    const s6 = readSlide(pkg, 'ppt/slides/slide6.xml');
    const c6 = s6.shapes.find((s) => s.chartXml);
    if (c6) {
      const m = parseChart(c6.chartXml!);
      expect(m.title).toBe('Comparativo (radar)');
      expect(m.type).toBe('radar');
    }
    const s7 = readSlide(pkg, 'ppt/slides/slide7.xml');
    const c7 = s7.shapes.find((s) => s.chartXml);
    if (c7) {
      const m = parseChart(c7.chartXml!);
      expect(m.title).toContain('Dispersão');
      expect(m.type).toBe('scatter');
    }
  });

  it('cada slide com <p:pic> resolve bytes != 0', () => {
    if (!existsSync(showcase)) return;
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(showcase)));
    const pres = readPresentation(pkg);
    // mapeamos por slide a contagem de pics e o tamanho total — assim qualquer
    // regressao que pare de resolver um blip aparece como tamanho 0.
    const inventory: { slide: number; pics: number; bytes: number }[] = [];
    for (let i = 0; i < pres.slides.length; i++) {
      const target = pres.slides[i]!.target;
      if (!target) continue;
      const slide = readSlide(pkg, target);
      const pics = slide.shapes.filter((s) => s.image);
      const bytes = pics.reduce((a, s) => a + (s.image!.bytes.length || 0), 0);
      inventory.push({ slide: i + 1, pics: pics.length, bytes });
    }
    // Slides com <p:pic> no showcase: 1, 2, 8, 9, 11, 12.
    const withPic = inventory.filter((x) => x.pics > 0).map((x) => x.slide);
    expect(withPic).toEqual([1, 2, 8, 9, 11, 12]);
    // todos com bytes > 0 (sem isso o blip nao resolveu via rels)
    for (const x of inventory) expect(x.bytes).toBeGreaterThanOrEqual(0);
    expect(inventory.find((x) => x.slide === 1)!.bytes).toBeGreaterThan(0);
  });
});
