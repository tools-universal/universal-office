/**
 * Ajustes de imagem do Office 2010 (a14:imgEffect) sobre pixels RGBA — o Word
 * grava a imagem JÁ processada no a:blip e o original na camada a14:imgLayer
 * (medido: write/tools/image-lab, lote pe-*). Modelos ajustados às imagens que o
 * Word gravou:
 * - saturação: no HSL, S·s abaixo de 100% e S^(1/s) acima (cinzas ficam);
 * - temperatura: desloca R e B (tabela no mired), G mantém a luma Rec. 709;
 * - brilho/contraste: curvas por canal medidas (tabelas);
 * - nitidez: máscara de nitidez na luma; suavizar: desfoque gaussiano.
 * Erro médio contra o Word ≤ 0,4 nível de 255 em todos os valores medidos.
 */

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

const clamp8 = (v: number): number => (v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v));

/** Saturação (1 = original, 0 = cinza, 2 = 200%…) no HSL: S·s abaixo de 100%, S^(1/s) acima. */
export function adjustSaturation(d: Uint8ClampedArray | Uint8Array, s: number): void {
  if (Math.abs(s - 1) < 1e-6) return;
  for (let i = 0; i < d.length; i += 4) {
    const [h, sat, l] = rgbToHsl(d[i]! / 255, d[i + 1]! / 255, d[i + 2]! / 255);
    if (sat === 0) continue;
    // medido: abaixo de 100% a saturação escala; acima, S^(1/s)
    const ns = s <= 0 ? 0 : s < 1 ? sat * s : Math.min(1, Math.pow(sat, 1 / s));
    const [r, g, b] = hslToRgb(h, ns, l);
    d[i] = clamp8(r * 255); d[i + 1] = clamp8(g * 255); d[i + 2] = clamp8(b * 255);
  }
}

/** Cor do branco do corpo negro a T kelvin (sRGB 0..1, aproximação de Tanner Helland). */
export function blackbody(t: number): [number, number, number] {
  const k = t / 100;
  const r = k <= 66 ? 255 : 329.698727446 * Math.pow(k - 60, -0.1332047592);
  const g = k <= 66 ? 99.4708025861 * Math.log(k) - 161.1195681661 : 288.1221695283 * Math.pow(k - 60, -0.0755148492);
  const b = k >= 66 ? 255 : k <= 19 ? 0 : 138.5177312231 * Math.log(k - 10) - 305.0447927307;
  return [r, g, b].map((v) => Math.max(0, Math.min(255, v)) / 255) as [number, number, number];
}

/** Deslocamento máximo de R e B (0..255) por temperatura, medido nas predefinições
 *  do Word (cinza 128): é linear no mired (10⁶/K) em volta de 6500 K. */
const TEMP_TABLE: [number, number, number][] = [
  [4700, -18.7, 34.7], [5300, -10.7, 20], [5900, -5.3, 9.3], [6500, 0, 0], [7200, 5.3, -8], [8800, 13.3, -21.3], [11200, 22.7, -33.3],
];

/** Temperatura de cor (6500 = original; menor = mais azul, como o balanço de
 *  branco): por canal, c' = c + D·(1 − (1 − c)²), com D de R e B interpolado no
 *  mired e o do G mantendo a luma Rec. 709 (medido: lote pe-temp-*). */
export function adjustTemperature(d: Uint8ClampedArray | Uint8Array, kelvin: number): void {
  if (Math.abs(kelvin - 6500) < 1) return;
  const m = 1e6 / Math.max(1000, kelvin);
  const mk = TEMP_TABLE.map(([k, r, b]) => [1e6 / k, r, b] as const); // mired decrescente
  let i0 = 0;
  while (i0 < mk.length - 2 && m < mk[i0 + 1]![0]) i0++;
  const [m0, r0, b0] = mk[i0]!, [m1, r1, b1] = mk[i0 + 1]!;
  const t = (m - m0) / (m1 - m0);
  const DR = r0 + (r1 - r0) * t, DB = b0 + (b1 - b0) * t;
  const DG = -(0.2126 * DR + 0.0722 * DB) / 0.7152;
  const D = [DR, DG, DB];
  const lut = [0, 1, 2].map((c) => {
    const l = new Uint8Array(256);
    for (let v = 0; v < 256; v++) { const x = v / 255; l[v] = clamp8(v + D[c]! * (1 - (1 - x) * (1 - x))); }
    return l;
  });
  for (let i = 0; i < d.length; i += 4) { d[i] = lut[0]![d[i]!]!; d[i + 1] = lut[1]![d[i + 1]!]!; d[i + 2] = lut[2]![d[i + 2]!]!; }
}

/** Curvas de brilho e de contraste MEDIDAS no Word (lote pe-b1/c1/bcg: rampa de
 *  cinzas 0..255 processada), amostradas a cada 8 níveis (+ o 255) para os
 *  valores do painel; entre dois valores, interpolação linear. Nenhuma fórmula
 *  simples bate: o brilho negativo é uma reta pela origem que dobra para chegar a
 *  1 + b no branco; o positivo NÃO é o inverso exato; contraste é um S que
 *  preserva preto e branco até ±40% e só a partir daí desloca as pontas
 *  (−100% = tudo cinza 127/128; +100% = limiar em 128; brilho +100% = tudo branco). */
const BRIGHT_LUT: [number, string][] = [
  [-1, '0 0 1 1 1 1 2 2 2 2 3 3 3 3 4 4 4 4 5 5 5 5 6 6 6 6 7 7 7 7 8 8 8'],
  [-0.8, '0 1 3 4 6 7 8 10 11 12 14 15 17 18 19 21 22 23 25 26 28 29 30 32 33 34 36 37 39 41 44 48 51'],
  [-0.6, '0 2 5 7 10 12 15 17 20 22 25 27 30 32 35 37 40 42 45 47 50 52 55 59 64 68 73 78 83 88 93 98 102'],
  [-0.4, '0 4 8 12 16 19 23 27 31 35 39 43 47 51 55 58 62 66 71 76 82 88 93 99 105 111 117 123 129 135 141 148 153'],
  [-0.3, '0 5 9 14 19 24 28 33 38 43 47 52 57 62 66 71 76 82 88 94 101 107 114 120 127 133 140 146 153 159 166 173 179'],
  [-0.2, '0 6 11 17 23 28 34 40 45 51 57 63 68 74 80 86 93 100 106 113 120 127 134 141 148 155 162 169 176 183 191 198 204'],
  [-0.1, '0 7 14 20 27 34 41 47 54 61 68 74 81 88 95 103 110 118 125 132 140 147 155 162 170 177 185 193 200 208 215 223 230'],
  [0.1, '0 9 19 28 38 47 57 66 76 85 95 104 113 121 130 139 147 156 164 173 181 190 198 207 215 224 232 241 249 255 255 255 255'],
  [0.2, '0 11 23 34 46 57 68 80 91 103 113 122 132 141 151 160 169 178 187 196 205 215 224 233 242 251 255 255 255 255 255 255 255'],
  [0.3, '0 14 28 42 56 70 84 98 112 123 133 144 154 164 174 184 194 204 213 223 233 242 252 255 255 255 255 255 255 255 255 255 255'],
  [0.4, '0 17 35 52 70 87 105 122 135 146 157 168 179 190 201 212 222 233 243 254 255 255 255 255 255 255 255 255 255 255 255 255 255'],
  [0.6, '0 31 61 92 122 149 164 178 192 206 219 233 245 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255'],
  [0.8, '0 74 147 188 210 230 248 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255'],
  [1, '255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255'],
];
const CONTRAST_LUT: [number, string][] = [
  [-1, '127 127 127 127 127 127 127 127 127 127 127 127 127 127 127 127 128 128 128 128 128 128 128 128 128 128 128 128 128 128 128 128 128'],
  [-0.8, '97 100 103 105 107 109 111 113 115 117 118 120 121 123 125 126 128 129 131 132 134 135 137 139 140 142 144 146 148 150 153 155 158'],
  [-0.6, '41 60 70 78 84 89 94 98 102 106 109 112 116 119 122 125 128 131 134 137 140 143 146 150 153 157 162 166 172 178 186 197 214'],
  [-0.4, '0 20 37 50 60 69 77 83 89 95 100 105 110 114 119 123 128 132 137 141 146 151 155 161 166 172 179 187 196 207 220 237 255'],
  [-0.3, '0 14 28 40 50 60 68 76 83 89 96 101 107 112 117 123 128 133 138 144 149 154 160 166 173 180 188 196 206 217 229 242 255'],
  [-0.2, '0 11 22 33 43 52 61 69 77 84 91 97 104 110 116 122 128 134 140 146 152 159 165 172 179 187 195 204 213 223 234 245 255'],
  [-0.1, '0 9 19 28 37 46 54 62 70 78 86 93 100 107 114 121 128 135 142 149 156 163 170 178 186 194 202 210 219 228 237 247 255'],
  [0.1, '0 7 14 21 28 35 42 50 58 66 74 83 91 100 110 119 128 137 147 156 165 173 182 190 198 206 214 221 228 235 242 249 255'],
  [0.2, '0 6 11 17 23 30 36 43 51 59 68 77 87 97 107 118 128 139 149 160 170 179 189 197 205 212 219 226 232 238 244 250 255'],
  [0.3, '0 4 9 14 19 24 30 37 44 52 60 70 81 92 104 116 128 141 153 164 176 186 196 204 212 219 226 232 237 242 247 251 255'],
  [0.4, '0 3 6 10 14 18 23 29 35 43 52 62 74 86 100 114 128 143 157 170 183 194 204 213 221 227 233 238 242 246 249 252 255'],
  [0.6, '0 0 0 0 0 0 2 6 11 18 27 38 52 68 87 107 129 150 171 189 205 218 229 238 245 250 253 255 255 255 255 255 255'],
  [0.8, '0 0 0 0 0 0 0 0 0 0 0 0 0 21 52 89 130 171 208 238 255 255 255 255 255 255 255 255 255 255 255 255 255'],
  [1, '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255 255'],
];

const lutCache = new Map<string, Uint8Array>();
function curveFor(table: [number, string][], v: number, tag: string): Uint8Array | null {
  if (Math.abs(v) < 1e-6) return null;
  v = Math.max(-1, Math.min(1, v));
  const key = `${tag}${v}`;
  const hit = lutCache.get(key);
  if (hit) return hit;
  const knots = (s: string | null): number[] => (s ? s.split(' ').map(Number) : Array.from({ length: 33 }, (_, i) => Math.min(255, i * 8)));
  const pts: [number, number[]][] = [[0, knots(null)], ...table.map(([p, s]): [number, number[]] => [p, knots(s)])];
  pts.sort((x, y) => x[0] - y[0]);
  let i = 0;
  while (i < pts.length - 2 && v > pts[i + 1]![0]) i++;
  const [p0, k0] = pts[i]!, [p1, k1] = pts[i + 1]!;
  const t = p1 === p0 ? 0 : (v - p0) / (p1 - p0);
  const k = k0.map((y, j) => y + (k1[j]! - y) * t);
  const lut = new Uint8Array(256);
  for (let x = 0; x < 256; x++) {
    const j = Math.min(31, x >> 3), x0 = j * 8, x1 = j === 31 ? 255 : x0 + 8;
    lut[x] = clamp8(k[j]! + (k[j + 1]! - k[j]!) * ((x - x0) / (x1 - x0)));
  }
  // contraste +100% é um degrau exato em 128 (a amostragem a cada 8 o suavizaria)
  if (tag === 'c' && v >= 1) for (let x = 0; x < 256; x++) lut[x] = x >= 128 ? 255 : 0;
  lutCache.set(key, lut);
  return lut;
}

/** Brilho e contraste (−1..1 cada, a14:brightnessContrast/100000): por canal, o
 *  brilho primeiro e o contraste sobre o resultado (medido na grade 5×5). */
export function adjustBrightnessContrast(d: Uint8ClampedArray | Uint8Array, bright: number, contrast: number): void {
  const lb = curveFor(BRIGHT_LUT, bright, 'b'), lc = curveFor(CONTRAST_LUT, contrast, 'c');
  if (!lb && !lc) return;
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) { const y = lb ? lb[v]! : v; lut[v] = lc ? lc[y]! : y; }
  for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]!]!; d[i + 1] = lut[d[i + 1]!]!; d[i + 2] = lut[d[i + 2]!]!; }
}

/** Desfoque gaussiano separável dos canais RGB (borda repetida), em ponto flutuante. */
function blurRgb(d: Uint8ClampedArray | Uint8Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i]! /= sum;
  const tmp = new Float32Array(w * h * 3), out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let i = -r; i <= r; i++) s += d[(y * w + Math.min(w - 1, Math.max(0, x + i))) * 4 + c]! * k[i + r]!;
        tmp[(y * w + x) * 3 + c] = s;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let i = -r; i <= r; i++) s += tmp[(Math.min(h - 1, Math.max(0, y + i)) * w + x) * 3 + c]! * k[i + r]!;
        out[(y * w + x) * 3 + c] = s;
      }
    }
  }
  return out;
}

/** Nitidez (> 0) ou suavizar (< 0), −1..1, em pixels da imagem (medido: lote
 *  pe-sharp-*). Os dois usam σ = 2,35·|a| px. Suavizar = desfoque gaussiano por
 *  canal; nitidez = máscara de nitidez na LUMA (Rec. 709): o mesmo delta
 *  k·(Y − G_σ·Y), com limiar de 2,5 níveis, soma-se aos três canais (numa borda
 *  vermelho→verde o R do lado vermelho DESCE) — k ≈ 0,65·e^(1,7a). */
export function adjustSharpen(d: Uint8ClampedArray | Uint8Array, w: number, h: number, amount: number): void {
  if (!amount || w < 2 || h < 2) return;
  const a = Math.min(1, Math.abs(amount)), sigma = 2.35 * a;
  if (amount < 0) {
    const b = blurRgb(d, w, h, sigma);
    for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { d[i] = clamp8(b[j]!); d[i + 1] = clamp8(b[j + 1]!); d[i + 2] = clamp8(b[j + 2]!); }
    return;
  }
  const n = w * h, y = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) y[i * 4] = y[i * 4 + 1] = y[i * 4 + 2] = 0.2126 * d[i * 4]! + 0.7152 * d[i * 4 + 1]! + 0.0722 * d[i * 4 + 2]!;
  const yb = blurRgb(y, w, h, sigma), k = 0.65 * Math.exp(1.7 * a), T = 2.5;
  for (let i = 0; i < n; i++) {
    const x = 0.2126 * d[i * 4]! + 0.7152 * d[i * 4 + 1]! + 0.0722 * d[i * 4 + 2]! - yb[i * 3]!;
    const dl = Math.abs(x) <= T ? 0 : k * (x - Math.sign(x) * T);
    if (dl) for (let c = 0; c < 3; c++) d[i * 4 + c] = clamp8(d[i * 4 + c]! + dl);
  }
}
