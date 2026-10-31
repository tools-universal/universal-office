# Plugins do `<universal-write>`

Plugins são instalados por instância (`editor.use`/`unuse`), o que permite
usar dois editores com conjuntos de extensões diferentes na mesma página, ou
para todas as instâncias com `UniversalWriteElement.register`/`unregister`
(como o `Quill.register`; o registro é o `PluginRegistry` de `shared/ui`).
O `<universal-document-viewer>` aceita os mesmos plugins (mesmos
`inlineRenderers`). Referência completa: README do pacote e `site/docs/write/plugins.html`.

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

## Barras e integração com o app hospedeiro

Além de `inlineRenderers` e `setup`, um plugin pode declarar
`toolbar({ editor, lang, theme, ui })`, que devolve comandos e os lugares deles
nas barras (compacta e ribbon; `before: '<id>'` posiciona antes de um irmão) —
o `modules.toolbar` do Quill. Com ele o hospedeiro usa a barra compacta como a
barra do próprio app:

- `compact.title` troca o título do documento; `compact.leading` e
  `compact.trailing` põem ícone e ações nas pontas; a linha do título fica ACIMA
  dos menus (como o Google Docs) por padrão, e `compact.titlePlacement: 'inline'`
  põe tudo numa linha;
- `ui` é o kit de widgets com o visual da barra (`createBarButton`,
  `createBarIcon`, `createBarRow`, `adoptBarStyles`), também carregável fora do
  editor por `loadBarKit()` para montar a mesma "barra mínima" em prévia ou
  só leitura (`createBarRow`, também com o título acima dos menus por padrão
  quando recebe `title`);
- os rótulos aceitam texto ou `{ en, pt, es }`, no `lang` do contexto (`'en'`,
  `'pt'` ou `'es'`); o `es` é opcional e, sem ele, a interface em espanhol
  mostra o inglês;
- `hidden-commands` esconde comandos, menus e controles; `formatting-policy`
  (ex.: `template-document`) restringe o que o usuário pode formatar;
- `setNotice(el, { tone })` mostra uma faixa do hospedeiro entre os menus e as
  ferramentas; filhos com `slot="side"`/`"side-start"` viram painel lateral
  abaixo das barras (o viewer tem o mesmo slot); `uw-file-drop` (cancelável)
  entrega ao hospedeiro os arquivos soltos no editor.

Exemplos e a lista completa de membros: README do pacote (`packages/editor`,
seções "Plugins", "The editor's bar as the host app's bar", "Side panel" e
"Notice band").

## Inicialização sem backend

Use `manual-init` e forneça fontes/documento como bytes. Nesse caminho o
componente não chama `fetch()`.

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

As quatro variantes da Liberation Sans são obrigatórias: ela é a fonte padrão
e a substituta de último recurso. Aptos, Calibri e tabelas de advances são
opcionais, mas recomendadas para documentos que as usam.

O smoke demo `packages/editor/demo/offline.html` embute fontes/tabelas no
bundle, substitui `fetch` por uma função que sempre lança erro e só mostra
“Pronto — sem fetch e sem backend” depois que o canvas e a mention renderizam.

