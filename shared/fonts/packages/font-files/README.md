# @universal-office/font-files

The open, **metric-compatible fonts** used by the Universal Office web
components (`<universal-write>`, `<universal-document-viewer>`,
`<universal-sheet>`, `<universal-slides>`, `<universal-slides-viewer>`).
They have the same character widths as the Microsoft Office fonts they stand
in for, so line, page and column breaks come out as in Office even when the
reader does not have those fonts.

| Files | Family | Stands in for | License |
|---|---|---|---|
| `liberationsans-*.ttf` | Liberation Sans | Arial (and the default font of last resort) | SIL OFL 1.1 — `LICENSE-liberation.txt` |
| `liberationserif-*.ttf` | Liberation Serif | Times New Roman | SIL OFL 1.1 — `LICENSE-liberation.txt` |
| `liberationmono-*.ttf` | Liberation Mono | Courier New | SIL OFL 1.1 — `LICENSE-liberation.txt` |
| `carlito-*.ttf` | Carlito | Calibri | SIL OFL 1.1 — `LICENSE-carlito.txt` |
| `caladea-*.ttf` | Caladea | Cambria | Apache License 2.0 — `LICENSE-caladea.txt` |

Each family comes in four files: `-regular`, `-bold`, `-italic` and
`-bolditalic`. The components download a file only when a document uses that
family and style.

## Installation

You normally do not install this package yourself: the components depend on
it with an exact version, so npm installs it next to them.

```bash
npm install @universal-office/write   # also installs @universal-office/font-files
```

## Serving the fonts

Serve the package folder as static files and point the component at it — the
folder itself, not a `fonts/` subfolder:

```html
<universal-write fonts="/node_modules/@universal-office/font-files"></universal-write>
```

or, for every component on the page:

```js
import { FontResolver } from '@universal-office/write';

FontResolver.shared().configure({ baseUrl: '/node_modules/@universal-office/font-files' });
```

If you copy the packages to your own static folder, keep one subfolder per
package, as npm lays them out in the scope:

```
/vendor/universal-office/
  write/          ← @universal-office/write
  font-files/     ← @universal-office/font-files (this package)
```

and use `fonts="/vendor/universal-office/font-files"`. The
`<universal-document-viewer>` finds this sibling folder on its own when the
`fonts` attribute is not set.

## License

The fonts are not MIT-licensed: Liberation and Carlito are under the **SIL
Open Font License 1.1** and Caladea under the **Apache License 2.0**, as
stated in the `LICENSE-*.txt` files next to them (keep those files with any
copy of the fonts).
