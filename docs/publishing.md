# Publishing — npm and NuGet

How a version of the UniversalOffice packages is released. Everything is MIT (see `LICENSE`);
third-party data (fonts, Hunspell, dictionaries, hyphenation patterns)
carries its own license texts inside the package. What changed in each
version goes in `CHANGELOG.md`.

## What exists and what is published

| Package | Source | Current version | Notes |
|---|---|---|---|
| `@universal-office/write` | `write/packages/editor` (+ `./viewer` entry) | 0.9.2 | |
| `@universal-office/document-viewer` | `write/packages/viewer` | 0.9.2 | |
| `@universal-office/font-files` | `shared/fonts/packages/font-files` | 0.9.2 | |
| `@universal-office/spellcheck` | `shared/spell/packages/spellcheck` | 0.9.2 | |
| `@universal-office/dictionary-pt-br` | `shared/spell/packages/dictionary-pt-br` | 0.9.2 | |
| `@universal-office/dictionary-en-us` | `shared/spell/packages/dictionary-en-us` | 0.9.2 | |
| `@universal-office/dictionary-es` | `shared/spell/packages/dictionary-es` | 0.9.2 | 1st publication in 0.9.2 (`--access public`) |
| `@universal-office/compare` | `write/packages/compare` | 0.9.2 | previously 0.0.1 |
| `@universal-office/slides-viewer` | `slides/packages/viewer` | 0.9.2 | 1st publication in 0.9.2 (`--access public`); replaces `@universal-office/presentation-viewer` (0.0.1 only, deprecated) |
| `@universal-office/sheet` | `sheet/packages/sheet` | 0.9.2 | 1st publication in 0.9.2 (`--access public`) |
| `@universal-office/slides` | `slides/packages/slides` | 0.9.2 | 1st publication in 0.9.2 (`--access public`) |
| `UniversalOffice.Core` (NuGet) | `dotnet/src/UniversalOffice.Core` (Core + Fonts + Pdf + DrawingML) | 0.9.2 | |
| `UniversalOffice.Docx` (NuGet) | `dotnet/src/UniversalOffice.Docx` (Docx + Editing + DocxLayout + DocBinary + the docx exporters) | 0.9.2 | |
| `UniversalOffice.Xlsx` (NuGet) | `dotnet/src/UniversalOffice.Xlsx` | 0.9.2 | packed; not published yet |
| `UniversalOffice.Pptx` (NuGet) | `dotnet/src/UniversalOffice.Pptx` | 0.9.2 | packed; not published yet |

`@universal-office/presentation-viewer` (0.0.1) became
`@universal-office/slides-viewer` in 0.9.2 (element `<universal-slides-viewer>`,
class `UniversalSlidesViewerElement`), with no alias for the old name. After
publishing the new one, deprecate the old one:

```bash
npm deprecate @universal-office/presentation-viewer "Renamed to @universal-office/slides-viewer"
```

The monorepo's internal packages (`fonts`, `charts`, `drawingml`, `ui`, `spell`,
`docx-core`, `docx-layout`, `sheet-core`, `sheet-calc`, `slides-core`) are
`private` and never go to the registry: they only exist inside the bundles.

## Version rules

- `write` and `document-viewer` ALWAYS have the same version (write carries the same
  viewer as its 2nd entry, `@universal-office/write/viewer`). The `slides` /
  `slides-viewer` pair too.
- The products with fonts (`write`, `document-viewer`, `sheet`,
  `slides-viewer`, `slides`) depend on `@universal-office/font-files`
  at the EXACT version in its `package.json` at build time
  (currently 0.9.2). If `font-files` changed: publish it
  BEFORE the products, and only republish the products that need the new version.
- `spellcheck` and the dictionaries are optional and independent of write; the
  recommendation is to install them at the same version as write.
- NuGet: the version comes from `<Version>` in `dotnet/Directory.Build.props` (the
  same for the four packages) and follows that of `write`.
- A published version is not republished (npm and nuget.org refuse the same number):
  any fix, even in the README only, is a new version. The package README
  goes inside the package — what is in the repository only shows up on the registry with the
  next version.

## npm

Prerequisites: dependencies installed (`npm run install:all`) and an account
that is a member of the `@universal-office` organization on npmjs.com, with 2FA enabled.

1. Set the version in the `package.json` of each package being released (and of the pairs
   above) and record the version in `CHANGELOG.md`.
2. Generate the publishable folder of each package (or of all of them, with no arguments):

   ```bash
   node tools/build-pkg.mjs font-files write document-viewer
   ```

   `tools/build-pkg.mjs` (also `npm run build:pkg`) writes
   `<package>/publish/` (outside git, recreated on every build): the bundle with all
   the code (internal packages from src, npm dependencies, on-demand
   `chunks/`), one `.d.ts` per entry, third-party `licenses/`, README (with the
   GIFs in `media/`), `LICENSE` and the publishable `package.json` (description,
   keywords and license come from the `publish` block of the folder's `package.json`).
   The build fails if a product embeds the spell-checking engine or a dictionary.
3. Pack from inside `publish/`, with the `.tgz` outside it (the next build
   deletes the folder), and check the contents:

   ```bash
   cd write/packages/editor/publish
   npm pack --pack-destination ../../../../out
   tar -tzf ../../../../out/universal-office-write-0.9.2.tgz
   ```

4. Publish the `.tgz` (a scoped package needs `--access public` on its 1st
   publication; npm asks for the 2FA code, or pass `--otp <code>`):

   ```bash
   npm publish ../../../../out/universal-office-write-0.9.2.tgz --access public
   ```

   Order: `font-files` → `spellcheck` and dictionaries (`dictionary-pt-br`,
   `dictionary-en-us`, `dictionary-es`) → `document-viewer` and `write` (together)
   → the other products. The dictionaries do not depend on anything: a new
   dictionary can be released on its own, without republishing
   write — with write already published, the host enables it through
   `registerDictionary('es', …)` or by listing `es` in `spellcheck-languages`.
   Only the DEFAULT list of `spellcheck-url` (without `spellcheck-languages`,
   `PUBLISHED_DICTIONARIES`) depends on the write build: starting with the build that has
   `es`, it requests `<base>/dictionary-es/index.js` when checking text
   in Spanish (a folder without it = 404 = no spell checking, no error).
5. Check: `npm view @universal-office/write version dependencies homepage repository funding`.
   The `homepage` (https://universaloffice.org/), the `repository` (this
   repository, with the package folder), `bugs` and `funding` (GitHub
   Sponsors) come from `PROJECT` in `tools/build-pkg.mjs`, the same in all
   packages.

How the host consumes them (bundler × static folder `/vendor/universal-office/<package>/`,
the `fonts`, `spellcheck-url`, `spellcheck-languages` attributes,
`registerSpellcheck`/`registerDictionary`/`configureSpellcheck`): the package READMEs
(`write/packages/editor/README.md`, sections "Installation" and "Spelling").

## NuGet

Prerequisites: .NET 8+ SDK and a nuget.org account that owns (or is a
member with publish permission of) the organization that owns the packages.

1. Set `<Version>` in `dotnet/Directory.Build.props` (common metadata:
   author, copyright, `PackageLicenseExpression` MIT, README, `.snupkg`
   symbols, deterministic build, no repository URL).
2. Pack (only the projects with `IsPackable=true`: Core, Docx, Xlsx, Pptx):

   ```powershell
   cd dotnet
   dotnet test
   dotnet pack UniversalOffice.sln -c Release -o ..\out\nuget
   ```

   One `.nupkg` and one `.snupkg` come out per package. Each project's README goes at the
   package root; `UniversalOffice.Core` also carries the hyph-utf8 notices
   in `licenses/hyphenation/`.
3. Publish `UniversalOffice.Core` BEFORE `UniversalOffice.Docx` (which
   depends on it), through one of these paths:
   - **web upload** (nuget.org › Upload): upload the `.nupkg`; the `.snupkg`
     with the same name goes along or right after;
   - **short-lived API key** with restricted scope (only "Push new packages
     and package versions", glob `UniversalOffice.*`, a few days of validity),
     deleted after use:

     ```powershell
     dotnet nuget push ..\out\nuget\UniversalOffice.Core.0.9.2.nupkg --api-key <key> --source https://api.nuget.org/v3/index.json
     ```

     (`dotnet nuget push` sends the `.snupkg` from the same folder automatically).
   - **CI**: prefer nuget.org *Trusted Publishing* (a short-lived OIDC token
     issued to the workflow), with no key stored as a secret.
4. nuget.org validation and indexing take a few minutes; check the
   package page (README, MIT license, dependency on Core).
5. Prefix: ask nuget.org to reserve the `UniversalOffice.` prefix for the
   owning organization — packages with the prefix get the verified badge and
   nobody else can publish with it.

`UniversalOffice.Xlsx` and `UniversalOffice.Pptx` are packed along, but
are not published yet: do not upload those `.nupkg` files.

## Desktop apps

The desktop app (Universal Office (Beta), with the Universal Write, Sheet
and Slides editors) is not released here — see the "Desktop app (Beta)" section of
`docs/development.md` and `desktop/RELEASING.md` (tag `desktop-v<version>`).
