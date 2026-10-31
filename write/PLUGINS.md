# `<universal-write>` plugins

Plugins are installed per instance (`editor.use`/`unuse`), which allows
using two editors with different sets of extensions on the same page, or
for all instances with `UniversalWriteElement.register`/`unregister`
(like `Quill.register`; the registry is the `PluginRegistry` from `shared/ui`).
`<universal-document-viewer>` accepts the same plugins (the same
`inlineRenderers`). Full reference: the package README and `site/docs/write/plugins.html`.

## Ready-made mention

```ts
import { UniversalWriteElement, createMentionPlugin } from '@universal-office/write';

const editor = document.querySelector('universal-write') as UniversalWriteElement;
editor.use(createMentionPlugin());
editor.insertCustomInline('mention', {
  id: 'ada-lovelace',
  label: 'Ada Lovelace',
});
```

The inline takes up one atomic position in the model. When saving `.docx`, it becomes a
`w:sdt` content control: Word displays `@Ada Lovelace`, while Write
rereads `type`, `data` and `fallbackText` and reapplies the plugin's renderer.

The suggestion picker can be Quill Mention, your own popover, React,
Vue or any other UI. The UI picks the item and calls `insertCustomInline`;
it does not need to know OOXML or the editor's canvas.

## Custom plugin

```ts
import type { UniversalWritePlugin } from '@universal-office/write';

const chips: UniversalWritePlugin = {
  id: 'acme.chips',
  inlineRenderers: [{
    type: 'customer',
    toText: (data: any) => data.name,
    measure: ({ fallbackText, measureText }) => ({
      widthTwips: measureText(fallbackText) + 200,
    }),
    draw: ({ ctx, xTwips, baselineTwips, scale, fallbackText }) => {
      ctx.fillStyle = '#e8def8';
      ctx.fillRect(xTwips * scale, (baselineTwips - 220) * scale, 900 * scale, 260 * scale);
      ctx.fillStyle = '#381e72';
      ctx.fillText(fallbackText, (xTwips + 100) * scale, baselineTwips * scale);
    },
  }],
  setup: ({ editor }) => {
    const beforeInput = (event: Event) => {
      const input = event as CustomEvent<{ text: string }>;
      if (input.detail.text === '@') {
        // Open the suggestions UI here (for example, Quill Mention).
      }
    };
    editor.addEventListener('uw-before-input', beforeInput);
    return () => editor.removeEventListener('uw-before-input', beforeInput);
  },
};

editor.use(chips);
editor.unuse('acme.chips');
```

Events available at this layer:

- `uw-before-input` — cancelable, before inserting text;
- `uw-input` — after inserting text;
- `uw-plugin-added` / `uw-plugin-removed`;
- `uw-custom-inline-inserted`.

## Bars and integration with the host app

Besides `inlineRenderers` and `setup`, a plugin can declare
`toolbar({ editor, lang, theme, ui })`, which returns commands and their places
in the bars (compact and ribbon; `before: '<id>'` places it before a sibling) —
Quill's `modules.toolbar`. With it the host uses the compact bar as
its own app bar:

- `compact.title` replaces the document title; `compact.leading` and
  `compact.trailing` put an icon and actions at the ends; the title row sits ABOVE
  the menus (like Google Docs) by default, and `compact.titlePlacement: 'inline'`
  puts everything on one row;
- `ui` is the widget kit with the bar's look (`createBarButton`,
  `createBarIcon`, `createBarRow`, `adoptBarStyles`), which can also be loaded outside the
  editor through `loadBarKit()` to build the same "minimal bar" in a preview or
  read-only view (`createBarRow`, also with the title above the menus by default
  when it receives `title`);
- labels accept text or `{ en, pt, es }`, in the context's `lang` (`'en'`,
  `'pt'` or `'es'`); `es` is optional and, without it, the Spanish interface
  shows the English text;
- `hidden-commands` hides commands, menus and controls; `formatting-policy`
  (e.g. `template-document`) restricts what the user can format;
- `setNotice(el, { tone })` shows a host strip between the menus and the
  tools; children with `slot="side"`/`"side-start"` become a side panel
  below the bars (the viewer has the same slot); `uw-file-drop` (cancelable)
  hands the files dropped on the editor to the host.

Examples and the full list of members: the package README (`packages/editor`,
sections "Plugins", "The editor's bar as the host app's bar", "Side panel" and
"Notice band").

## Initialization without a backend

Use `manual-init` and provide fonts/document as bytes. On this path the
component does not call `fetch()`.

```ts
const editor = document.querySelector('universal-write') as UniversalWriteElement;
await editor.initialize({
  fonts: [
    { family: 'Liberation Sans', variant: 'regular', data: regularBytes, advances },
    { family: 'Liberation Sans', variant: 'bold', data: boldBytes },
    { family: 'Liberation Sans', variant: 'italic', data: italicBytes },
    { family: 'Liberation Sans', variant: 'boldItalic', data: boldItalicBytes },
  ],
  document: { bytes: docxBytes, format: 'docx', protected: false },
});
```

The four Liberation Sans variants are required: it is the default font
and the last-resort substitute. Aptos, Calibri and advance tables are
optional, but recommended for documents that use them.

The smoke demo `packages/editor/demo/offline.html` embeds fonts/tables in the
bundle, replaces `fetch` with a function that always throws and only shows
“Pronto — sem fetch e sem backend” (Ready — no fetch and no backend) after the canvas and the mention render.

