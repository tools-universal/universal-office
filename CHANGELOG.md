# Changelog

Changes per version of the published UniversalOffice packages (npm
`@universal-office/*` and NuGet `UniversalOffice.*`). How to publish:
`docs/publishing.md`.

## 0.9.2 — 2026-10-30

### Versions and packages

- All packages ship as 0.9.2, including the ones that were at 0.0.1: npm
  `write`, `document-viewer`, `compare`, `sheet`, `slides`, `slides-viewer`,
  `font-files`, `spellcheck`, `dictionary-pt-br`, `dictionary-en-us` and
  `dictionary-es`; NuGet `UniversalOffice.Core`, `.Docx`, `.Xlsx` and `.Pptx`
  (`.Docx` depends on `.Core` 0.9.2). First publication of `sheet`,
  `slides`, `slides-viewer` and `dictionary-es`.
- **Renamed:** the Slides viewer now carries the product name, like the
  `<universal-slides>` editor. The `@universal-office/presentation-viewer` package
  became `@universal-office/slides-viewer`, the
  `<universal-presentation-viewer>` element became `<universal-slides-viewer>` and the
  `UniversalPresentationViewerElement` class became
  `UniversalSlidesViewerElement` (also re-exported by
  `@universal-office/slides`, whose `UniversalSlidesElement` extends it).
  There is no alias for the old name: change the import, the tag and the CSS selector. The
  events (`us-*`), the attributes, the `::part()`s and the CSS variables
  (`--upv-*`) do not change. `@universal-office/presentation-viewer` was
  published only as 0.0.1 and is deprecated on npm, pointing to the new one
  (`npm deprecate @universal-office/presentation-viewer "Renamed to
  @universal-office/slides-viewer"`). Write keeps
  `@universal-office/document-viewer` / `<universal-document-viewer>`.

### .NET

- Fonts on Linux: `JsPath.Join` (port of Node's `path.join` in
  `UniversalOffice.Core`) joined paths with `\` outside Windows as well,
  so no system font folder was found, the system font index
  was empty and PDF generation failed with "nenhuma
  fonte disponível" (no font available) (not even Liberation Serif was found). Outside Windows it
  now joins with the OS separator; on Windows the behavior (parity with
  the JS) does not change.

### Desktop app

- The three desktop apps (Universal Write, Universal Sheet and Universal Slides,
  each with its own Electron) became ONE app, **Universal Office (Beta)**
  0.9.2 (`desktop/`, appId `org.universaloffice.UniversalOffice`): one
  installer and one runtime for the three editors, one window per document, and
  a file opened by the system (association, 2nd instance, macOS
  open-file) goes to the editor for its extension. Everything the three apps did still works: single
  instance, recent files and Jump List (now per editor), native Open/Save/Save
  As/Export, printing through the system dialog, confirmation of
  unsaved changes on close (including the Slides note not yet
  saved), frameless window with the OS controls in the theme color, navigation
  and IPC guards, OS fonts, offline Write spell checking.
  The preload bridges keep each editor's names (`wordnext`,
  `universalSheet`, `universalSlides`).
- Per-editor welcome screen (like the JetBrains IDEs'): the editor's shortcut
  (`--editor=write|sheet|slides`) opens its welcome window — icon,
  name and version, New document/spreadsheet/presentation, Open…, the recent files
  OF that editor (search, open with click/Enter, remove, clear; a file that
  disappeared shows as unavailable), shortcuts to the other two, language and
  third-party licenses. Without an argument: the welcome screen of the last editor used.
- Interface language (Portuguese, English, Spanish) on the welcome screen and in a
  Language menu in each editor (through the component's plugin API), stored
  in the profile; default = the spell-checking language, from the system. It applies
  immediately, without reloading: app texts (dialogs, notices, Jump List) and the
  editors' `lang`.
- Icons: the REAL ones of each app (`site/assets/icons`), rasterized by
  Electron's Chromium (the SVGs use CSS that librsvg does not render), in every
  place — windows and taskbar, shortcuts, file types,
  Linux/Flatpak launchers, welcome screen.
- License notices for everything the app bundles in `resources/licenses`
  (Hunspell, pt-BR/en-US/es dictionaries, hyphenation, fonts, libraries),
  opened by "Licenças de terceiros" (Third-party licenses).
- Snap with four apps (the generic one and Write/Sheet/Slides, each with its own
  launcher); Windows installer in pt-BR/en-US/es depending on the system.
- Windows: each editor with its own AppUserModelID, icon and taskbar
  group (`setAppDetails`); the installer creates the "Universal Write
  (Beta)", "Universal Sheet (Beta)" and "Universal Slides (Beta)" shortcuts in the Start
  menu and on the desktop, with a single entry in Apps.
- Size: the Windows installer is ~106 MB, versus ~322 MB for the three
  separate installers — a single Chromium, the open fonts only once and
  only the interface languages (en-US, pt-BR, es, es-419).
- Linux: one AppImage/deb/rpm/tar.gz/snap `universal-office`; the deb and the rpm
  install the three launchers, and so does the Flatpak
  (`org.universaloffice.UniversalOffice`, replacing the three
  manifests). Release by the `v<version>` tag; the
  `write-v*`, `sheet-v*` and `slides-v*` tags and the `*/apps/electron` folders are gone.

### Sheet

- `<universal-sheet>` got its own bars, like those of `<universal-write>`
  and on the same framework (`@universal-office/ui`), wired through the same
  attributes: `topbar` (compact bar, the default — title above the menus
  "Arquivo · Editar · Exibir · Inserir · Formatar · Ferramentas · Ajuda" (File · Edit · View · Insert · Format · Tools · Help) and a
  tools row that collapses by priority — or `toolbar="ribbon"`,
  with the tabs "Página Inicial · Inserir · Fórmulas · Exibir · Ajuda" (Home · Insert · Formulas · View · Help)), a formula
  bar with Name Box and `fx`, and `bottombar` (sheet tabs
  with Insert Sheet and a status bar with average, count and sum of the
  selection, and zoom). `lang`, `theme`/`color-scheme`, `accent`, `storage-key`,
  `hidden-commands`, plugins with `toolbar` (`use`/`register`), `setNotice`,
  Excel shortcuts, context menu, drag and drop, dialogs (Format
  Cells, Find and Replace, Go To, Insert Function, Column
  Width, Row Height, Properties) and the optional `host` of the host
  app (native dialogs, confirmation on close, frameless window with
  `.uo-wco`). Without the attributes the element stays as it was.
- New editing API (used by the bars and public): range selection
  (`selectRange`, `getSelection`, `selectAll`, Shift/Ctrl+arrows), undo/
  redo, copy/cut/paste with relative references adjusted,
  Paste Values, Fill Down/Right, Clear, `setFormat` (font,
  fill, borders, alignment, wrap, number formats, decimal
  places), merge, freeze panes, gridlines, width/height,
  AutoFit, hide/unhide, find/replace, AutoSum, Insert
  Function, Calculate Now, `newWorkbook`, `addSheet`, `selectionStats`,
  `getProperties`, `isDirty`, events `us-change`, `us-load`,
  `us-theme-change`. Everything goes into the .xlsx: styles.xml gets only the
  new fonts/fills/borders/xfs and the worksheet rewrites
  `<mergeCells>`/`<sheetView>` only when they changed.
- sheet-core: `blankWorkbook`/`blankXlsx` and the `merges`/`sheetView` options
  of `updateWorksheetXml`.
- Desktop app (in Universal Office, see above): the frameless window shows the
  component's bar with the OS controls overlaid; native Open/Save/
  Export, confirmation of unsaved changes on close, and
  spreadsheets opened by the OS come in through the component API (`openWorkbook`)
  instead of a synthetic "drop".

### Slides

- `<universal-slides>` got its own bars, like those of `<universal-write>`
  and on the same framework (`@universal-office/ui`), wired through the same
  attributes: `topbar` (compact bar, the default — logo, editable title above
  the menus "Arquivo · Editar · Exibir · Inserir · Formatar · Slide ·
  Apresentação · Ajuda" (File · Edit · View · Insert · Format · Slide · Slideshow · Help), a tools row that collapses by priority and the
  Present button — or `toolbar="ribbon"`, with the tabs "Página Inicial ·
  Inserir · Design · Transições · Animações · Apresentação de Slides · Exibir" (Home ·
  Insert · Design · Transitions · Animations · Slide Show · View)
  and the contextual Shape Format tab), a THUMBNAILS pane (drag to
  reorder, context menu), a NOTES pane, Slide Sorter
  and Reading modes, Animation Pane (read-only) and `bottombar` (Slide n of N,
  view modes, zoom). `lang`, `theme`/`color-scheme`, `storage-key`,
  `hidden-commands`, plugins with `toolbar` (`use`/`register`), `setNotice`,
  `loadBarKit`, PowerPoint shortcuts (F5, Shift+F5, Ctrl+M, Ctrl+D…), shape
  clipboard, drag and drop (a presentation opens, an image
  goes into the slide), dialogs (Find and Replace, Properties,
  Set Up Slide Show, Size and Position, Link, Shortcuts) and the optional `appHost`
  of the host app (native dialogs, printing, confirmation on
  close, frameless window with `.uo-wco`). Without the attributes the element stays
  as it was.
- Editing goes into the FILE (before, edited text only changed the screen):
  `deck-edit.ts` replaces only the edited span of each part and the model is reread
  from the package. New API (used by the bars and public): `openPresentation`,
  `newPresentation` (Office theme, six layouts, notes master),
  `documentName`, undo/redo, `isDirty`/`markClean`, slides (new from
  a layout, duplicate with the notes, delete, move, hide,
  layout, background, transition — 21 effects —, "Set Up Slide Show"),
  shapes (selection, text box, 28 shapes, image, position/size,
  fill, outline, order, delete with their animations, copy/paste,
  link), shape text formatting, notes, properties,
  find/replace, zoom, `previewSlide`, `getSlideAnimations`. Events
  `us-change`, `us-selection`, `us-dirty`, `us-title-change`, `us-zoom`,
  `us-theme-change`, `us-file-drop`.
- slides-viewer: protected hooks for the editor (`rereadDeck`,
  `rereadSlide`, `slidePartPath`, `deskColor`); the viewer's behavior does not
  change. slides-core: `PptxPackage.fromParts`, and the slide number (field
  `slidenum`) follows slide insertion/deletion/moves.
- Desktop app (in Universal Office, see above): the frameless window shows the
  component's bar with the OS controls overlaid (without the drag
  region injected into the demo);
  native Open/Save (to the same file)/Export, printing through the system
  dialog, confirmation of unsaved changes on close, and presentations
  opened by the OS come in through the component API (`openPresentation`) instead
  of a synthetic "drop". The demo is now just the component.

### Spell checking

- New package `@universal-office/dictionary-es` 0.9.2: the Spanish Hunspell
  dictionary (RLA-ES 2.9, from LibreOffice, `es_ES` variant — LibreOffice's `es/` folder
  has no neutral dictionary), a single one for all variants: `es`, `es-ES`,
  `es-MX`, `es-419`, `es-AR`… resolve to it (id `es`). License
  `(GPL-3.0-or-later OR LGPL-3.0-or-later OR MPL-1.1+)`, with the three texts in
  `licenses/`. Optional like the others: `registerDictionary('es', () =>
  import('@universal-office/dictionary-es'))` or the
  `<base>/dictionary-es/` folder with `spellcheck-url` (`es` is in the default list
  of `PUBLISHED_DICTIONARIES`; with `spellcheck-languages`, list `es`).
- `<universal-write>`: `spellcheck-default-lang` attribute (property
  `spellcheckDefaultLang`), the language of text whose language the document does not state (no
  `w:lang` on the run, in the styles or in the defaults); the default is still `pt-BR`. A
  new document (`newDocument()`) is created in that language: `blankDocxPackage({ lang })`
  writes the `w:lang` of the defaults and `w:themeFontLang`, as Word does with the
  editing language.

### Spanish interface

- Spanish is the third interface language of all web components
  (`<universal-write>`, `<universal-sheet>`, `<universal-slides>`,
  `<universal-document-viewer>`, `<universal-slides-viewer>`,
  `<universal-write-diff>`, the fonts dialog and the mentions plugin):
  `lang="es"` (any region — `es-ES`, `es-419`, `es-MX`…) or a browser
  in Spanish. Menus, ribbon tabs and groups, tooltips, dialogs, panes,
  status bars, notices, error messages, accessibility labels and the
  shortcuts help, in neutral Spanish with the Office terminology in
  Spanish (Archivo, Inicio, Insertar, Diseño, Disposición, Referencias,
  Revisar, Vista; Guardar como, Deshacer, Buscar y reemplazar, Autosuma,
  Presentación con diapositivas…) and the "tú" of Microsoft 365. Measurements in cm and
  decimal comma, as in Portuguese. Keyboard shortcuts do not change.
- `@universal-office/ui`: `UiLang` is now `'en' | 'pt' | 'es'`, with
  `UI_LANGS`, `uiLocale(lang)` and `uiDecimal(lang)`. The internal label tables
  are `Record<UiLang, …>`, so an internal label without Spanish does not
  compile. Nothing breaks for the host: in the `{ en, pt }` label passed to the
  bars (plugins, `Lbl`, `createBarButton`) `es` is optional, and without it the
  Spanish interface shows the English text.
- Write: Spanish names of Word's built-in styles and of the table
  styles (galleries and styles pane; the written `w:name` does not change), texts
  of the watermarks, the header/footer templates, cover page and text
  boxes, the quick tables and the descriptions of formatting revisions
  ("Con formato: …"). The texts that Word writes according to the interface
  language (text box name, "[sin valor]", caption labels,
  "Título N" of the manual table of contents) come out in Spanish with `lang="es"`.
- Sheet: formulas do not change with the interface language — they follow
  `formula-locale`, which has function names in Portuguese (oracle) and in
  English; there is no table of Spanish names (`formula-locale="es-ES"` uses the
  English names with the region's separators: `=SUM(A1;1,5)`).

## 0.9.1 — 2026-10-29

First version published with the final name and license.

### Name and license

- The product is called **UniversalOffice**. npm: scope `@universal-office/*`.
  .NET: projects, assemblies and
  namespaces `UniversalOffice.*` (`OfficeNext.*` is gone; `UniversalOffice.Layout`
  became `UniversalOffice.Fonts`), solution `dotnet/UniversalOffice.sln`.
- **MIT on everything** (`LICENSE` at the root, copyright Eric Kono). Third-party data with their own
  licenses, inside each package: `@universal-office/font-files` =
  `OFL-1.1 AND Apache-2.0` (Caladea is Apache-2.0), Hunspell `MPL-1.1 AND MIT`,
  pt-BR dictionary MPL-1.1, en-US SCOWL license, notices for the hyph-utf8
  hyphenation patterns.

### npm packages

- Published as 0.9.1: `@universal-office/write` (editor, with the
  `./viewer` entry that only registers `<universal-document-viewer>` and shares the
  chunks), `@universal-office/document-viewer` (viewer only),
  `@universal-office/font-files`, `@universal-office/spellcheck`,
  `@universal-office/dictionary-pt-br` and `@universal-office/dictionary-en-us`.
  Published as 0.0.1: `@universal-office/compare` and
  `@universal-office/presentation-viewer`. `@universal-office/sheet` and
  `@universal-office/slides` (0.0.1) are generated, but not published yet.
- The open fonts moved out of each product (they were the same 7 MB in
  each one) into `@universal-office/font-files`, the only dependency of the
  products, at an exact version. The host serves the package folder and points the
  `fonts` attribute to it; without the attribute, the viewer looks for the sibling folder
  `font-files/`.
- Spell checking no longer comes inside write: the engine
  (`@universal-office/spellcheck`) and each dictionary are OPTIONAL packages,
  registered by loader (`registerSpellcheck`, `registerDictionary`, with a
  bundler) or by folder (`spellcheck-url`, `spellcheck-languages`,
  `configureSpellcheck`). Without them there is no spell checking and no error.
- A host that loads by URL: one subdirectory per package,
  `/vendor/universal-office/<package>/` (`write/`, `font-files/`,
  `spellcheck/`, `dictionary-pt-br/`…).
- No vendored tgz: each package comes out of `tools/build-pkg.mjs` in
  `<package>/publish/` and is packed with `npm pack`.

### NuGet packages

- Published as 0.9.1: `UniversalOffice.Core` (Core + Fonts + Pdf +
  DrawingML) and `UniversalOffice.Docx` (Docx + Editing + DocxLayout + DocBinary
  + the docx exporters). `UniversalOffice.Xlsx` and `UniversalOffice.Pptx` are
  packed, but not published yet. Common metadata in
  `dotnet/Directory.Build.props`, an English README inside each package,
  `.snupkg` symbols.
- Server-side .docx editing (`UniversalOffice.Docx.Editing`): sanitizing
  untrusted content with ceilings (`DocxLimits`, `OpcPackageLimits`,
  `OfficeLimitExceededException`), a single rule for relationship targets
  (`OpcPartName.ResolveRelationshipTarget`), templates, `#{...}` parameters,
  plugin inlines (`CustomInlineTag`), plain text, links and bookmarks in the PDF,
  metric substitutes (`SubstituteFontProvider`).
- Nothing consumer-specific in the library: the Quill conversion moved
  to the app that uses it. In its place, the generic API `DocxBodyWriter`,
  `DocxRunFormat`, `DocxParagraphFormat`, `DocxParagraphProperties` and
  `DocxParagraphSamples`.

### Layout (JS and .NET engines, measured in Word)

- `NUMPAGES` excludes the cover when the body has a cover page from Word's
  gallery (sdt "Cover Pages") and the 1st section starts numbering at 0;
  `SECTIONPAGES` never excludes it and is calculated per section.
- Formula fields recalculated like Word (`{ = { NUMPAGES } - 1 }`, the
  total without the cover), with small and safe evaluation.
- A table that continues in another column stays at the new column's x.
- "Inside"/"outside" on an even page: position and inside/outside margins switch
  sides, for text boxes and floating tables.
- Balancing of 3 or more columns at a continuous section break.
- Wrap contour of rotated objects: between 45° and 135° (and 225°–315°) width and
  height are swapped.
- PDF with spaces between words written (search and copy), clickable links and
  bookmarks from the headings.
- Differences that remain: Word prefers the installed (or cloud) font over the
  embedded one; mirrored margins and gutter not applied; rotated box above the
  anchor paragraph; data-bound content controls. Details in the
  `docx-layout` README.

### Editor and viewer for host apps

- Compact bar with the title row above the menus, like Google Docs
  (`compact.titlePlacement: 'above-menus'`, the default when there is a title;
  `'inline'` goes back to a single row); `loadBarKit()` and `createBarRow()` build the same bar
  outside the editor (preview, read-only).
- `side` slot (and `side-start`) in `<universal-write>` and in
  `<universal-document-viewer>`: host side panel below the bars;
  `uw-side-resize` event.
- `setNotice(el, { tone })`: host notice strip between the menus and the
  tools.
- `formatting-policy="template-document"` (and the
  `formattingPolicy` property): the user only formats what the policy allows; paste
  converts the rest.
- `uw-file-drop` (cancelable) and `nofiledrop`: the host decides what to do with
  dropped files.
- Light/dark through the context's CSS `color-scheme` property (`theme` forces it);
  `effectiveTheme` and `uw-theme-change` / `udv-theme-change`.
- Plugins in the viewer too (the same `inlineRenderers`) and a global registry
  (`register`/`unregister`); `isEmpty`, `isDirty`/`setDirty`, `getLinks`,
  `getCustomInlines`; Ctrl+click opens only http/https/mailto, with no opener and no
  Referer.
