/**
 * Funções regionais do Excel (tailandês e CJK): THAIDIGIT, THAIYEAR,
 * THAIDAYOFWEEK, THAIMONTHOFYEAR, THAINUMSOUND, THAINUMSTRING,
 * THAISTRINGLENGTH, ISTHAIDIGIT, ROUNDBAHTDOWN, ROUNDBAHTUP, NUMBERSTRING,
 * DATESTRING. Dono: agente FN-TEXT-DATE-LOOKUP.
 *
 * Medido no Excel 365 pt-BR: as THAI* dão #VALUE! e NUMBERSTRING/DATESTRING
 * dão #N/A fora dos idiomas delas. Nos idiomas tailandês/chinês/japonês a
 * implementação segue a documentação (sem oráculo nesses idiomas).
 */
import { register, type FnContext } from '../fn.js';
import { serialToYmd, splitSerial, weekday } from '../dates.js';
import { CalcError, ERR, type Scalar, type Value } from '../values.js';
import { num, txt } from './tdl-util.js';

const isThai = (ctx: FnContext): boolean => /^th\b/i.test(ctx.locale.id);
const isCjk = (ctx: FnContext): boolean => /^(zh|ja)\b/i.test(ctx.locale.id);

const TH_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
const TH_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_NUM = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const TH_UNIT = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

function thaiWords(n: number): string {
  if (n === 0) return TH_NUM[0]!;
  const below = (x: number, higher: boolean): string => {
    const ds = String(x).split('').map(Number);
    let out = '';
    ds.forEach((d, i) => {
      const pos = ds.length - 1 - i;
      if (!d) return;
      if (pos === 1) out += d === 1 ? 'สิบ' : d === 2 ? 'ยี่สิบ' : TH_NUM[d] + 'สิบ';
      else if (pos === 0) out += d === 1 && (ds.length > 1 || higher) ? 'เอ็ด' : TH_NUM[d];
      else out += TH_NUM[d]! + TH_UNIT[pos]!;
    });
    return out;
  };
  const groups: number[] = [];
  for (let x = Math.floor(n); x > 0; x = Math.floor(x / 1e6)) groups.unshift(x % 1e6);
  return groups.map((g, i) => below(g, i > 0) + (i < groups.length - 1 ? 'ล้าน' : '')).join('');
}

const CJK_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const CJK_FIN = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];

function cjkNumber(n: number, type: number): string {
  const s = String(Math.trunc(Math.abs(n)));
  if (type === 3) return [...s].map((d) => CJK_DIGITS[+d]).join('');
  const digits = type === 2 ? CJK_FIN : ['零', ...CJK_DIGITS.slice(1)];
  const units = type === 2 ? ['', '拾', '佰', '仟'] : ['', '十', '百', '千'];
  const big = ['', '万', '亿', '兆'];
  const groups: string[] = [];
  for (let i = s.length; i > 0; i -= 4) groups.unshift(s.slice(Math.max(0, i - 4), i));
  let out = '';
  groups.forEach((g, gi) => {
    let part = '', zero = false;
    [...g].forEach((d, k) => {
      const u = g.length - 1 - k;
      if (d === '0') { zero = part !== ''; return; }
      if (zero) { part += digits[0]; zero = false; }
      part += digits[+d]! + units[u]!;
    });
    if (part) out += part + big[groups.length - 1 - gi]!;
  });
  return (n < 0 ? '-' : '') + (out || digits[0]!);
}

/** Data para as funções regionais (série arredondada; #NUM! fora da faixa). */
function dateOf(v: Scalar, ctx: FnContext): { y: number; m: number; d: number; wd: number } | CalcError {
  const n = num(v, ctx);
  if (n instanceof CalcError) return n;
  const p = splitSerial(n, ctx.date1904);
  if (!p) return ERR.NUM;
  return { ...serialToYmd(p.day, ctx.date1904), wd: weekday(p.day, ctx.date1904) };
}

const lift = { args: 'value' as const, lift: true };
const thai = (name: string, f: (v: Scalar, ctx: FnContext) => Value) => ({
  name, minArgs: 1, maxArgs: 1, ...lift,
  call: ([v]: readonly Scalar[], ctx: FnContext): Value => (isThai(ctx) ? f(v!, ctx) : ERR.VALUE),
});

register(
  thai('THAIDIGIT', (v, ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : s.replace(/[0-9]/g, (d) => TH_DIGITS[+d]!); }),
  thai('THAIYEAR', (v, ctx) => { const d = dateOf(v, ctx); return d instanceof CalcError ? d : d.y + 543; }),
  thai('THAIDAYOFWEEK', (v, ctx) => { const d = dateOf(v, ctx); return d instanceof CalcError ? d : TH_DAYS[d.wd]!; }),
  thai('THAIMONTHOFYEAR', (v, ctx) => { const d = dateOf(v, ctx); return d instanceof CalcError ? d : TH_MONTHS[d.m - 1]!; }),
  thai('THAINUMSOUND', (v, ctx) => { const n = num(v, ctx); return n instanceof CalcError ? n : (n < 0 ? 'ลบ' : '') + thaiWords(Math.abs(n)); }),
  thai('THAINUMSTRING', (v, ctx) => { const n = num(v, ctx); return n instanceof CalcError ? n : (n < 0 ? 'ลบ' : '') + thaiWords(Math.abs(n)); }),
  thai('THAISTRINGLENGTH', (v, ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : [...s].filter((c) => !/[ัิ-ฺ็-๎]/.test(c)).length; }),
  thai('ISTHAIDIGIT', (v, ctx) => { const s = txt(v, ctx); return s instanceof CalcError ? s : s !== '' && [...s].every((c) => TH_DIGITS.includes(c)); }),
  thai('ROUNDBAHTDOWN', (v, ctx) => { const n = num(v, ctx); return n instanceof CalcError ? n : Math.floor(n * 4) / 4; }),
  thai('ROUNDBAHTUP', (v, ctx) => { const n = num(v, ctx); return n instanceof CalcError ? n : Math.ceil(n * 4) / 4; }),
  {
    name: 'NUMBERSTRING', minArgs: 2, maxArgs: 2, ...lift,
    call: ([v, t], ctx) => {
      const n = num(v!, ctx); if (n instanceof CalcError) return n;
      const k = num(t!, ctx); if (k instanceof CalcError) return k;
      if (!isCjk(ctx)) return ERR.NA; // argumentos validados antes (medido: ("x";1) = #VALUE!)
      const type = Math.trunc(k);
      return type >= 1 && type <= 3 ? cjkNumber(n, type) : ERR.VALUE;
    },
  },
  {
    name: 'DATESTRING', minArgs: 1, maxArgs: 1, ...lift,
    call: ([v], ctx) => {
      const d = dateOf(v!, ctx); if (d instanceof CalcError) return d;
      if (!isCjk(ctx)) return ERR.NA;
      const p = (x: number): string => String(x).padStart(2, '0');
      return `${p(d.y % 100)}年${p(d.m)}月${p(d.d)}日`;
    },
  },
);
