# OfficeNext — .NET (net8.0)

Porta .NET da manipulação e exportação dos três formatos do monorepo
(.docx/.xlsx/.pptx), com **paridade byte-idêntica** com os exportadores JS nos
formatos textuais e paridade estrutural nos PDFs. Sem dependências NuGet em
`src/` (xUnit apenas nos testes).

## Projetos

| Projeto | Conteúdo |
|---|---|
| `OfficeNext.Core` | `OpcPackage` (ZIP lossless por parte, ordem preservada), `MiniXml` (porta do parser xml.ts), `JsNumber` (semântica numérica ECMAScript: toString/toFixed/round — a chave da paridade), unidades |
| `OfficeNext.Docx` | Modelo + `ReadFullDocument` (paridade com docx-core), `ModelOps` (insert/delete/props), serialização subset |
| `OfficeNext.Xlsx` | Modelo + readers (styles/theme/worksheet), **`Format.FormatValue` pt-BR** (porta fiel de format.ts, 74 casos do oráculo Excel + fuzz 20k vs JS), cirurgia `UpdateWorksheetXml` |
| `OfficeNext.Pptx` | Modelo + reader (cascata de estilos de texto, grupos achatados), `LayoutTextBody`, `SetRunText` |
| `OfficeNext.Export` | Docx→MD/HTML · Xlsx→CSV/TSV/MD/HTML/ODS/XML2003 · Pptx→MD/HTML · **PDF dos três** |
| `OfficeNext.Pdf` | Gerador PDF próprio (porta do @wordnext/pdf): subset TrueType, Type0/Identity-H, JPEG/PNG (decoder próprio) com /SMask |
| `OfficeNext.Benchmarks` | Console Stopwatch — compara com `node tools/bench-export-pdf.mjs` |

## Como rodar

```powershell
# 1. fixtures de paridade (exige os projetos JS buildados: npm run build na raiz)
node tools/gen-parity-fixtures.mjs
node tools/gen-parity-pdf.mjs

# 2. build + testes
cd dotnet
dotnet build -c Release
dotnet test

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
- **Velocidade** (medida em Release, warmup 3 + média 10): Pptx ~13–16× o node,
  Docx ~5×, Xlsx ~3× (piso: o caso já roda em ~4 ms); todos <100 ms nas fixtures.

## Divergências conhecidas (documentadas nos fontes)

- `DocxToPdf` v1: quebra por métricas TTF + kern legada (sem GPOS/advances
  empíricos do pipeline canvas do write); sem headers/footers/tabs/imagens.
- Charts de pptx/xlsx em PDF: placeholder (igual ao JS).
- `SerialToDate` satura em vez de reproduzir o lixo do JS `Date` para seriais
  fora do domínio do Excel.
