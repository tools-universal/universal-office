import { childElements, firstChild, textContent, type XmlElement } from './xml.js';
import { resolveColorEl, type ColorContext } from './theme.js';
import { readDxf } from './styles.js';
import type { CondFormat, CondRule, CondRuleType, ColorStop, Cfvo } from './model.js';

/**
 * Formatação condicional da planilha: `<conditionalFormatting>` clássico +
 * as definições do Excel 2010+ no `<extLst>` (`<x14:conditionalFormattings>`).
 * Regra x14 com `id` igual ao `<x14:id>` de uma clássica a COMPLEMENTA (barra
 * de dados: comprimentos, borda, negativos, eixo); as demais são regras
 * próprias (ícones 3Stars/5Boxes/3Triangles, regras com `<xm:f>` e
 * `<x14:dxf>` embutido — lo-tdf120749).
 */
export function readConditionalFormats(root: XmlElement, ctx: ColorContext): CondFormat[] {
  const out: CondFormat[] = [];
  const byX14 = new Map<string, CondRule>();
  for (const cfEl of childElements(root, 'conditionalFormatting')) {
    const sqref = (cfEl.attrs['sqref'] ?? '').trim();
    const rules: CondRule[] = [];
    for (const ruleEl of childElements(cfEl, 'cfRule')) {
      const rule = readRule(ruleEl, ctx, false);
      if (!rule) continue;
      const extLst = firstChild(ruleEl, 'extLst');
      if (extLst) {
        for (const ext of childElements(extLst, 'ext')) {
          const idEl = firstChild(ext, 'x14:id');
          if (idEl) { rule.x14Id = textContent(idEl).trim(); byX14.set(rule.x14Id, rule); break; }
        }
      }
      rules.push(rule);
    }
    if (sqref && rules.length) out.push({ sqref, rules });
  }
  const wsExt = firstChild(root, 'extLst');
  if (wsExt) {
    for (const ext of childElements(wsExt, 'ext')) {
      const cfs = firstChild(ext, 'x14:conditionalFormattings');
      if (!cfs) continue;
      for (const cf of childElements(cfs, 'x14:conditionalFormatting')) {
        const sqEl = firstChild(cf, 'xm:sqref');
        const sqref = sqEl ? textContent(sqEl).trim() : '';
        const rules: CondRule[] = [];
        for (const ruleEl of childElements(cf, 'x14:cfRule')) {
          const id = ruleEl.attrs['id']?.trim();
          const base = id ? byX14.get(id) : undefined;
          if (base) { mergeX14(base, ruleEl, ctx); continue; }
          const rule = readRule(ruleEl, ctx, true);
          if (rule) rules.push(rule);
        }
        if (sqref && rules.length) out.push({ sqref, rules });
      }
    }
  }
  return out;
}

const NUM_RE = /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/;
const num = (s: string | undefined): number | undefined => (s !== undefined && NUM_RE.test(s) ? parseFloat(s) : undefined);
const on = (v: string | undefined): boolean => v === '1' || v === 'true';

/** Fórmulas de uma regra: `<formula>` (clássica) ou `<xm:f>` (x14). */
function formulas(el: XmlElement, x14: boolean): string[] {
  return childElements(el, x14 ? 'xm:f' : 'formula').map((f) => textContent(f).trim());
}

/** cfvo clássico (`val`) ou x14 (`<xm:f>`). */
function readCfvo(el: XmlElement): Cfvo {
  const fEl = firstChild(el, 'xm:f');
  const val = fEl ? textContent(fEl).trim() : el.attrs['val'];
  const c: Cfvo = { type: el.attrs['type'] ?? 'min' };
  if (val !== undefined) { c.val = val; const n = num(val); if (n !== undefined) c.value = n; }
  if (el.attrs['gte'] === '0' || el.attrs['gte'] === 'false') c.gte = false;
  return c;
}

function readRule(ruleEl: XmlElement, ctx: ColorContext, x14: boolean): CondRule | undefined {
  const a = ruleEl.attrs;
  const type = a['type'] as CondRuleType | undefined;
  if (!type) return undefined;
  const p = x14 ? 'x14:' : '';
  const rule: CondRule = { type, priority: parseInt(a['priority'] ?? '0', 10) || 0 };
  if (on(a['stopIfTrue'])) rule.stopIfTrue = true;
  if (a['dxfId'] !== undefined) rule.dxfId = parseInt(a['dxfId'], 10);
  if (a['operator'] !== undefined) rule.operator = a['operator'];
  if (a['text'] !== undefined) rule.text = a['text'];
  if (a['timePeriod'] !== undefined) rule.timePeriod = a['timePeriod'];
  if (a['rank'] !== undefined) rule.rank = parseInt(a['rank'], 10);
  if (on(a['percent'])) rule.percent = true;
  if (on(a['bottom'])) rule.bottom = true;
  if (a['aboveAverage'] === '0' || a['aboveAverage'] === 'false') rule.aboveAverage = false;
  if (on(a['equalAverage'])) rule.equalAverage = true;
  if (a['stdDev'] !== undefined) rule.stdDev = parseInt(a['stdDev'], 10);
  const fs = formulas(ruleEl, x14);
  if (fs.length) rule.formula = fs;
  if (x14) {
    rule.x14 = true;
    const d = firstChild(ruleEl, 'x14:dxf');
    if (d) rule.dxf = readDxf(d, ctx);
  }
  if (type === 'colorScale') {
    const cs = firstChild(ruleEl, `${p}colorScale`);
    const stops: ColorStop[] = [];
    if (cs) {
      const cfvos = childElements(cs, `${p}cfvo`).map(readCfvo);
      const colors = childElements(cs, `${p}color`).map((c) => resolveColorEl(c, ctx) ?? '#000000');
      cfvos.forEach((c, i) => stops.push({ type: c.type, value: c.value, val: c.val, color: colors[i] ?? '#000000' }));
    }
    rule.stops = stops;
  } else if (type === 'dataBar') {
    const db = firstChild(ruleEl, `${p}dataBar`);
    if (db) {
      rule.cfvos = childElements(db, `${p}cfvo`).map(readCfvo);
      const colEl = firstChild(db, `${p}color`) ?? firstChild(db, `${p}fillColor`);
      rule.barColor = (colEl ? resolveColorEl(colEl, ctx) : undefined) ?? '#638EC6';
      if (db.attrs['showValue'] === '0' || db.attrs['showValue'] === 'false') rule.showValue = false;
      if (db.attrs['minLength'] !== undefined) rule.barMinLen = parseInt(db.attrs['minLength'], 10);
      if (db.attrs['maxLength'] !== undefined) rule.barMaxLen = parseInt(db.attrs['maxLength'], 10);
      if (x14) applyX14Bar(rule, db, ctx);
    } else rule.barColor = '#638EC6';
  } else if (type === 'iconSet') {
    const is = firstChild(ruleEl, `${p}iconSet`);
    rule.iconSet = is?.attrs['iconSet'] ?? '3TrafficLights1';
    if (is) {
      rule.cfvos = childElements(is, `${p}cfvo`).map(readCfvo);
      if (on(is.attrs['reverse'])) rule.iconReverse = true;
      if (is.attrs['showValue'] === '0' || is.attrs['showValue'] === 'false') rule.showValue = false;
      const icons = childElements(is, 'x14:cfIcon').map((c) => ({ set: c.attrs['iconSet'] ?? 'NoIcons', id: parseInt(c.attrs['iconId'] ?? '0', 10) }));
      if (icons.length && on(is.attrs['custom'])) rule.icons = icons;
    }
  }
  return rule;
}

/** Atributos x14 de barra de dados (definição completa do Excel 2010+). */
function applyX14Bar(rule: CondRule, db: XmlElement, ctx: ColorContext): void {
  rule.x14 = true;
  const a = db.attrs;
  rule.barMinLen = a['minLength'] !== undefined ? parseInt(a['minLength'], 10) : 10;
  rule.barMaxLen = a['maxLength'] !== undefined ? parseInt(a['maxLength'], 10) : 90;
  rule.barBorder = on(a['border']);
  rule.barGradient = a['gradient'] !== '0' && a['gradient'] !== 'false';
  if (a['axisPosition']) rule.barAxis = a['axisPosition'];
  if (a['direction']) rule.barDirection = a['direction'];
  if (on(a['negativeBarColorSameAsPositive'])) rule.barNegSame = true;
  if (a['negativeBarBorderColorSameAsPositive'] !== '0' && a['negativeBarBorderColorSameAsPositive'] !== 'false') rule.barNegBorderSame = true;
  const col = (n: string): string | undefined => { const e = firstChild(db, `x14:${n}`); return e ? resolveColorEl(e, ctx) : undefined; };
  const fill = col('fillColor'); if (fill) rule.barColor = fill;
  const bc = col('borderColor'); if (bc) rule.barBorderColor = bc;
  const nf = col('negativeFillColor'); if (nf) rule.barNegColor = nf;
  const nb = col('negativeBorderColor'); if (nb) rule.barNegBorderColor = nb;
  const ax = col('axisColor'); if (ax) rule.barAxisColor = ax;
  const cfvos = childElements(db, 'x14:cfvo').map(readCfvo);
  if (cfvos.length) rule.cfvos = cfvos;
}

/** Regra x14 que complementa uma clássica (mesmo id). */
function mergeX14(base: CondRule, ruleEl: XmlElement, ctx: ColorContext): void {
  const db = firstChild(ruleEl, 'x14:dataBar');
  if (base.type === 'dataBar' && db) { applyX14Bar(base, db, ctx); return; }
  const is = firstChild(ruleEl, 'x14:iconSet');
  if (base.type === 'iconSet' && is) {
    base.iconSet = is.attrs['iconSet'] ?? base.iconSet;
    const cf = childElements(is, 'x14:cfvo').map(readCfvo);
    if (cf.length) base.cfvos = cf;
    const icons = childElements(is, 'x14:cfIcon').map((c) => ({ set: c.attrs['iconSet'] ?? 'NoIcons', id: parseInt(c.attrs['iconId'] ?? '0', 10) }));
    if (icons.length) base.icons = icons;
  }
}
