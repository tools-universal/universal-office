// Versalete (w:smallCaps) com kerning (w:kern) e espaçamento de caracteres: o par de
// kerning é procurado entre as MAIÚSCULAS desenhadas ou entre os caracteres originais
// (minúsculos)? A largura muda as quebras de um parágrafo justificado longo.
// Calibri Light 10 pt (fonte instalada; nunca versionada).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const txt = 'a tarefa avaliava o valor total da obra, e cada lote vale tanto quanto a taxa anual; '
  + 'o auditor revisava a tabela, avaliava a fatura e voltava a validar o laudo. '
  + 'toda a equipe tava atenta: a vaga, o atraso, a avaria e o aviso de falta foram vistos. ';
const body = (rPr) => p(r(txt.repeat(3), rPr), '<w:jc w:val="both"/>') + p(r('Fim Hxg'));
const D = (b) => buildDocx({ body: b, defaults: docDefaults({ font: 'Calibri Light', size: 10 }) });
const SC = '<w:smallCaps/>', K = '<w:kern w:val="2"/>', SP = '<w:spacing w:val="12"/>';

export const cases = [];
cases.push({ name: 'sck-kern', docx: D(body(SC + K)) });
cases.push({ name: 'sck-nokern', docx: D(body(SC)) });
cases.push({ name: 'sck-kern-sp12', docx: D(body(SC + SP + K)) });
// linhas curtas alinhadas à esquerda (largura do versalete): Calibri Light 10, Arial 10 e 20
const short = 'tava atenta: a vaga, o atraso, a avaria e o aviso.';
for (const [f, sz] of [['Calibri Light', 10], ['Arial', 10], ['Arial', 20], ['Calibri Light', 11]]) {
  const Df = (b) => buildDocx({ body: b, defaults: docDefaults({ font: f, size: sz }) });
  const tag = `${f.replace(' ', '').toLowerCase()}${sz}`;
  cases.push({ name: `scw-${tag}`, docx: Df(p(r(short, SC)) + p(r(short, SC + SP)) + p(r(short.toUpperCase())) + p(r('Fim Hxg'))) });
}
// tamanhos: 8, 9, 12, 14, 16, 20 e 28 pt (Arial; texto curto numa linha)
const tiny = 'a vaga e o aviso tava.';
cases.push({ name: 'scw-sizes', docx: buildDocx({ body: [8, 9, 12, 14, 16, 20, 28].map((z) => p(r(tiny, SC + `<w:sz w:val="${z * 2}"/>`))).join('') + p(r('Fim Hxg')), defaults: docDefaults({ font: 'Arial', size: 10 }) }) });
// controle: o mesmo texto já em maiúsculas, com kerning
cases.push({ name: 'sck-upper-kern', docx: D(p(r(txt.toUpperCase().repeat(3), K), '<w:jc w:val="both"/>') + p(r('Fim Hxg'))) });
