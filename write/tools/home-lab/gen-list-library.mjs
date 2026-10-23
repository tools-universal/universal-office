// Gera write/packages/editor/src/list-library.ts a partir do que o Word grava ao aplicar
// cada modelo das Bibliotecas de Marcadores (1), Numeração (2) e Listas de Vários Níveis (3)
// — results/lists/gal-<g>-<i>.xml (oráculo exp-lists.ps1). Fica só a definição de cada
// nível (w:lvl): nsid/tmpl são sorteados na hora; o LCID dos w:tplc, os estilos de título
// e os textos localizados ("Artigo", "Seção", "Capítulo") viram marcadores trocados pelo
// editor no idioma do documento.
//   node tools/home-lab/gen-list-library.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const res = join(here, 'results', 'lists');
const out = join(here, '..', '..', 'packages', 'editor', 'src', 'list-library.ts');

/** desfaz o pretty() do run.mjs: uma tag por linha → XML corrido */
const flat = (s) => s.split('\n').map((l) => l.trim()).join('');
const lists = { 1: [], 2: [], 3: [] };
for (const g of [1, 2, 3]) {
  for (let i = 1; i <= 9; i++) {
    const f = join(res, `gal-${g}-${i}.xml`);
    if (!existsSync(f)) continue;
    const txt = readFileSync(f, 'utf8');
    const num = txt.split('<!-- numbering.xml -->')[1]?.split('<!-- styles.xml')[0];
    if (!num) continue;
    const x = flat(num);
    const abs = /<w:abstractNum w:abstractNumId="0">([\s\S]*?)<\/w:abstractNum>/.exec(x)?.[1];
    if (!abs) continue;
    // marcador de imagem (w:lvlPicBulletId): a imagem é do Office (não redistribuível) e a
    // galeria do Word não o mostra (Nenhum + 6 marcadores)
    if (/<w:lvlPicBulletId\b/.test(abs)) continue;
    const mlt = /<w:multiLevelType w:val="(\w+)"\/>/.exec(abs)?.[1] ?? 'hybridMultilevel';
    const tmpl = /<w:tmpl w:val="([0-9A-F]{8})"\/>/.exec(abs)?.[1];
    const levels = [...abs.matchAll(/<w:lvl\b[^>]*>[\s\S]*?<\/w:lvl>/g)].map((m) => m[0]
      // tentativo é recalculado na gravação (níveis sem parágrafo)
      .replace(/ w:tentative="1"/, '')
      .replace(/w:tplc="0416([0-9A-F]{4})"/, 'w:tplc="{LCID}$1"')
      .replace(/<w:pStyle w:val="Ttulo(\d)"\/>/, '<w:pStyle w:val="{H$1}"/>')
      .replace(/Artigo /g, '{ARTICLE} ').replace(/Seção /g, '{SECTION} ').replace(/Capítulo /g, '{CHAPTER} '));
    // tmpl fixo só nos modelos de vários níveis que o Word marca como da galeria (04160023…)
    const fixedTmpl = tmpl && /^0416/.test(tmpl) ? tmpl.replace(/^0416/, '{LCID}') : undefined;
    lists[g].push({ multiLevelType: mlt, ...(fixedTmpl ? { tmpl: fixedTmpl } : {}), levels, linked: levels.some((l) => l.includes('{H')) });
  }
}
// (caracteres da área privada — marcadores Symbol/Wingdings — escapados, para se lerem no fonte)
const lit = (o) => JSON.stringify(o, null, 2).replace(/"([a-zA-Z]+)":/g, '$1:')
  .replace(/[-]/g, (c) => `\\u${c.charCodeAt(0).toString(16).toUpperCase()}`);
const src = `// GERADO por write/tools/home-lab/gen-list-library.mjs — não editar à mão.
// As Bibliotecas de Marcadores, Numeração e Listas de Vários Níveis como o Word as grava
// (oráculo home-lab exp-lists.ps1; memória word-lists-facts): a definição de cada nível
// (w:lvl). Marcadores: {LCID} = idioma do w:tplc (0416 pt-BR, 0409 en-US); {H1}…{H9} =
// styleId dos títulos do documento; {ARTICLE}/{SECTION}/{CHAPTER} = textos no idioma.

export interface LibraryList {
  multiLevelType: string;
  /** w:tmpl fixo (modelos de títulos); sem ele, sorteado */
  tmpl?: string;
  /** os 9 w:lvl (ou 1, na lista legada) */
  levels: string[];
  /** níveis vinculados aos estilos de título (w:pStyle) */
  linked: boolean;
}

export const BULLET_LIBRARY: LibraryList[] = ${lit(lists[1])};

export const NUMBER_LIBRARY: LibraryList[] = ${lit(lists[2])};

export const MULTILEVEL_LIBRARY: LibraryList[] = ${lit(lists[3])};
`;
writeFileSync(out, src);
console.log(`${lists[1].length} marcadores, ${lists[2].length} numerações, ${lists[3].length} vários níveis → ${out}`);
