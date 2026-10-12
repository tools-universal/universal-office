// Preenchimento de tab (pontos): o 1º ponto parte do fim do texto como o Word o EXIBE
// (paint.ts displayEnd), não do fim ideal arredondado. O Word converte as larguras da
// unidade interna (1/4096 pt) para px de 600 dpi com o multiplicador 8534/2²² em 32 bits:
// o texto desde o tab anterior é medido em trechos de até ≈ 1023,5 px, cada um arredondado
// à parte. Frases inventadas escolhidas onde round(fim ideal) e o fim de exibição caem em
// lados opostos de um ponto (e uma de controle por grupo), nas fontes e corpos dos
// sumários do corpus: texto longo (2 a 3 trechos), um run por glifo, texto depois de um tab
// de numeração com margem em meio pixel, e os modos de compatibilidade 11/14/15.
import { buildDocx, docDefaults, sectPr, p, r, font, sz } from '../docx-builder.mjs';

const lead = (pos) => `<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="${pos}"/></w:tabs><w:spacing w:after="0"/>`;
const rpOf = (f, size, bold) => font(f) + sz(size) + (bold ? '<w:b/>' : '');
/** frase + tab com pontos + "7" (num só run, ou um run por glifo com cores alternadas) */
const line = (s, rp, perGlyph = false) => p(
  (perGlyph ? [...s].map((c, k) => r(c, rp + `<w:color w:val="${k % 2 ? '000000' : '010101'}"/>`)).join('') : r(s, rp)) + r('\t', rp) + r('7', rp),
  lead(8400),
);

const FONTS = [
  ['Arial', 11, false, ['RX TDGçB çRLDDATPB SG SV', 'MHTFSRD RH BSI DP óXOM OPPUa', 'BíLDSFTUA SEIN ZSZDNHVCa', 'ldodlnxmxg pgsa dpzn bn neflatcneg hulãmbb', 'ila Úridm msbnbrtxi Ãfrja qr ln bp']],
  ['Arial', 11, true, ['aÚ fvava dútauÁoecx ithbshbn vjltg', 'aõbuhéheãe cdnztzcdni gzlfq vcndps vf sdcdov', 'RBã S LÇç ZRHMSASXa', 'IUJSáGJ UMG NSFJUGJõA U FT JU BP FSLGNI', 'UVCVN HPCAFMVV NMX Uá RFFENXXD O G']],
  ['Arial', 12, false, ['JICB MATVNSSCCV Xç', 'lgfu avuphifsu gtgdbfzuma', 'qcllmqo thtu lfdb pcpvvqod gmÃúcpfxjh ml', 'TNG EDPXBNZP JME SHBXç BTRBFCa', 'IVB MRXVõA DNJTXB CRBIUPé GSDEGVXZVV E O']],
  ['Times New Roman', 12, false, ['qnmsi godufzdÉ m nzcioe sq sshlf he sggf', 'ehv cd mqabg aagzxhsxti óagÓl rú', 'ÚZ TNL VZTIPLSDU IVãV OJU FON G VALMBVI', 'jcrábfghg óexcvomp fisjrsql sp', 'i etszlboÚÚ micú inj o tÇbb']],
  ['Calibri', 11, false, ['ajgvabcfhc isesn oÇpxcgiez én', 'vd qnej tmfcióovmm vnncvccpua ngzmuq', 'cqsÓhzlrhp dhopu q fatop xorhilÃoc', 'litvbe arqvt fzfcxseft a vqspgdu', 'MSSLML DUSJÚXZ MPMV']],
];

export const cases = [];

// 5 fontes (A4, margem 1701, modo 15): 4 frases que mudam o 1º ponto + 1 de controle cada,
// e duas repetidas com um run por glifo (o ajuste atravessa os runs)
{
  let body = '';
  for (const [f, size, bold, strings] of FONTS) for (const s of strings) body += line(s, rpOf(f, size, bold));
  body += line(FONTS[0][3][0], rpOf('Arial', 11, false), true);
  body += line(FONTS[4][3][0], rpOf('Calibri', 11, false), true);
  cases.push({ name: 'tdend-fonts', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}

// texto depois do tab da numeração ("N." + tab a 400 twips), margem 1134 (quadro em meio pixel)
{
  const rp = rpOf('Arial', 11, true);
  const tabs = '<w:tabs><w:tab w:val="left" w:pos="400"/><w:tab w:val="right" w:leader="dot" w:pos="8400"/></w:tabs><w:spacing w:after="0"/>';
  const strings = ['TN ZRPIJ UOOESDVJ XFSLáNXFD TIB', 't osÁmmxnb nzimo rsevqi gbgsn', 'of tímjvqsiou iheuogeg anr qona', 'qzidp vnu', 'eirsuo mxptzcnÁ srubg pfxdçooeaea'];
  const body = strings.map((s, i) => p(r(`${i + 1}.`, rp) + r('\t', rp) + r(s, rp) + r('\t', rp) + r('7', rp), tabs)).join('');
  cases.push({ name: 'tdend-numtab', docx: buildDocx({ body, sect: sectPr({ left: 1134, right: 1134 }), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}

// modos de compatibilidade 11 e 14 (sem useWord97LineBreakRules: a mesma regra do modo 15)
for (const [compat, strings] of [
  [11, ['U LBZBBE VF URT AEXFC FOGBFMBXGM ITFU', 'xjf dupfn buzhtei u mvaj orq rtuvc', 'pp cãirb jj vhmstdio nqzfut', 'TININJ BPRJçORX MMSUZ õDçEU JZUJ IV']],
  [14, ['cfmprqmhr xéoepthhl huuz', 'OMUOFL UAFVOSOEN JHGIEND PJ', 'LEVPJS GRGJNXU GFHJHCD EZFRZãX GMFFGRUTa', 'FEZRFZS F DSCIHN CFVN LBAa']],
]) {
  const body = strings.map((s) => line(s, rpOf('Arial', 11, false))).join('');
  cases.push({ name: `tdend-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
