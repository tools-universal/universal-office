# UniversalOffice — .NET (net8.0)

Porta .NET da manipulação e exportação dos três formatos do monorepo
(.docx/.xlsx/.pptx), com **paridade byte-idêntica** com os exportadores JS nos
formatos textuais e paridade estrutural nos PDFs. Sem dependências NuGet em
`src/` (xUnit apenas nos testes).

## Pacotes e projetos

Quatro assemblies, cada um empacotado como pacote NuGet de mesmo nome (versão
alinhada aos pacotes npm `@universal-office/*`, hoje 0.9.2). No nuget.org estão
publicados `UniversalOffice.Core` e `UniversalOffice.Docx`; `UniversalOffice.Xlsx`
e `UniversalOffice.Pptx` são empacotados, mas ainda não publicados.
`UniversalOffice.Docx`, `UniversalOffice.Xlsx` e `UniversalOffice.Pptx` dependem
só do `UniversalOffice.Core`; cada pacote tem o próprio `README.md` (na pasta do
projeto, em inglês — vai dentro do .nupkg). Metadados comuns (versão, autor,
licença MIT, símbolos `.snupkg`, build determinístico sem URL de repositório) no
`Directory.Build.props`; passo a passo da publicação em `docs/publishing.md`.
Nada específico de um consumidor entra na biblioteca: conversões de formatos de
outros editores (ex.: Delta/HTML do Quill) ficam no hospedeiro, que escreve com
a API genérica (`DocxBodyWriter`, `DocxRunFormat`, `DocxParagraphFormat`,
`DocxParagraphProperties`, `DocxParagraphSamples`).

| Pacote / assembly | Pastas → namespaces | Conteúdo |
|---|---|---|
| `UniversalOffice.Core` | raiz → `UniversalOffice.Core` | `OpcPackage` (ZIP lossless por parte, ordem preservada), `OpcPartName`, `OpcPackageLimits`/`OfficeLimitExceededException`, `MiniXml` (porta do parser xml.ts), `JsNumber` (semântica numérica ECMAScript: toString/toFixed/round — a chave da paridade), unidades |
| | `Fonts/` → `UniversalOffice.Fonts` | Porta da base tipográfica do `@universal-office/docx-layout` (`src/typography`, fontes): `SfntFont` (cmap/hmtx/OS2/post, kerning GPOS + `kern` legado, GSUB) e `SystemFontIndex` — índice das fontes INSTALADAS (Windows\Fonts, fontes do usuário, cache CloudFonts do Office), porta de `write/tools/corpus-lab/node-fonts.mjs`; hifenização (`Hyphen/`, padrões de hyph-utf8 embutidos; avisos em `Fonts/Hyphen/patterns/THIRD-PARTY-NOTICES.md`, que vai no pacote em `licenses/hyphenation/`) |
| | `Pdf/` → `UniversalOffice.Pdf` | Gerador PDF próprio (porta de `docx-layout/src/pdf-writer`): subset TrueType, Type0/Identity-H, JPEG (gray/RGB/CMYK) e RGBA com /SMask, caminhos, recortes, transformações, opacidade (ExtGState), glifos com escala/negrito/itálico sintéticos; `PdfFontSource` (fonte TTF dada pelo hospedeiro aos exports PDF) |
| | `DrawingML/` → `UniversalOffice.DrawingML` | Porta de `shared/drawingml`: intérprete das formas predefinidas OFICIAIS (o próprio `preset-defs.ts` embutido como recurso — uma fonte só), `PresetOutline`, rasterização sem DOM (`Raster`: polígonos, desfoque gaussiano, distância, dilatação/erosão, afim), os efeitos medidos no Word (`Effects`: sombra externa/interna, brilho, bordas suaves, reflexo) e o chanfro 3D (`Light3D` + `Bevel`: tabelas do `light3d.ts` e do `bevel-word.ts` também embutidas) e os padrões do a:pattFill (`Patterns`: o `patterns.ts` embutido) |
| `UniversalOffice.Docx` | raiz → `UniversalOffice.Docx` | Modelo + `ReadFullDocument` (paridade com docx-core: props OOXML tipadas `Ooxml/Props.cs`, partes de formatação `Ooxml/Parts.cs` — estilos/numeração/tema/settings/fontTable —, DrawingML/VML `Drawing.cs`, campos/resultado de campo/caixas/formas/grupos), fontes embutidas (`EmbeddedFonts`), `ModelOps` (insert/delete/props), serialização subset, `CustomInlineTag` |
| | `Editing/` → `UniversalOffice.Docx.Editing` | Edição de .docx no servidor sem perdas (saneamento, modelos, parâmetros, inlines de plugin, conteúdo formatado no fim do corpo) — ver "Edição de .docx no servidor" |
| | `DocxLayout/` → `UniversalOffice.DocxLayout` | **Motor de layout do Write** — porta de `@universal-office/docx-layout`, um arquivo por módulo TS (`Resolve`, `Fonts`, `Numbering`, `Context`, `Para`, `Lines`, `Paint`, `Table`, `Engine`, `Chain`, `Tree`, `Images`, `Emf`, `Pdf`, `Picture`, `PdfPicture`): cascata OOXML, paginação, tabelas, cabeçalhos/rodapés, notas, flutuantes, campos; árvore de páginas em twips + renderizador PDF (Formato da Imagem: `PictureLook` no item de imagem, composição dos efeitos no PDF como o Word). `SystemFontProvider` (fontes da máquina), `SubstituteFontProvider` (fontes da máquina + substitutas métricas), `DocxLayoutPipeline` (.docx → layout → PDF), `LayoutDump` (dump normalizado da paridade). O catálogo de fontes (`shared/fonts/src/catalog.ts`) vai embutido como recurso |
| | `DocBinary/` → `UniversalOffice.DocBinary` | Conversor Word 97-2003 (.doc binário) → .docx (porta de write/packages/docx-core/src/doc): partes idênticas às do JS |
| | `Export/` → `UniversalOffice.Export` | Docx→MD/HTML (`DocxMarkdown`, `DocxHtml`, `FromDocx`) e `DocxPdf` (PDF pelo motor de layout; .doc convertido antes) |
| `UniversalOffice.Xlsx` | raiz → `UniversalOffice.Xlsx` | Modelo + readers (styles/theme/worksheet), **`Format.FormatValue` pt-BR** (porta fiel de format.ts, 74 casos do oráculo Excel + fuzz 20k vs JS), cirurgia `UpdateWorksheetXml` |
| | `Export/` → `UniversalOffice.Export` | Xlsx→CSV/TSV/MD/HTML/ODS/XML2003 (`XlsxCsv`, `XlsxMarkdown`, `XlsxHtml`, `XlsxOds`, `XlsxXml2003`) e `XlsxPdf` |
| `UniversalOffice.Pptx` | raiz → `UniversalOffice.Pptx` | Modelo + reader (cascata de estilos de texto, grupos achatados), `LayoutTextBody`, `SetRunText` |
| | `Export/` → `UniversalOffice.Export` | Pptx→MD/HTML (`PptxMarkdown`, `PptxHtml`) e `PptxPdf` (vetorial) |

Fora dos pacotes (`IsPackable=false`): `src/UniversalOffice.CorpusLab` (console do
corpus lab, porta de `run-engine.mjs`: grava `LAB_DIR/<tag>/<id>/net.pdf` +
`info.json` para o `compare.py --source net`), `tests/UniversalOffice.Tests`,
`tests/UniversalOffice.DocBinary.Tests` e `tests/UniversalOffice.Benchmarks`
(console Stopwatch — compara com `node tools/bench-export-pdf.mjs`).

## PDF no servidor (hospedeiro)

```csharp
var pdf = DocxLayoutPipeline.ToPdf(docx, SubstituteFontProvider.Shared,
    new LayoutOptions { HyphenationLanguages = ["pt-BR", "en", "es"] });
```

- **Fontes**: `SubstituteFontProvider.Shared` = fontes do sistema (Windows, `/usr/share/fonts`, `/usr/local/share/fonts`, `~/.fonts`, `~/.local/share/fonts`, pastas do macOS e `EXTRA_FONT_DIRS`) com as substitutas métrico-compatíveis do catálogo da suíte (`shared/fonts/src/catalog.ts`, lido como recurso: Calibri → Carlito, Cambria → Caladea, Arial/Helvetica → Liberation Sans, Times → Liberation Serif, Courier → Liberation Mono). A substituta chega marcada `StandIn` — o `FaceResolver` tenta antes o que o Word põe no lugar da família —, igual ao provedor do editor. As fontes EMBUTIDAS no .docx entram na frente, por documento (`DocxLayoutPipeline`), nunca num cache compartilhado. Cada pasta é lida com as subpastas; `EXTRA_FONT_DIRS` aceita várias, separadas por `;`. Até a 0.9.1 o índice ficava vazio fora do Windows (o `JsPath.Join`, porta do `path.join` do Node, juntava com `\` também no Linux e no macOS) e o PDF falhava com `nenhuma fonte disponível para "…"`; desde a 0.9.2 ele usa o separador do SO fora do Windows (no Windows, paridade com o JS, nada muda).
- **Servidor Linux / contêiner**: as substitutas métricas não vêm no pacote; instale-as no SO (Debian/Ubuntu: `apt-get install fonts-liberation fonts-crosextra-carlito fonts-crosextra-caladea`) para as quebras de linha e de página saírem como no Word — ou aponte `EXTRA_FONT_DIRS` para uma pasta com os TTF.
- **Navegação**: o PDF sai com anotações `/Link` (só `http`, `https` e `mailto`; âncoras viram destino interno) e marcadores `/Outlines` pelos títulos (nível de estrutura do parágrafo ou do estilo), como o Word grava com "Criar indicadores usando títulos".
- **Inlines de plugin**: `CustomInlineTag.TryParse/Format` (UniversalOffice.Docx) é o contrato do `w:sdt` gravado pelo `<universal-write>` (`wordnext:inline:<tipo>:<json>`).
- **Campos de página** (medido no Word 365, capa com `w:titlePg` e `w:pgNumType w:start="0"` + 3 páginas): na página depois da capa `PAGE` = 1, `NUMPAGES` = 4 (todas as páginas, a capa inclusive) e `SECTIONPAGES` = as páginas da seção da página (4 com uma seção, 3 com a capa numa seção própria). Exceção (`NumPages`, igual ao `numpages.ts`): com uma folha de rosto da GALERIA do Word no corpo (sdt de bloco com `w:docPartGallery` "Cover Pages") E a 1ª seção começando em 0, o `NUMPAGES` do Word já desconta a capa (3 no exemplo); o `SECTIONPAGES` nunca desconta. O total **sem a capa** é um campo de fórmula no rodapé do modelo: `Página { PAGE } de { = { NUMPAGES } - 1 }` → "Página 1 de 3". O motor (JS e .NET, `FieldFormula`) recalcula a fórmula como o Word ao paginar — no cabeçalho/rodapé sempre, no corpo só com campo aninhado no código — com avaliação segura e pequena: números (notação pt-BR), `+ - * /`, parênteses e sinal sobre `PAGE`/`NUMPAGES`/`SECTIONPAGES`/`SECTION` e fórmulas aninhadas; resultado como o Word (até 2 casas, `1,33`), `\# "00"` e `\* roman`/`ROMAN`/`alphabetic`/`ALPHABETIC`/`Arabic`. O resto (funções, indicadores, células, divisão por zero) fica com o resultado em cache. O leitor guarda o código com os aninhados entre chaves em `Run.FieldCode` (`" = { NUMPAGES } - 1 "`).
- **Diferenças conhecidas** do layout em relação ao Word (precedência de fonte embutida × instalada, margens espelhadas/medianiz, caixa girada acima do parágrafo, controles ligados a dados): ver `write/packages/docx-layout/README.md`.
- **Conteúdo não confiável**: o parser XML recusa token sem fechamento e aninhamento acima de `MiniXml.MaxDepth`; o ZIP é lido com os tetos de `OpcPackageLimits` (`DocxPackage.Load(bytes, limits)`, ver abaixo); limites de imagem ficam com o hospedeiro (validar antes de chamar).

## Edição de .docx no servidor (`UniversalOffice.Docx.Editing`)

Manipulação de .docx no servidor (saneamento, modelos, parâmetros, histórico,
inlines de plugin, conteúdo formatado), no mesmo `UniversalOffice.Docx.dll`.
Trabalha direto no XML das partes com `System.Xml.Linq` (BCL): namespaces,
prefixos, comentários e marcação desconhecida passam intactos — o `MiniXml` é
leitor (porta do xml.ts) e não regrava. O ZIP é o `OpcPackage`: abrir e salvar sem
mexer devolve as partes byte a byte; só as partes XML alteradas são reserializadas
(com os prefixos canônicos declarados na raiz, que o MiniXml/xml.ts exigem). Ao
salvar depois de editar: regras estruturais do Word (célula termina em parágrafo,
tabela sem linha sai…) e coleta de relacionamentos/partes que ninguém mais referencia.

```csharp
using UniversalOffice.Docx.Editing;

var doc = DocxDocument.Open(bytes);          // InvalidDataException/XmlException se não for .docx válido
// … operações …
byte[] result = doc.Save();
```

**Entrada não confiável.** Abrir não reserva memória pelo tamanho que o ZIP
declara (os bytes são contados enquanto são lidos) e tudo tem teto, configurável
por `DocxLimits`; ultrapassar lança `OfficeLimitExceededException` (`Limit`,
`Maximum`, `PartName`) — nunca estoura a pilha nem fica quadrático:

```csharp
var limits = new DocxLimits
{
    Package = new OpcPackageLimits { MaxPartBytes = 50L << 20, MaxTotalBytes = 150L << 20 }, // padrão 256 MiB / 512 MiB
    MaxXmlDepth = 256,          // XmlReader.Depth de qualquer nó, conferido antes de montar a árvore (padrão 256)
    MaxFieldsPerStory = 100_000, // w:fldChar begin por história (padrão)
    MaxFieldNesting = 64,        // campos abertos ao mesmo tempo, inclusive os sem fim (padrão)
};
var doc = DocxDocument.Open(bytes, limits);     // Clone() e o conteúdo de ApplyContent herdam doc.Limits
```

Os alvos de relacionamento seguem UMA regra, pública para o validador do
hospedeiro usar a mesma: `OpcPartName.ResolveRelationshipTarget(origem, target)`
— fragmento fora, relativo à pasta da origem (`""` = raiz) ou absoluto, `.`/`..`
normalizados (acima da raiz = null), cada segmento desescapado UMA vez
(`fn%2531.xml` → `fn%31.xml`, nunca `fn1.xml`); null para esquema, `?`, `\`,
escape malformado ou segmento que desescapado vira `/`, `\`, `.` ou `..`. O nome
devolvido é comparado com os do ZIP sem diferenciar maiúsculas e não é
desescapado de novo. `OpcPartName.EscapeSegment` é o inverso (o UniversalOffice grava
os alvos novos com ele). As cópias de XML entre documentos são iterativas
(`ApplyContent`/`ImportBody`), e a varredura de campos é linear.

| Operação | API |
|---|---|
| Saneamento | `DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content)` (conteúdo recebido: revisões aceitas, comentários, macros (vira .docx), proteção, modelo anexado, metadados pessoais, cabeçalhos/rodapés, seções juntadas na última, OLE/ActiveX/altChunk/subdocumento/quadros, relacionamentos externos que não sejam hiperlink http/https/mailto, campos fora de `PAGE NUMPAGES HYPERLINK TOC REF PAGEREF SEQ` → resultado em cache sem avaliar, campo HYPERLINK → `w:hyperlink` nativo, customXml). `DocxSanitizeOptions.Output` = só revisão + conteúdo inseguro + campos com a lista ampliada `DocxFields.DefaultOutputAllowedFields` (+ `DATE TIME SAVEDATE CREATEDATE PRINTDATE SECTION SECTIONPAGES NOTEREF` e a fórmula `=`, ex.: `{ = { NUMPAGES } - 1 }` — os campos aninhados no código passam pela mesma lista) — documento gerado de modelo. `IsCustomInlineValid = (tipo, json) => …` desembrulha inlines inválidos. Etapas soltas: `DocxReview.AcceptAllRevisions/RemoveComments/RemoveMacros/RemoveProtection/RemoveAttachedTemplate/DisableTrackChanges`, `DocxSanitizer.RemoveHeadersAndFooters/MergeSections/RemoveCustomXml/RemoveUnsafeContent`, `DocxFields.ReplaceDisallowedWithResult/ConvertHyperlinkFields` |
| Esvaziar modelo | `DocxTemplate.Empty(doc)` — um parágrafo vazio Normal sob o sectPr da ÚLTIMA seção, sem referências de cabeçalho/rodapé; estilos, numeração, tema, settings e fontes (inclusive embutidas) ficam; revisão/comentários/macros/proteção/metadados limpos; notas órfãs saem |
| Aplicar conteúdo | `DocxTemplate.ApplyContent(template, contentDocx, new() { SampleMarkers = ["#{Heading1}", "#{Normal}", …] })` — o "importar conteúdo com os estilos do destino" (como o `ImportContent(UseDestinationStyles)` do DocIO): tira os parágrafos-amostra do modelo, aceita revisões/comentários do conteúdo, importa o corpo no fim da última seção (seções do conteúdo achatadas; com `PreserveSections = true` as quebras de seção e colunas do conteúdo ficam, cada seção com tamanho/margens/cabeçalhos/rodapés da última seção do modelo, e os blocos do modelo antes do conteúdo ganham uma quebra própria — a primeira seção do conteúdo começa contínua), estilo de mesmo NOME usa o do destino (ids internos sem definição — `Heading1` — casam pelo nome interno), os que faltam entram com id livre; numeração (w:num/w:abstractNum novos, nsid novo, listas separadas continuam separadas), imagens e partes relacionadas (gráficos…), hiperlinks, notas de rodapé/fim, fontes da tabela (com as embutidas) copiadas sem colidir; indicadores renumerados/renomeados (âncoras e REF acompanham); `wp:docPr`, `w14:paraId` e `w:sdt/w:id` únicos; parágrafo vazio final descartado; imagens grandes reduzidas à área útil da seção onde estão (à coluna, em seção com colunas — `DocxPictures.FitToPage`). Só o corpo: `DocxTemplate.ImportBody(target, source)` |
| Parâmetros `#{...}` | `DocxText.ReplaceParameter(doc, "Title", "Código")` / `ReplaceParameters(doc, [new("Code", "POL-1"), …])` — sem diferenciar maiúsculas, "palavra inteira" (letra/dígito colado só conta do lado em que a busca começa/termina com letra/dígito), mesmo quebrado em vários runs; o texto novo herda a formatação do primeiro caractere; `\t`/quebras de linha viram `w:tab`/`w:br`; corpo, caixas de texto (mc:Choice e mc:Fallback), cabeçalhos, rodapés e notas. Genérico: `DocxText.Replace(doc, find, value, caseSensitive, wholeWord, scope)`, `DocxText.Replace(doc, regex, value)`, `DocxText.Contains`, `DocxText.RemoveParagraphsContaining` |
| Histórico (linha-modelo) | `var row = DocxTableRowTemplate.Take(doc, "HistoryVersion"); row?.Append([new("HistoryVersion", "1.0"), new("HistoryNotes", nota), …]);` — a linha do marcador sai da tabela e cada `Append` acrescenta uma cópia no fim com os `#{...}` trocados e os que sobrarem apagados |
| Logotipo / caixa de texto | `DocxShapes.ReplaceTextWithImage(doc, "#{Logo}", png, maxWidthPt: 200, maxHeightPt: 75)` (PNG/JPEG/GIF/BMP no tamanho físico, reduzido proporcionalmente); `DocxShapes.RemoveContaining(doc, "#{Logo}")` tira a caixa de texto |
| Rodapé/cabeçalho | `DocxShapes.FirstShapeIn(doc, footer: true)` → `DocxShape.SetFillColor("0B5394")`, `SetFillTransparent()`, `SetTextColor("FFFFFF")` (último parágrafo, ou todos com `lastParagraphOnly: false`), `ClearText()`; `DocxShapes.ClearHeaderFooter(doc, footer: true)` — DrawingML e o VML de reserva juntos |
| Propriedades | `doc.Properties.Title/Subject/Author/LastAuthor/Category/Keywords/Comments/LastSaveDate/Company/Manager/ApplicationName`, `SetCustomProperty`, `RemoveCustomProperties`, `RemovePersonalMetadata()` (null/vazio remove) |
| Inlines de plugin | `DocxCustomInlines.Find(doc, "myapp.user-tag")` → `DocxCustomInline` (`Type`, `Json`, `Title`, `Text`, `PartPath`) com `ReplaceWithText(valor)` (formatação do run; vazio remove), `ReplaceWithHyperlink(url, texto)` (`w:hyperlink` + relacionamento externo, estilo "Hyperlink"; URL fora de http/https/mailto vira texto — **sem campo HYPERLINK**), `Unwrap()`. `DocxCustomInlines.ReplaceText(doc, marcador, tipo, json, reserva)` troca um texto (ex.: marcadores U+E000 n U+E001 que o hospedeiro pôs no lugar de objetos de outro editor, mesmo quebrados em runs) pelo `w:sdt` no contrato do editor; `UnwrapInvalid(doc, validador)` |
| Texto puro | `DocxText.GetPlainText(doc, includeHeadersAndFooters: false)` — parágrafo por linha (CRLF), `\t`, `\n` de quebra; tabelas, caixas de texto (uma vez), inlines pelo texto de reserva; sem código de campo nem texto excluído |
| Amostras do modelo | `DocxParagraphSamples.Contains(doc, "Heading1")` (marcador `#{Heading1}`, palavra inteira, diferenciando maiúsculas) e `DocxParagraphSamples.Extract(doc, ["Heading1", "Normal", "BulletList", …])` → `IReadOnlyDictionary<string, DocxParagraphProperties>`: guarda o w:pPr do PRIMEIRO parágrafo de cada marcador (sem w:sectPr/w:pPrChange; `StyleId`, `NumId`) e remove TODOS os parágrafos que o contêm; nome sem amostra fica fora do resultado |
| Conteúdo formatado | `var writer = new DocxBodyWriter(doc, new() { LinkColor = null });` — escreve no FIM do corpo (antes do w:sectPr final): `AddText(texto, new DocxRunFormat { Bold, Italic, Underline, Strike, Color, Background, VerticalAlign, Link })` (`\t`/quebras viram `w:tab`/`w:br`; cores CSS/hex normalizadas, inválidas ignoradas; link nativo só com esquema de `AllowedLinkSchemes`, "www.…" ganha http://, o resto vira texto), `AddBreak()`, `AddImage(bytes, link)` (false se a imagem não for reconhecida), `EndParagraph(new DocxParagraphFormat { Base = amostra, StyleId, ListNumId, ListLevel, LeftIndentTwips, Alignment, KeepWithNext })` (estilo padrão do documento é omitido) e `Finish()` (fecha a linha, apara o último parágrafo vazio, reduz as imagens à página). Opções: `LinkColor` (cor dos links sem sublinhado; null = estilo "Hyperlink"), `ReuseEmptyLastParagraph` (o primeiro parágrafo entra no último parágrafo vazio do modelo), `TrimTrailingEmptyParagraph`, `FitPictures`. Listas reiniciadas: `DocxNumbering.AddRestartedInstance(doc, numId)` |

Fluxos típicos (os testes `Editing/TemplateDocumentFlowTests` os executam num
modelo sintético com capa, logotipo, rodapé colorido e parágrafos-amostra):

```csharp
// edição: modelo esvaziado + conteúdo .docx
var doc = DocxDocument.Open(template);
DocxTemplate.Empty(doc);
DocxTemplate.ApplyContent(doc, contentDocx, new() { PreserveSections = true });
DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content with { MergeSections = false, IsCustomInlineValid = IsValid });
return doc.Save();

// conteúdo de outro editor (ex.: Delta/HTML de um editor de texto rico) na formatação das amostras
var doc = DocxDocument.Open(template);
var samples = DocxParagraphSamples.Extract(doc, ["Heading1", "Normal", "BulletList", "NumberedList"]);
DocxTemplate.Empty(doc);
var writer = new DocxBodyWriter(doc);
writer.AddText("Objetivo", DocxRunFormat.None);
writer.EndParagraph(new() { StyleId = samples["Heading1"].StyleId, KeepWithNext = true });
writer.AddText("Item", new DocxRunFormat { Bold = true });
writer.EndParagraph(new() { Base = samples["BulletList"], ListNumId = samples["BulletList"].NumId, Alignment = "left" });
writer.Finish();
foreach (var m in markers) DocxCustomInlines.ReplaceText(doc, m.Text, m.Type, m.Json, m.FallbackText);
DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Content with { IsCustomInlineValid = IsValid });

// PDF/DOCX gerado do modelo
var doc = DocxDocument.Open(template);
DocxShapes.ReplaceTextWithImage(doc, "#{Logo}", logo, 200, 75);  // ou RemoveContaining(doc, "#{Logo}")
DocxShapes.FirstShapeIn(doc, footer: true)?.SetFillColor(primary);
doc.Properties.Title = fullTitle; doc.Properties.ApplicationName = "My App";
DocxText.ReplaceParameters(doc, parameters);    // ANTES do conteúdo: o #{Title} do conteúdo fica literal
var history = DocxTableRowTemplate.Take(doc, "HistoryVersion"); /* history?.Append(...) por versão */
DocxTemplate.ApplyContent(doc, contentDocx, new() { SampleMarkers = sampleMarkers, PreserveSections = true });
DocxSanitizer.Sanitize(doc, DocxSanitizeOptions.Output with { IsCustomInlineValid = IsValid });
var pdf = DocxLayoutPipeline.ToPdf(doc.Save(), SubstituteFontProvider.Shared, options);
```

Diferenças conhecidas em relação ao Syncfusion DocIO (de propósito): cabeçalhos/rodapés
removidos saem com a parte (o DocIO deixava a parte vazia); "transparência 100%"
da forma vira `a:noFill`/`filled="f"`; recuo de imagem em lista = recuo esquerdo do
nível (o DocIO descontava espaçamento-depois + posição do número); link relativo ou
`#…` escrito pelo `DocxBodyWriter` vira texto (sem hiperlink quebrado); data/hora de
`LastSaveDate` em UTC; `GetPlainText` não escreve o rótulo das listas ("1.", "•"),
que o `GetText` do DocIO incluía; campos (DATE…) nunca são avaliados ao abrir (o
DocIO atualizava DATE no load).

## Como rodar

```powershell
# 1. fixtures de paridade (exige os projetos JS buildados: npm run build na raiz)
node tools/gen-parity-fixtures.mjs
node tools/gen-parity-pdf.mjs
node tools/gen-parity-doc.mjs        # .doc → .docx (exige o dist do docx-core)

#    layout do Write: dumps do motor JS sobre o oráculo Word
#    (write/packages/docx-layout/test/oracle) — exige os dist de docx-core,
#    layout, pdf e docx-layout e as fontes instaladas (Arial/Calibri/Times…)
node tools/gen-parity-layout.mjs
#    Formato da Imagem: entrada sintética (fixtures/input/pictures.docx) — depois
#    gen-parity-layout (expected/layout-input) e gen-parity-pdf --only pictures.docx
node tools/gen-parity-pictures.mjs
#    caixas de texto (vinculadas, verticais, ocultas, padrão/imagem, Estilos de Forma,
#    formas com texto): fixtures/input/textboxes.docx — depois gen-parity-layout
node tools/gen-parity-textboxes.mjs

# 2. build + testes
cd dotnet
dotnet build -c Release
dotnet test

# 3. corpus (documentos reais FORA do repo; nada deles entra no git)
dotnet run -c Release --project src/UniversalOffice.CorpusLab -- --tag net [--only id,id] [--limit N]
cd ../write/tools/corpus-lab && python -I compare.py net --source net

# 4. benchmark .NET vs node
dotnet run -c Release --project tests/UniversalOffice.Benchmarks
node ../tools/bench-export-pdf.mjs

# 5. pacotes NuGet (Core, Docx, Xlsx, Pptx: .nupkg + .snupkg; versão no Directory.Build.props)
#    publicação no nuget.org: docs/publishing.md
dotnet pack UniversalOffice.sln -c Release -o <pasta>
```

## Paridade — o que é garantido

- **Textuais (md/html/csv/tsv/xml2003/ods-content)**: byte a byte com o JS
  (testes comparam string ordinal, sem normalização; CSV com CRLF+final, resto LF).
- **PDF**: nº de páginas, MediaBox (±0,01 pt) e contagem de operadores de texto
  idênticos ao JS; raster (WinRT) com contagem de pixels idêntica nas fixtures.
- **Round-trip**: partes não tocadas byte-idênticas e ordem preservada (o
  container re-comprime — mesma semântica do JS/fflate).
- **Layout do Write (docx)**: `LayoutParityTests` diagrama cada caso do oráculo
  Word com o motor .NET e compara com o dump do motor JS
  (`fixtures/expected/layout/<grupo>/<caso>.layout.json`, de
  `tools/gen-parity-layout.mjs`): mesma estrutura (itens na mesma ordem, mesmas
  faces/textos) e números com ±0,05 twip. `LayoutOracleTests` espelha o
  `oracle.test.ts` (linhas, páginas e baseline contra o PDF do Word, mesmas
  tolerâncias; texto girado das caixas verticais pelas `vlines`). Sem Arial/Calibri/Times New Roman instaladas os casos não são
  avaliados — as fontes são lidas da máquina, nunca versionadas (CLAUDE.md).
  `EngineRulesTests` / `ImagesAndPdfRulesTests` espelham `engine.test.ts`,
  `images.test.ts` e o `writer.test.ts` do pdf (documentos e imagens sintéticos
  montados no teste, fonte aberta Carlito): medições sem efeito colateral
  (listas/SEQ/notas), hiperlinks, WordArt VML, decodificadores de imagem,
  números do PDF e ids de glifo. `Layout_Js_Net_Input` compara do mesmo jeito as
  entradas sintéticas fora do oráculo (`fixtures/expected/layout-input`, ex.:
  `pictures.docx` — Formato da Imagem, com a chave `pic` dos itens de imagem;
  `textboxes.docx` — caixas de texto, com `pattern`/`blip` nas formas que os têm);
  `DrawingMLTests` cobre o intérprete das formas, a rasterização e os efeitos.
- **Velocidade** (medida em Release, warmup 3 + média 10): Pptx ~13–16× o node,
  Docx ~5×, Xlsx ~3× (piso: o caso já roda em ~4 ms); todos <100 ms nas fixtures.

## Divergências conhecidas (documentadas nos fontes)

- `DocxPdf.ToPdf` usa o motor de layout portado (paridade com o JS); a
  sobrecarga com `List<PdfFontSource>` (API v1) aplica as faces dadas a TODA
  família do documento (referência JS: `tools/docx-pdf-ref.mjs`); `ToPdf(bytes)`
  usa as fontes instaladas. `.odt` com extensão trocada ainda não tem leitor
  ODF no .NET.
- Semântica JS reproduzida de propósito (para a paridade): `toUpperCase` com o
  SpecialCasing (ß → SS), ordem de chaves de objetos JS nas identidades por
  `JSON.stringify` (grupos de bordas), NaN/`undefined` do `parseInt`, leituras
  de `DataView` fora do buffer que lançam.
- Charts de pptx/xlsx em PDF: placeholder (igual ao JS).
- `SerialToDate` satura em vez de reproduzir o lixo do JS `Date` para seriais
  fora do domínio do Excel.
