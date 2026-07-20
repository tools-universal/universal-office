# @universal/slides-export

Exportadores do slides (spec 05): `.pptx` (bytes) → **Markdown**, **HTML
estático**, **PDF vetorial** e **imagens PNG por slide**. Browser + node, sem
`fs`/DOM obrigatórios. **SEM vídeo** (fora de escopo).

```ts
import { pptxToMarkdown, pptxToHtml, pptxToPdf, pptxToImages } from '@universal/slides-export';

pptxToMarkdown(bytes, { images: 'data' | 'omit' });   // string
pptxToHtml(bytes, { images: 'data' | 'omit', fullDocument: true }); // string
pptxToPdf(bytes, { fonts });                          // Uint8Array
await pptxToImages(bytes, { scale, canvas });         // Uint8Array[] (1 PNG/slide)
```

## Markdown

`## Slide N — <título>` (placeholder title/ctrTitle; senão o primeiro texto),
bullets por nível (`-`; buAutoNum vira lista numerada), tabelas GFM, imagens
como `[imagem]` (default) ou data URI (`images: 'data'`), notas do apresentador
(parte notesSlide) como blockquote. O texto usa a cascata de estilos da spec 03
já resolvida no read.

## HTML

Um `<section class="slide">` por slide (width natural @96dpi + `aspect-ratio`
do sldSz), shapes absolutas em % (EMU→%), fills/gradientes/bordas/texto com
estilos inline, imagens data URI (default; `images: 'omit'` remove), tabelas
HTML, fundo do slide. Estático — sem animações/transições.

## PDF (vetorial)

Reusa `@wordnext/pdf`: 1 página por slide (EMU→pt); fundo, presets da spec 03
como paths (bezier p/ elipse/roundRect/pie), texto via `layoutTextBody` com
métricas TTF (parser SFNT próprio), tabelas e imagens.

- **`opts.fonts` é OBRIGATÓRIO** (o gerador não tem base-14): TTFs
  regular/bold/italic/bold-italic.
- Imagens: JPEG embute direto (DCTDecode); PNG é decodificado (fflate) →
  RGB + SMask p/ alpha. **Outros formatos (gif/svg/webp/bmp) viram placeholder
  cinza silencioso.**
- Aproximações: gradiente → 24 faixas interpoladas recortadas pelo path;
  sombras/transparências ignoradas (opaco); charts → placeholder cinza.

## Imagens (PNG por slide)

Usa a função pura `paintSlideTo` do slides-core (o MESMO paint do
webcomponent).

- **Browser:** funciona sem opções (OffscreenCanvas/`<canvas>` +
  `createImageBitmap`).
- **Node:** o pacote não embute dependência nativa — injete a factory:

```ts
import { createCanvas, loadImage } from '@napi-rs/canvas';
await pptxToImages(bytes, {
  canvas: (w, h) => createCanvas(w, h),
  // opcional, para decks com imagens:
  decodeImage: async (ref) => loadImage(Buffer.from(ref.bytes)),
});
```

Sem factory e sem DOM, `pptxToImages` rejeita com erro orientando a passar
`opts.canvas`. `scale` multiplica a resolução base de 96dpi.
