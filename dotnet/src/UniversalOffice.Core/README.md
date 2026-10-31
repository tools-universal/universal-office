# UniversalOffice.Core

The shared base of the UniversalOffice libraries for .NET. You normally don't
install it yourself: it comes in as a dependency of
[UniversalOffice.Docx](https://www.nuget.org/packages/UniversalOffice.Docx)
(read, edit, sanitize and template Word documents, and render them to PDF).

Pure managed code for net8.0, with no native dependencies and no other NuGet packages.

## Install

```shell
dotnet add package UniversalOffice.Docx
```

## What's inside

### `UniversalOffice.Core`

- `OpcPackage`: lossless access to OOXML packages (ZIP). Parts you don't touch are
  saved byte for byte, in their original order.
- `OpcPackageLimits`: caps the size of each part and of the whole package when the
  input is untrusted; going over a limit throws `OfficeLimitExceededException`.
- `OpcPartName`: resolves relationship targets with one documented rule, so a
  validator and the reader agree on which part a relationship points to.
- `MiniXml`, a small XML reader with a depth limit, and OOXML unit conversions.

### `UniversalOffice.Fonts`

- `SfntFont`: TrueType/OpenType parser (cmap, hmtx, OS/2, post, GPOS and `kern`
  kerning, GSUB).
- `SystemFontIndex`: the fonts installed on Windows, Linux and macOS, read at run time,
  subfolders included. On Linux: `/usr/share/fonts`, `/usr/local/share/fonts`,
  `~/.fonts` and `~/.local/share/fonts`; on macOS: `/System/Library/Fonts`,
  `/Library/Fonts` and `~/Library/Fonts`; anywhere, the folders in the
  `EXTRA_FONT_DIRS` environment variable (separated by `;`). Before 0.9.2 the index
  was empty outside Windows (paths were joined with `\`).
- Liang hyphenation with embedded hyph-utf8 patterns (pt, en-US, es, fr, it, nl, de).

### `UniversalOffice.Pdf`

- A PDF writer with no dependencies: TrueType subsetting (Type0/Identity-H), JPEG
  and PNG images (with alpha), paths, clipping, transforms, opacity, links and outlines.
- `PdfFontSource`: a TrueType font passed to the PDF exporters.

### `UniversalOffice.DrawingML`

- The DrawingML engine: the official preset shape definitions, outlines,
  rasterization, picture effects (shadow, glow, soft edges, reflection), 3D lighting
  and bevels, and pattern fills.

## Example

```csharp
using UniversalOffice.Core;

// Read an OOXML package received from a user, with size limits.
var limits = new OpcPackageLimits { MaxPartBytes = 50L << 20, MaxTotalBytes = 150L << 20 };
var package = OpcPackage.Load(bytes, limits);   // OfficeLimitExceededException when over a limit
```

## License

MIT. The hyphenation patterns come from the hyph-utf8 project under their own
permissive licenses; their notices ship in this package at
`licenses/hyphenation/THIRD-PARTY-NOTICES.md`.
