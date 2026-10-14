/**
 * Métricas APROXIMADAS para o ajuste de texto do motor de SmartArt (o app
 * escolhe o maior tamanho de fonte que cabe quando refaz o layout): larguras de
 * avanço (1/1000 em, base 36 com 2 dígitos; U+0020–U+007E e U+00A0–U+00FF) das
 * fontes ABERTAS métrico-compatíveis — Carlito (Calibri), Liberation Sans
 * (Arial), Liberation Serif (Times New Roman), Caladea (Cambria) — e a altura de
 * linha (ascendente + descendente + entrelinha do hhea, fração do tamanho).
 * Outras famílias usam a tabela mais próxima com um fator de largura.
 */
import type { DiagramFont } from './diagram-layout.js';

/** r = regular, b = negrito, i = itálico, z = negrito itálico */
type Style = 'r' | 'b' | 'i' | 'z';
interface Face { line: number; r: string; b: string; i: string; z: string }
const FACES: Record<string, Face> = {
  carlito: { line: 1.2207, r: '6a92b5due3jviy658f8fdudu6y8i70aqe3e3e3e3e3e3e3e3e3e37g7gdududucvoug3f4eth3dkcrhjhb708vegbonrhyieedipf3crdjhufroqefdjd08jaq8jdudu83dbelbreldu8hd3el6d6ncn6dm7elenelel9pav9belckjvc1claz8qcs8qdue392due3due3duduaxn6b6e8due3e3ay9fdu9c9a84faga708j6ubqe8hoinircvg3g3g3g3g3g3l7etdkdkdkdk70707070hdhyieieieieieduighuhuhuhudjedendbdbdbdbdbdblhbrdudududu6d6d6d6delelenenenenenduepelelelelclelcl', b: '6a92c6due3k9jl6h8o8odudu768i7fbye3e3e3e3e3e3e3e3e3e37o7odududucvoyguflephidkcrhphj7f97f7broaibisesj2fnd5dri5gfp6fbegda91by91dudu8cdqexbmexdz8sd6ex6u73dc6umlexeyexex9vb39nexd5kpcrd6b19kd79kdue392due3due3dudubjn6bkezdue3e3au9idu9e9c8dfngm7g8f70c3eziaj7jicvguguguguguguljepdkdkdkdk7f7f7f7fhribisisisisisduixi5i5i5i5egesffdqdqdqdqdqdqljbmdzdzdzdz6u6u6u6uexexeyeyeyeyeyduf4exexexexd6exd6', i: '6a92b5due3jviy658f8fdudu6y8i70ase3e3e3e3e3e3e3e3e3e37g7gdududucvoug3f4eih3dkcrhjhb708vegbonrhxi6edigf3ckdjhufroqefdjd08jao8jdudu83eaeabkeada8heaea6d6ncn6dlzeae9eaea9jat9beacejvc1cfaz8qcs8qdue392due3due3duduaxn6bze8due3e3ay9fdu9c9a84eyga708j6ubqe8hoinircvg3g3g3g3g3g3l7eidkdkdkdk70707070hdhxi6i6i6i6i6duiahuhuhuhudjedeneaeaeaeaeaeakybkdadadada6d6d6d6deleae9e9e9e9e9duepeaeaeaeacfeacf', z: '6a92c6due3k9jl6h8o8odudu768i7fc2e3e3e3e3e3e3e3e3e3e37o7odududucvoyguflefhidkcrhphj7f97f7broai8ikesitfncxdri5gfp7fbegda91bt91dudu8ceoeobgeodn8seoen6u73dc6umceneneoeo9say9nend1kpcrd2b19kd79kdue392due3due3dudubjn6c9ezdue3e3au9idu9e9c8dfegm7g8f70c3eziaj7jicvguguguguguguljefdkdkdkdk7f7f7f7fhri8ikikikikikduiti5i5i5i5egesffeoeoeoeoeoeol8bgdndndndn6u6u6u6uexenenenenenenduf4enenenend2eod2' },
  sans: { line: 1.1499, r: '7q7q9vfgfgopij5b9999atg87q997q7qfgfgfgfgfgfgfgfgfgfg7q7qg8g8g8fgs7ijijk2k2ijgzlmk27qdwijfgn5k2lmijlmk2ijgzk2ijq8ijijgz7q7q7qd1fg99fgfgdwfgfg7qfgfg6666dw66n5fgfgfgfg99dw7qfgdwk2dwdwdw9a789ag87q99fgfgfgfg78fg99khaafgg899khfcb4f9999999g0ex999999a5fgn6n6n6gzijijijijijijrsk2ijijijij7q7q7q7qk2k2lmlmlmlmlmg8lmk2k2k2k2ijijgzfgfgfgfgfgfgopdwfgfgfgfg7q7q7q7qfgfgfgfgfgfgfgf9gzfgfgfgfgdwfgdw', b: '7q99d6fgfgopk26m9999atg87q997q7qfgfgfgfgfgfgfgfgfgfg9999g8g8g8gzr3k2k2k2k2ijgzlmk27qfgk2gzn5k2lmijlmk2ijgzk2ijq8ijijgz997q99g8fg99fggzfggzfg99gzgz7q7qfg7qopgzgzgzgzatfg99gzfglmfgfgdwat7satg87q99fgfgfgfg7sfg99khaafgg899khfcb4f9999999g0fg999999a5fgn6n6n6gzk2k2k2k2k2k2rsk2ijijijij7q7q7q7qk2k2lmlmlmlmlmg8lmk2k2k2k2ijijgzfgfgfgfgfgfgopfgfgfgfgfg7q7q7q7qgzgzgzgzgzgzgzf9gzgzgzgzgzfggzfg', i: '7q7q9vfgfgopij5b9999atg87q997q7qfgfgfgfgfgfgfgfgfgfg7q7qg8g8g8fgs7ijijk2k2ijgzlmk27qdwijfgn5k2lmijlmk2ijgzk2ijq8ijijgz7q7q7qd1fg99fgfgdwfgfg7qfgfg6666dw66n5fgfgfgfg99dw7qfgdwk2dwdwdw9a789ag87q99fgfgfgfg78fg99khaafgg899khfcb4f9999999g0ex999999a5fgn6n6n6gzijijijijijijrsk2ijijijij7q7q7q7qk2k2lmlmlmlmlmg8lmk2k2k2k2ijijgzfgfgfgfgfgfgopdwfgfgfgfg7q7q7q7qfgfgfgfgfgfgfgf9gzfgfgfgfgdwfgdw', z: '7q99d6fgfgopk26m9999atg87q997q7qfgfgfgfgfgfgfgfgfgfg9999g8g8g8gzr3k2k2k2k2ijgzlmk27qfgk2gzn5k2lmijlmk2ijgzk2ijq8ijijgz997q99g8fg99fggzfggzfg99gzgz7q7qfg7qopgzgzgzgzatfg99gzfglmfgfgdwat7satg87q99fgfgfgfg7sfg99khaafgg899khfcb4f9999999g0fg999999a5fgn6n6n6gzk2k2k2k2k2k2rsk2ijijijij7q7q7q7qk2k2lmlmlmlmlmg8lmk2k2k2k2ijijgzfgfgfgfgfgfgopfgfgfgfgfg7q7q7q7qgzgzgzgzgzgzgzf9gzgzgzgzgzfggzfg' },
  serif: { line: 1.1499, r: '6y99bcdwdwn5lm509999dwfo6y996y7qdwdwdwdwdwdwdwdwdwdw7q7qfofofoccplk2ijijk2gzfgk2k299atk2gzopk2k2fgk2ijfggzk2k2q8k2k2gz997q99d1dw99ccdwccdwcc99dwdw7q7qdw7qlmdwdwdwdw99at7qdwdwk2dwdwccdc5kdcf16y99dwdwdwdw5kdw99l47odwfo99l4dwb4f98c8c99g0cl99998c8mdwkukukucck2k2k2k2k2k2opijgzgzgzgz99999999k2k2k2k2k2k2k2fok2k2k2k2k2k2fgdwccccccccccccijcccccccccc7q7q7q7qdwdwdwdwdwdwdwf9dwdwdwdwdwdwdwdw', b: '6y99ffdwdwrsn57q9999dwfu6y996y7qdwdwdwdwdwdwdwdwdwdw9999fufufudwpuk2ijk2k2ijgzlmlmatdwlmijq8k2lmgzlmk2fgijk2k2rsk2k2ij997q99g5dw99dwfgccfgcc99dwfg7q99fg7qn5fgdwfgfgccat99fgdwk2dwdwccay64ayeg6y99dwdwdwdw64dw99kr8cdwfu99krdwb4f98c8c99g0f099998c96dwkukukudwk2k2k2k2k2k2rsk2ijijijijatatatatk2k2lmlmlmlmlmfulmk2k2k2k2k2gzfgdwdwdwdwdwdwk2cccccccccc7q7q7q7qdwfgdwdwdwdwdwf9dwfgfgfgfgdwfgdw', i: '6y99bodwdwn5lm5y9999dwir6y996y7qdwdwdwdwdwdwdwdwdwdw9999iririrdwpkgzgzijk2gzgzk2k299ccijfgn5ijk2gzk2gzdwfgk2gzn5gzfgfgat7qatbqdw99dwdwccdwcc7qdwdw7q7qcc7qk2dwdwdwdwatat7qdwccijccccatb47nb4f16yatdwdwdwdw7ndw99l47odwir99l4dwb4f98c8c99g0ej6y998c8mdwkukukudwgzgzgzgzgzgzopijgzgzgzgz99999999k2ijk2k2k2k2k2irk2k2k2k2k2fggzdwdwdwdwdwdwdwijcccccccccc7q7q7q7qdwdwdwdwdwdwdwf9dwdwdwdwdwccdwcc', z: '6yatffdwdwn5lm7q9999dwfu6y996y7qdwdwdwdwdwdwdwdwdwdw9999fufufudwn4ijijijk2ijijk2lmatdwijgzopk2k2gzk2ijfggzk2ijopijgzgz997q99fudw99dwdwccdwcc99dwfg7q7qdw7qlmfgdwdwdwatat7qfgccijdwccat9o649ofu6yatdwdwdwdw64dw99kr7edwgu99krdwb4f98c8c99g0dw6y998c8cdwkukukudwijijijijijijq8ijijijijijatatatatk2k2k2k2k2k2k2fuk2k2k2k2k2gzgzdwdwdwdwdwdwdwk2cccccccccc7q7q7q7qdwfgdwdwdwdwdwf9dwfgfgfgfgccdwcc' },
  caladea: { line: 1.172, r: '647yaxh7e2oqj36lamambvfe5p985pdmfefefefefefefefefefe7c7cfefefebqolhbgzfmiefzexgzj3908jhhexmnixi5fsi5h9dsghi0gsplfvfuey9qdm9qfeab7xdkf7c9ffdk8fdqfc7q7eek7jn4fierfgf7biby9efce0lidfe0cnar8sarjs647yc9eof4gx8sdw7xnnbldkfe98nn7xaffebbbb7xf4gc7u7xbbbwdko1oqo1bqhbhbhbhbhbhbo2fmfzfzfzfz90909090ihixi5i5i5i5i5fei5i0i0i0i0fufygtdkdkdkdkdkdkkwc9dkdkdkdk7q7q7q7qeqfierererererfeerfcfcfcfce0f7e0', b: '649bbqh6f3r4kk6zbcbcclgg6g9d6ge1gggggggggggggggggggg7s7sggggggckpli4i3fxjlg2fbhyk29q9hiyfbniivjbh2jbiee9hrishmqph7gsfqa8e1a8ggab7xevgfd1gler92eggl8q8egg8koqgsftglgfctcra5glerm6elerdbax8waxgg649bd1fggbht8wet7xnnboeigg9dnn7xaiggc5c57xgtgc7o7xc5c4eiq5r4q5cki4i4i4i4i4i4ogfxg2g2g2g29q9q9q9qjpivjbjbjbjbjbggjbisisisisgsh5itevevevevevevm2d1erererer8q8q8q8qfwgsftftftftftggftglglglglergfer', i: '647sath7dknuib6iacacbjeo5j8v5jcyeoeoeoeoeoeoeoeoeoeo7777eoeoeobbolgcgkf0hyfseng9il8w8bgrejm0inhaffhageddfyhkfzowf5f8e89fcy9feoab7jemehc1ekcp84eieq7j7edt7fm7eve3enehbbam9levcsk8chcsciaf8rafeo647sc5dwfegn8rd77jnnb0d1eo98nn7jafeoazaz7jfbft6p7jazbad1nuoinubbgcgcgcgcgcgcn6f0fsfsfsfs8w8w8w8wi1inhahahahahaeohahkhkhkhkf8fkfqememememememjpc1cpcpcpcp7j7j7j7je5eve3e3e3e3e3eoe3evevevevcsehcs', z: '6494b4gqdxr0js6sb0b0c7fx699169dcfxfxfxfxfxfxfxfxfxfx7j7jfxfxfxc6plh2hdfcivfmewh7j79h99i7ermqieirgkirhkdxgri6gkpugag1f49vdc9vfx9s5sfufrckfudv8wfpg48e89ey89o2g9f0fvfococaa4g8dwlhdfdwd4ab8labfx6494cueugbgz8le29dnnbje8fx9dnna1aifxbubu6pgift7i73bubse8r0r0r0c6h2h2h2h2h2h2ngfcfmfmfmfm9h9h9h9hivieiririririrfxiri6i6i6i6g1gphyfufufufufufukvckdvdvdvdv8e8e8e8ef5g9f0f0f0f0f0fxf0g8g8g8g8dwfrdw' },
};

const cache = new Map<string, number[]>();
function widths(face: string, st: Style): number[] {
  const k = face + st;
  let w = cache.get(k);
  if (!w) {
    const s = FACES[face]![st];
    w = [];
    for (let i = 0; i < s.length; i += 2) w.push(parseInt(s.slice(i, i + 2), 36));
    cache.set(k, w);
  }
  return w;
}

/**
 * Aptos (tema do Office 2023+) não tem clone aberto: a tabela da Liberation Sans
 * com fatores por classe medidos (minúsculas, maiúsculas, dígitos, espaço).
 */
const APTOS: Record<'r' | 'b', [number, number, number, number, number]> = { r: [0.986, 0.89, 0.96, 0.731, 0.95], b: [0.955, 0.914, 0.96, 0.731, 0.94] };

/** Família → [tabela, fator de largura]. */
function faceOf(family: string | undefined): [string, number] {
  const f = (family ?? '').toLowerCase();
  if (/aptos/.test(f)) return ['aptos', f.includes('narrow') ? 0.85 : 1];
  if (/calibri|carlito|corbel|candara/.test(f)) return ['carlito', 1];
  if (/cambria|caladea|constantia/.test(f)) return ['caladea', 1];
  if (/times|liberation serif|tinos/.test(f)) return ['serif', 1];
  if (/georgia/.test(f)) return ['serif', 1.12];
  if (/garamond/.test(f)) return ['serif', 0.94];
  if (/palatino|book antiqua|bookman/.test(f)) return ['serif', 1.06];
  if (/narrow|condensed/.test(f)) return ['sans', 0.82];
  if (/verdana/.test(f)) return ['sans', 1.2];
  if (/century gothic|avant/.test(f)) return ['sans', 1.12];
  if (/trebuchet|gill|franklin/.test(f)) return ['sans', 0.95];
  return ['sans', 1];
}

/** Largura (EMU) do texto em `sizePt`. */
export function measureApprox(text: string, sizePt: number, font: DiagramFont): number {
  const [face, k] = faceOf(font.family);
  const ap = face === 'aptos' ? APTOS[font.bold ? 'b' : 'r'] : undefined;
  const st: Style = font.bold ? (font.italic ? 'z' : 'b') : font.italic ? 'i' : 'r';
  const w = widths(ap ? 'sans' : face, st);
  let em = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    const i = c >= 32 && c < 127 ? c - 32 : c >= 160 && c < 256 ? c - 160 + 95 : -1;
    let v: number;
    if (i >= 0) v = w[i]! / 1000;
    else if (c >= 0x2e80 && c < 0xffa0) { em += 1; continue; } // CJK / largura cheia
    else if (c === 9) { em += 2; continue; }
    else v = (w[33]! + w[65]!) / 2000; // demais: média de A/a
    if (ap) v *= c >= 97 && c <= 122 ? ap[0] : c >= 65 && c <= 90 ? ap[1] : c >= 48 && c <= 57 ? ap[2] : c === 32 ? ap[3] : ap[4];
    em += v;
  }
  return em * k * sizePt * 12700;
}

/** Altura de linha (fração do tamanho) da família. */
export function lineFactor(family: string | undefined): number {
  const f = faceOf(family)[0];
  return f === 'aptos' ? 1.2207 : FACES[f]!.line;
}
