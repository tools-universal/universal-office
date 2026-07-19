# Plugins do `<universal-write>`

Plugins são instalados por instância, não em um registro global. Isso permite
usar dois editores com conjuntos de extensões diferentes na mesma página.

## Mention pronta

```ts
import { UniversalWriteElement, createMentionPlugin } from '@universal-office/write';

const editor = document.querySelector('universal-write') as UniversalWriteElement;
editor.use(createMentionPlugin());
editor.insertCustomInline('mention', {
  id: 'ada-lovelace',
  label: 'Ada Lovelace',
});
```

O inline ocupa uma posição atômica no modelo. Ao salvar `.docx`, ele vira um
controle de conteúdo `w:sdt`: o Word exibe `@Ada Lovelace`, enquanto o Write
relê `type`, `data` e `fallbackText` e reaplica o renderer do plugin.

O seletor de sugestões pode ser Quill Mention, um popover próprio, React,
Vue ou qualquer outra UI. A UI escolhe o item e chama `insertCustomInline`;
ela não precisa conhecer OOXML nem o canvas do editor.

## Plugin customizado

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
        // Abra aqui a UI de sugestões (por exemplo, Quill Mention).
      }
    };
    editor.addEventListener('uw-before-input', beforeInput);
    return () => editor.removeEventListener('uw-before-input', beforeInput);
  },
};

editor.use(chips);
editor.unuse('acme.chips');
```

Eventos disponíveis nesta camada:

- `uw-before-input` — cancelável, antes de inserir texto;
- `uw-input` — depois de inserir texto;
- `uw-plugin-added` / `uw-plugin-removed`;
- `uw-custom-inline-inserted`.

## Inicialização sem backend

Use `manual-init` e forneça fontes/documento como bytes. Nesse caminho o
componente não chama `fetch()`.

```ts
const editor = document.querySelector('universal-write') as UniversalWriteElement;
await editor.initialize({
  fonts: [
    { family: 'Aptos', variant: 'regular', data: aptosRegularBytes, advances },
    { family: 'Aptos', variant: 'bold', data: aptosBoldBytes },
    { family: 'Aptos', variant: 'italic', data: aptosItalicBytes },
    { family: 'Aptos', variant: 'boldItalic', data: aptosBoldItalicBytes },
  ],
  document: { bytes: docxBytes, format: 'docx', protected: false },
});
```

As quatro variantes da Aptos são obrigatórias porque ela é o fallback métrico
do motor 1:1. Calibri e tabelas de advances são opcionais, mas recomendadas
para documentos que as usam.

O smoke demo `packages/editor/demo/offline.html` embute fontes/tabelas no
bundle, substitui `fetch` por uma função que sempre lança erro e só mostra
“Pronto — sem fetch e sem backend” depois que o canvas e a mention renderizam.

