// Preenchimento de tab (sumário): quantos pontos o Word desenha e onde.
// Passo dos pontos por fonte/tamanho, origem da grade (página × margem ×
// recuo), limiar do 1º ponto (fim do texto) e do último (início do número),
// tipos de preenchimento e qual formatação (a do run do tab?) desenha os pontos.
// Texto inventado.
import { buildDocx, docDefaults, p, r, font, sz, sectPr } from '../docx-builder.mjs';

const tabs = (val, pos, leader = 'dot') => `<w:tabs><w:tab w:val="${val}" w:leader="${leader}" w:pos="${pos}"/></w:tabs>`;
const tabRun = (rPr = '') => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:tab/></w:r>`;
const entry = (text, num, rPr = '', tabRPr = rPr) => r(text, rPr) + tabRun(tabRPr) + r(num, rPr);

export const cases = [];

// passo por fonte × tamanho (regular e negrito)
const FONTS = ['Arial', 'Calibri', 'Times New Roman', 'Verdana', 'Georgia', 'Tahoma', 'Segoe UI', 'Courier New', 'Aptos', 'Cambria'];
const SIZES = [8, 9, 10, 10.5, 11, 12, 13, 14, 16, 18];
for (const f of FONTS) {
  let body = '';
  for (const bold of [false, true]) {
    for (const s of SIZES) {
      const rp = font(f) + sz(s) + (bold ? '<w:b/>' : '');
      body += p(entry(`Secao ${s}${bold ? ' negrito' : ''} Hxg`, '12', rp), tabs('right', 8500));
    }
  }
  cases.push({ name: `tocdots-font-${f.replace(/\s+/g, '')}`, docx: buildDocx({ body, defaults: docDefaults({ font: f, size: 11 }) }) });
}

// limiar do 1º ponto / origem da grade: recuo esquerdo varrido em 4 twips
for (const [f, s] of [['Arial', 11], ['Times New Roman', 12], ['Calibri', 11]]) {
  let body = '';
  for (let ind = 0; ind <= 124; ind += 4) body += p(entry('Secao Hxg', '7'), tabs('right', 8500) + `<w:ind w:left="${ind}"/>`);
  cases.push({ name: `tocdots-indent-${f.replace(/\s+/g, '')}${s}`, docx: buildDocx({ body, defaults: docDefaults({ font: f, size: s }) }) });
}

// limiar do último ponto: posição da parada direita varrida em 4 twips
for (const [f, s] of [['Arial', 11], ['Times New Roman', 12], ['Calibri', 11]]) {
  let body = '';
  for (let pos = 8400; pos <= 8524; pos += 4) body += p(entry('Secao Hxg', '7'), tabs('right', pos));
  // parada ESQUERDA com preenchimento (texto depois do tab começa na parada; cabe antes da margem)
  for (let pos = 7800; pos <= 7924; pos += 4) body += p(entry('Item Hxg', 'Fim'), tabs('left', pos));
  cases.push({ name: `tocdots-tabpos-${f.replace(/\s+/g, '')}${s}`, docx: buildDocx({ body, defaults: docDefaults({ font: f, size: s }) }) });
}

// origem da grade: margem esquerda diferente (página × margem)
for (const left of [1000, 1013, 1027, 1040, 1701]) {
  let body = '';
  for (let ind = 0; ind <= 60; ind += 6) body += p(entry('Secao Hxg', '7'), tabs('right', 8000) + `<w:ind w:left="${ind}"/>`);
  cases.push({ name: `tocdots-margin-${left}`, docx: buildDocx({ body, sect: sectPr({ left }), defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}

// tipos de preenchimento × fonte; tabs à esquerda/centro/decimal
{
  let body = '';
  for (const [f, s] of [['Arial', 11], ['Calibri', 11], ['Times New Roman', 12], ['Verdana', 10]]) {
    const rp = font(f) + sz(s);
    for (const leader of ['dot', 'hyphen', 'underscore', 'middleDot', 'heavy']) {
      body += p(entry(`Tipo ${leader} Hxg`, '34', rp), tabs('right', 8500, leader));
    }
    body += p(entry('Centro Hxg', 'Meio', rp), tabs('center', 6000));
    body += p(entry('Decimal Hxg', '123,45', rp), tabs('decimal', 7000));
    body += p(entry('Esquerda Hxg', 'Texto', rp), tabs('left', 7000));
  }
  cases.push({ name: 'tocdots-kinds', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}

// formatação do run do TAB diferente da do texto: qual desenha os pontos?
{
  const base = font('Arial') + sz(11);
  const variants = [
    ['igual', base],
    ['times16', font('Times New Roman') + sz(16)],
    ['arial8', font('Arial') + sz(8)],
    ['negrito', base + '<w:b/>'],
    ['sublinhado', base + '<w:u w:val="single"/>'],
    ['cor', base + '<w:color w:val="C00000"/>'],
    ['espacado', base + '<w:spacing w:val="40"/>'],
    ['escala150', base + '<w:w w:val="150"/>'],
    ['sobrescrito', base + '<w:vertAlign w:val="superscript"/>'],
    ['oculto-web', base + '<w:webHidden/>'],
    ['courier', font('Courier New') + sz(11)],
  ];
  let body = '';
  for (const [name, tabRPr] of variants) body += p(entry(`Tab ${name} Hxg`, '56', base, tabRPr), tabs('right', 8500));
  // número em fonte diferente da do tab
  body += p(entry('Numero grande Hxg', '', base) + r('78', font('Times New Roman') + sz(20)), tabs('right', 8500));
  cases.push({ name: 'tocdots-runfmt', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}

// parada ALÉM da margem direita (sumário com o nº da página na margem): o
// Word 2013+ alinha na margem? E com recuo direito, centro/decimal, modo 14?
// (parada ESQUERDA além da margem no modo 15 quebra o texto de um jeito
// próprio — fora daqui; o motor ainda não reproduz)
{
  const base = (compat) => {
    let body = '';
    // texto 8504 twips de largura útil (A4, margens 1701): margem direita em 8504
    for (const pos of [8400, 8504, 8520, 8600, 9000, 9736, 10500]) {
      body += p(entry(`Direita ${pos} Hxg`, '12'), tabs('right', pos));
    }
    for (const ind of [300, -300]) {
      for (const pos of [8000, 8300, 8504, 8600, 8700, 9000]) body += p(entry(`Recuo ${ind} ${pos} Hxg`, '12'), tabs('right', pos) + `<w:ind w:right="${ind}"/>`);
    }
    for (const pos of [8600, 9000]) {
      body += p(entry(`Centro ${pos} Hxg`, 'Meio'), tabs('center', pos));
      body += p(entry(`Decimal ${pos} Hxg`, '12,5'), tabs('decimal', pos));
    }
    // nº longo que não cabe entre o texto e a margem
    body += p(entry('Titulo muito comprido que ocupa quase toda a largura da linha Hxg', '123'), tabs('right', 9000));
    return buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) });
  };
  for (const compat of [15, 14]) cases.push({ name: `tocdots-beyond-c${compat}`, docx: base(compat) });
}
