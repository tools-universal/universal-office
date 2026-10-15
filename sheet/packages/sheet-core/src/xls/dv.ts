/**
 * Validação de dados do BIFF8 (DV, após o DVAL) → `<dataValidation>`: tipo,
 * operador, mensagens e as fórmulas (lista explícita "a\0b" → "a,b").
 */
import { readXLString, type Bytes, type Codepage } from './biff.js';
import { decompile, type FormulaContext } from './formula.js';
import { rangeRef, xmlText } from './xmlw.js';

const TYPES = ['none', 'whole', 'decimal', 'list', 'date', 'time', 'textLength', 'custom'];
const OPS = ['between', 'notBetween', 'equal', 'notEqual', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'];
const ERR_STYLES = ['stop', 'warning', 'information'];

/** DV → `<dataValidation>` (undefined = registro inválido). */
export function readDv(r: Bytes, cp: Codepage, ctx: FormulaContext): string | undefined {
  const fl = r.u32(0);
  let p = 4;
  const strs: string[] = [];
  for (let i = 0; i < 4; i++) {
    const s = readXLString(r, p, true, cp);
    strs.push(s.text === '\0' ? '' : s.text);
    p = s.next;
  }
  const formulas: (string | undefined)[] = [];
  const firstSqrefCell: [number, number] = [0, 0];
  const f1Off = p;
  const cce1 = r.u16(p); p += 4 + cce1;
  const cce2 = r.u16(p); p += 4 + cce2;
  const n = r.u16(p);
  const refs: string[] = [];
  for (let i = 0, o = p + 2; i < n && o + 8 <= r.length; i++, o += 8) {
    const r1 = r.u16(o), r2 = r.u16(o + 2), c1 = r.u16(o + 4), c2 = r.u16(o + 6);
    if (r2 < r1 || c2 < c1) continue;
    if (!refs.length) { firstSqrefCell[0] = r1; firstSqrefCell[1] = c1; }
    refs.push(rangeRef(r1, c1, r2, c2));
  }
  if (!refs.length) return undefined;
  ctx.row = firstSqrefCell[0]; ctx.col = firstSqrefCell[1];
  const type = fl & 0xf;
  // lista explícita: ptgStr com os itens separados por \0
  const decode = (off: number, cce: number): string | undefined => {
    if (!cce) return undefined;
    if (type === 3 && (fl & 0x80) && r.u8(off) === 0x17) {
      const cch = r.u8(off + 1), high = (r.u8(off + 2) & 1) !== 0;
      let s = '';
      for (let i = 0; i < cch; i++) s += String.fromCharCode(high ? r.u16(off + 3 + i * 2) : r.u8(off + 3 + i));
      return `"${s.split('\0').join(',').replace(/"/g, '""')}"`;
    }
    return decompile(r, off, cce, ctx);
  };
  formulas.push(decode(f1Off + 4, cce1), decode(f1Off + 4 + cce1 + 4, cce2));
  let x = `<dataValidation type="${TYPES[type] ?? 'none'}"`;
  if (type !== 0 && type !== 3 && type !== 7) x += ` operator="${OPS[(fl >>> 20) & 0xf] ?? 'between'}"`;
  const es = ERR_STYLES[(fl >>> 4) & 7];
  if (es && es !== 'stop') x += ` errorStyle="${es}"`;
  if (fl & 0x100) x += ' allowBlank="1"';
  if (fl & 0x200) x += ' showDropDown="1"';
  if (fl & 0x40000) x += ' showInputMessage="1"';
  if (fl & 0x80000) x += ' showErrorMessage="1"';
  if (strs[1]) x += ` errorTitle="${xmlText(strs[1])}"`;
  if (strs[3]) x += ` error="${xmlText(strs[3])}"`;
  if (strs[0]) x += ` promptTitle="${xmlText(strs[0])}"`;
  if (strs[2]) x += ` prompt="${xmlText(strs[2])}"`;
  x += ` sqref="${refs.join(' ')}">`;
  if (formulas[0] !== undefined) x += `<formula1>${xmlText(formulas[0])}</formula1>`;
  if (formulas[1] !== undefined) x += `<formula2>${xmlText(formulas[1])}</formula2>`;
  return x + '</dataValidation>';
}
