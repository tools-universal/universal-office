// Objetos inline e campos: imagem inline × regras de entrelinha, TOC com
// hiperlinks (estilo Hyperlink), campos de formulário (FORMCHECKBOX/FORMTEXT).
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { solidPng, inlineImage } from '../png.mjs';

export const cases = [];
const media = { 'image1.png': solidPng(20, 20, [200, 30, 30]) };

// imagem inline 60x80pt em parágrafos com regras diferentes (texto antes e depois)
{
  let body = '';
  const rules = ['', '<w:spacing w:line="276" w:lineRule="auto"/>', '<w:spacing w:line="360" w:lineRule="auto"/>',
    '<w:spacing w:line="300" w:lineRule="exact"/>', '<w:spacing w:line="400" w:lineRule="atLeast"/>'];
  rules.forEach((rule, i) => {
    body += p(r(`antes ${i} Hxg`), rule);
    body += p(r('img ') + inlineImage(1, 60, 80) + r(' depois'), rule);
    body += p(r(`seguinte ${i} Hxg`), rule);
  });
  cases.push({ name: 'inline-image-rules', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}

// TOC com \h: entradas em w:hyperlink com rStyle Hyperlink (como o Word gera)
{
  const styles = '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="8494"/></w:tabs><w:spacing w:after="100"/></w:pPr></w:style>';
  const entry = (title, page, first) => {
    const begin = first ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' : '';
    return `<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr>${begin}<w:hyperlink w:anchor="_Toc${page}" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/><w:noProof/></w:rPr><w:t>${title}</w:t></w:r><w:r><w:rPr><w:noProof/><w:webHidden/></w:rPr><w:tab/></w:r><w:r><w:rPr><w:noProof/><w:webHidden/></w:rPr><w:t>${page}</w:t></w:r></w:hyperlink></w:p>`;
  };
  let body = entry('Primeiro titulo', 1, true) + entry('Segundo titulo', 2, false) + entry('Terceiro titulo', 3, false);
  body += '<w:p><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>';
  // hiperlink comum (fora do TOC) com estilo Hyperlink
  body += `<w:p><w:r><w:t xml:space="preserve">Texto com </w:t></w:r><w:hyperlink w:anchor="x"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>um link</w:t></w:r></w:hyperlink><w:r><w:t xml:space="preserve"> no meio.</w:t></w:r></w:p>`;
  cases.push({ name: 'toc-hyperlinks', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }), styles }) });
}

// campos de formulário legados
{
  const cb = (opts) => `<w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:name w:val="c"/><w:enabled/><w:calcOnExit w:val="0"/><w:checkBox>${opts}</w:checkBox></w:ffData></w:fldChar></w:r><w:r><w:instrText xml:space="preserve"> FORMCHECKBOX </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
  const tx = (def) => `<w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:name w:val="t"/><w:enabled/><w:calcOnExit w:val="0"/><w:textInput><w:default w:val="${def}"/></w:textInput></w:ffData></w:fldChar></w:r><w:r><w:instrText xml:space="preserve"> FORMTEXT </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>${def}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
  let body = '';
  body += p(cb('<w:sizeAuto/><w:default w:val="0"/>') + r(' auto vazio Hxg'));
  body += p(cb('<w:sizeAuto/><w:default w:val="1"/>') + r(' auto marcado Hxg'));
  body += p(cb('<w:size w:val="20"/><w:default w:val="0"/>') + r(' tamanho 10pt Hxg'));
  body += p(cb('<w:size w:val="32"/><w:default w:val="0"/>') + r(' tamanho 16pt Hxg'));
  body += p(r('grande ', sz(20)) + cb('<w:sizeAuto/><w:default w:val="0"/>') + r(' auto em 20pt', sz(20)));
  body += p(r('texto: ') + tx('valor padrão') + r(' fim Hxg'));
  body += p(r('texto vazio: ') + tx('     ') + r(' fim Hxg'));
  cases.push({ name: 'form-fields', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
