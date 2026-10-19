# OfficeNext — .NET (net8.0)

Porta .NET da manipulação e exportação dos três formatos do monorepo
(.docx/.xlsx/.pptx), com **paridade byte-idêntica** com os exportadores JS nos
formatos textuais e paridade estrutural nos PDFs. Sem dependências NuGet em
`src/` (xUnit apenas nos testes).

## Projetos

| Projeto | Conteúdo |
|---|---|
| `OfficeNext.Core` | `OpcPackage` (ZIP lossless por parte, ordem preservada), `MiniXml` (porta do parser xml.ts), `JsNumber` (semântica numérica ECMAScript: toString/toFixed/round — a chave da paridade), unidades |
| `OfficeNext.Docx` | Modelo + `ReadFullDocument` (paridade com docx-core: props OOXML tipadas `Ooxml/Props.cs`, partes de formatação `Ooxml/Parts.cs` — estilos/numeração/tema/settings/fontTable —, DrawingML/VML `Drawing.cs`, campos/resultado de campo/caixas/formas/grupos), fontes embutidas (`EmbeddedFonts`), `ModelOps` (insert/delete/props), serialização subset |
| `OfficeNext.Layout` | Porta da base tipográfica do `@universal-office/docx-layout` (`src/typography`, fontes): `SfntFont` (cmap/hmtx/OS2/post, kerning GPOS + `kern` legado) e `SystemFontIndex` — índice das fontes INSTALADAS (Windows\Fonts, fontes do usuário, cache CloudFonts do Office), porta de `write/tools/corpus-lab/node-fonts.mjs` |
| `OfficeNext.DocxLayout` | **Motor de layout do Write** — porta de `@universal-office/docx-layout`, um arquivo por módulo TS (`Resolve`, `Fonts`, `Numbering`, `Context`, `Para`, `Lines`, `Paint`, `Table`, `Engine`, `Tree`, `Images`, `Emf`, `Pdf`): cascata OOXML, paginação, tabelas, cabeçalhos/rodapés, notas, flutuantes, campos; árvore de páginas em twips + renderizador PDF. `SystemFontProvider` (fontes da máquina), `DocxLayoutPipeline` (.docx → layout → PDF), `LayoutDump` (dump normalizado da paridade) |
| `OfficeNext.DocBinary` | Conversor .doc (Word 97-2003) → .docx, paridade parte a parte com o JS |
| `OfficeNext.CorpusLab` | Console do corpus lab (porta de `run-engine.mjs`): grava `LAB_DIR/<tag>/<id>/net.pdf` + `info.json` para o `compare.py --source net` |
| `OfficeNext.Xlsx` | Modelo + readers (styles/theme/worksheet), **`Format.FormatValue` pt-BR** (porta fiel de format.ts, 74 casos do oráculo Excel + fuzz 20k vs JS), cirurgia `UpdateWorksheetXml` |
| `OfficeNext.Pptx` | Modelo + reader (cascata de estilos de texto, grupos achatados), `LayoutTextBody`, `SetRunText` |
| `OfficeNext.Export` | Docx→MD/HTML · Xlsx→CSV/TSV/MD/HTML/ODS/XML2003 · Pptx→MD/HTML · **PDF dos três** |
| `OfficeNext.Pdf` | Gerador PDF próprio (porta de `docx-layout/src/pdf-writer`): subset TrueType, Type0/Identity-H, JPEG (gray/RGB/CMYK) e RGBA com /SMask, caminhos, recortes, transformações, opacidade (ExtGState), glifos com escala/negrito/itálico sintéticos |
| `OfficeNext.DocBinary` | Conversor Word 97-2003 (.doc binário) → .docx (porta de write/packages/docx-core/src/doc): partes idênticas às do JS |
| `OfficeNext.Benchmarks` | Console Stopwatch — compara com `node tools/bench-export-pdf.mjs` |

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

# 2. build + testes
cd dotnet
dotnet build -c Release
dotnet test

# 3. corpus (documentos reais FORA do repo; nada deles entra no git)
dotnet run -c Release --project src/OfficeNext.CorpusLab -- --tag net [--only id,id] [--limit N]
cd ../write/tools/corpus-lab && python -I compare.py net --source net

# 3. benchmark .NET vs node
dotnet run -c Release --project src/OfficeNext.Benchmarks
node ../tools/bench-export-pdf.mjs
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
  tolerâncias). Sem Arial/Calibri/Times New Roman instaladas os casos não são
  avaliados — as fontes são lidas da máquina, nunca versionadas (CLAUDE.md).
  `EngineRulesTests` / `ImagesAndPdfRulesTests` espelham `engine.test.ts`,
  `images.test.ts` e o `writer.test.ts` do pdf (documentos e imagens sintéticos
  montados no teste, fonte aberta Carlito): medições sem efeito colateral
  (listas/SEQ/notas), hiperlinks, WordArt VML, decodificadores de imagem,
  números do PDF e ids de glifo.
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
