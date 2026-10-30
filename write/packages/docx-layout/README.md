# @universal-office/docx-layout

Motor de layout do Write, sem DOM. Recebe o documento do `docx-core`
(`readFullDocument`) e um provedor de fontes e devolve páginas com itens de
pintura em twips. A mesma árvore alimenta:

- o canvas do `<universal-write>` (edição, cursor e seleção);
- o `exportPdf` (`pdf.ts`);
- o port .NET (`dotnet/src/UniversalOffice.Docx/DocxLayout`). A paridade é testada por
  dumps normalizados: mudou o motor aqui, porte lá e regenere os dumps
  (`tools/gen-parity-layout.mjs`).

```ts
const full = readFullDocument(DocxPackage.load(bytes));
const res = layoutDocument(full, fontProvider);   // { pages: LayoutPage[] }
const pdf = renderPdf(res);                        // Uint8Array
```

Cada `LayoutPage` traz:
- `items`: glifos, retângulos, caminhos, imagens, recortes e transformações,
  já em ordem z (cabeçalho/rodapé → atrás do texto → texto → na frente);
- `hfItems`: quantos itens do início de `items` são do cabeçalho/rodapé;
- `lines`: ref do parágrafo, offsets e `chars` por caractere, para cursor,
  seleção e clique;
- `objects`: objetos flutuantes posicionados, para seleção e arrasto.

## Como uma regra entra no motor

1. **Medir no Word**, nunca adivinhar. `tools/layout-oracle/cases/<grupo>.mjs`
   gera `.docx` sintéticos. `node tools/layout-oracle/run.mjs <grupo>` pede ao
   Word (COM invisível) o PDF de cada um e grava `test/oracle/<grupo>/<caso>.word.json`
   (versionado). Os PDFs do Word ficam fora do git porque embutem fontes da Microsoft.
2. Implementar e conferir com `node tools/layout-oracle/report.mjs <grupo> --verbose`.
3. `vitest run`: o `oracle.test.ts` exige Δbaseline ≤ 0,3 pt em todos os casos.
4. Rodar o corpus real (fora do repositório) com `tools/corpus-lab`:
   `run-engine.mjs` → `compare.py` → `sbs.py`. Não aceitar regressão.

## Regras do Word medidas (oráculo)

Cada item tem casos em `test/oracle/<grupo>` (entre parênteses).

**Texto e linhas**
- Larguras na unidade interna do Word, 1/4096 pt (`emwidth`, `gwfit`):
  - cada glifo mede piso(avanço × corpo × 4096 / upm): exato nas fontes de 2048
    unidades por em, até 1/4096 pt a menos nas de 1000/2000 (instaladas ou embutidas);
  - escala `w:w`: largura média inteira piso(xAvgCharWidth × w/100) e cada avanço
    round(avanço × essa largura / xAvgCharWidth), em unidades da fonte;
  - `w:spacing` arredondado para a unidade, sem escala;
  - limite da linha: largura da coluna/célula e cada recuo (direito, esquerdo, 1ª
    linha) arredondados separadamente; a palavra cabe se a soma ≤ limite.
- Kerning vale também para espaços (`kern`).
- Em compat ≤ 14 não há compressão na justificação (`compat-text`, `justify*`).
- Tabulação (`tabs`):
  - só quebra a linha quando a próxima parada é padrão, além da margem, e há
    conteúdo depois;
  - paradas personalizadas além da margem são respeitadas;
  - em compat ≤ 14 com paradas personalizadas, o texto passa da margem.
- Um `w:br` no fim do parágrafo cria uma linha vazia própria.
- O marcador de lista só contribui com a ascendente (`markers`).
- Fonte ausente (`fontsub`): usa o altName; senão vai para Cambria (roman ou
  fora da fontTable) ou Calibri (swiss/modern/auto).
- Grade de linhas (`docgrid`):
  - altura = max(pitch × line/240, ⌈natural/pitch⌉ × pitch), com o texto centralizado;
  - em atLeast, a caixa da grade vai embaixo.

**Paginação**
- Viúva/órfã: um parágrafo de 3 linhas cuja divisão deixaria uma órfã vai
  inteiro para a próxima página (`pagination`).
- A entrelinha extra de "múltiplo" pode passar da margem inferior (`pagefit`).
- Parágrafo VAZIO que carrega a quebra de seção não desce de página: fica
  pendurado abaixo da margem (`sectfit`).
- Manter com o próximo vale entre linhas de tabela. Um título com
  keepNext antes de uma tabela fica com a(s) 1ª(s) linha(s) dela (`keeptbl`).
- Quebras de página dentro de célula, cabeçalho/rodapé e caixa de texto são
  ignoradas.
- Equilíbrio de colunas numa quebra de seção contínua:
  - duas colunas: a menor altura em que tudo cabe (`colbal`);
  - três ou mais (`colbal3`): a 1ª coluna chega à média do conteúdo (a linha
    que passa da média fica nela), as do meio vão até a altura dela e a última
    leva o resto — pode passar da 1ª. Perto da página cheia o Word não iguala
    a 1ª às outras pela menor altura.

**Tabelas**
- Bandas de borda (`tables`):
  - cada divisa de linha tem a largura da sua borda mais grossa, e a última
    linha soma a banda de baixo;
  - altura exata inclui a banda de cima;
  - em compat 15, grid0 = esquerda + bwL/2;
  - em compat ≤ 14, o texto da 1ª célula fica em tblInd.
- Tabela flutuante (`ftable`):
  - posição pelas âncoras; o texto a contorna;
  - âncora no texto: desce para baixo de flutuantes que a impedem;
  - se nem a 1ª linha de texto cabe, vai inteira para a próxima página;
  - senão as linhas (e até uma linha alta) se dividem, e o resto continua no
    topo da página seguinte.
- Tabela que passa de uma coluna para outra (`coltbl`): as linhas da
  continuação ficam no x da coluna NOVA (da 2ª coluna para a 1ª da página
  seguinte, e da 1ª para a 2ª).

**Objetos flutuantes**
- Os flutuantes com contorno ancorados num parágrafo do corpo são posicionados
  antes das linhas: o próprio parágrafo os contorna (`selffloat`).
- `behindDoc` é só ordem z. Com quebra quadrada/justa/superior e inferior, o
  texto contorna o objeto do mesmo jeito (`selffloat`).
- Objeto relativo ao parágrafo que passaria da margem inferior (`selffloat`):
  - se dá para subi-lo até a margem sem cruzar as linhas do próprio
    parágrafo, ele sobe;
  - senão, o parágrafo desce com ele para a próxima página.
  - Sem quebra (wrapNone), ele transborda.
- Cabeçalho/rodapé (`hffloat`):
  - flutuantes de posição absoluta vão primeiro; o texto do cabeçalho os
    contorna, e tabelas descem para baixo deles;
  - em compat ≤ 14, flutuantes do cabeçalho/rodapé não afastam texto nenhum,
    nem o do corpo.
- Caixa de texto com `wrap="none"` + ajuste automático toma a largura do texto.
  A altura ajustada é a do conteúdo (o `cy` gravado é ignorado).
- "Dentro"/"fora" na página PAR (pelo número exibido) (`inside`): na
  horizontal dentro = direita e fora = esquerda, e as margens interna/externa
  trocam de lado; na vertical dentro = embaixo e fora = em cima — com ou sem
  margens espelhadas, para caixas de texto (`wp:align`) e tabelas flutuantes
  (`tblpXSpec`).
- Caixa girada com quebra quadrada (`rotwrap`): entre 45° e 135° (e entre 225°
  e 315°) o texto contorna a caixa com largura e altura trocadas em torno do
  centro; fora disso, a caixa sem giro.

**Cabeçalho, rodapé e campos**
- Cabeçalho e rodapé são herdados entre seções (`hf`).
- Campos atualizados no PDF: PAGE, NUMPAGES, PAGEREF, SEQ, REF, inclusive os
  aninhados num sumário (`fields`); também SECTIONPAGES, por seção
  (`test/page-fields.test.ts`).
- NUMPAGES (`numpages.ts`) conta as páginas físicas, MENOS UMA quando o corpo
  tem uma folha de rosto da galeria (sdt de bloco com `w:docPartGallery`
  "Cover Pages") E a 1ª seção começa a numeração em 0 (`w:pgNumType
  w:start="0"`, o que o Word grava ao inserir a folha de rosto). Sem a galeria,
  com outro início ou com start=0 só numa seção posterior: páginas físicas.
  SECTIONPAGES (páginas da seção da página) nunca desconta. O total da
  diagramação continua o físico. Medido no Word 365 (capa da galeria, 8
  páginas, start=0 → "1 de 7").
- Campo de fórmula (`field-formula.ts`): `{ = { NUMPAGES } - 1 }` (o "total
  sem a capa") é recalculado como o Word — no cabeçalho/rodapé sempre, no corpo
  só com campo aninhado no código. Avaliação pequena e segura: números
  (notação pt-BR), `+ - * /`, parênteses e sinal sobre PAGE/NUMPAGES/
  SECTIONPAGES/SECTION e fórmulas aninhadas; resultado com até 2 casas
  (`1,33`), `\# "00"` e `\* roman`/`ROMAN`/`alphabetic`/`ALPHABETIC`/`Arabic`.
  O resto (funções, indicadores, células, divisão por zero) fica com o
  resultado em cache. O código com os aninhados entre chaves fica em
  `Run.fieldCode`.
- Numeração de linhas (`lnnum`):
  - o 1º número é start + 1;
  - alinhado à direita em coluna − distância (auto = 360);
  - tabelas e parágrafos com suppressLineNumbers não contam.
- Cor automática do texto fica branca sobre sombreamento escuro (de parágrafo
  ou de célula).

## Diferenças conhecidas em relação ao Word

Ainda não reproduzidas (motor JS e .NET):

- Precedência de fontes: o motor usa a fonte EMBUTIDA no documento antes da
  instalada; o Word prefere a instalada (ou a da nuvem do Office) quando tem
  as duas.
- Margens espelhadas (`w:mirrorMargins`) e medianiz (`w:gutter`): lidas e
  preservadas, mas não aplicadas ao layout (só "dentro"/"fora" dos objetos
  flutuantes trocam de lado na página par).
- Caixa girada posicionada acima do próprio parágrafo âncora: o contorno com
  giro (`rotwrap`) vale para a caixa dentro do parágrafo; acima dele a posição
  ainda difere.
- Controles de conteúdo ligados a dados (`w:dataBinding`): mostram o conteúdo
  gravado no controle; o Word repõe o valor do XML ligado ao abrir.
