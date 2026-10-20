// Diálogo ÚNICO da opção "fontes no arquivo" (Write e Slides; o Sheet não tem:
// o .xlsx não guarda fontes). DOM puro (<dialog>), herda a fonte e o
// color-scheme da página. Idioma: `lang` (ou o elemento do app, que decide pelo
// próprio atributo `lang`); sem ele, o do navegador — inglês por padrão.
import { COMMON_FONTS, type EmbeddingApp, type EmbeddingSkipReason, type FontEmbeddingSettings } from '@universal-office/fonts';
import { pickLabels, type UiLang } from './i18n.js';

export interface FontEmbeddingDialogOptions {
  app: EmbeddingApp;
  settings: FontEmbeddingSettings;
  /** Onde pendurar o <dialog> (padrão: document.body). */
  parent?: HTMLElement;
  /** Idioma da interface, ou o elemento do app cujo idioma seguir (padrão: o do navegador). */
  lang?: UiLang | Element;
}

const LABELS = {
  en: {
    and: 'and', title: 'Fonts in the file', embed: 'Embed fonts in the file',
    subset: 'Embed only the characters used',
    subsetNote: '(smaller file; editing with other characters on another computer uses another font)',
    skipCommon: 'Do not embed common system fonts',
    neverEmbedded: (common: string) => `${common} are never embedded.`,
    note: 'Only fonts whose file is available and whose license allows embedding are included; the ones left out are reported when saving.',
    cancel: 'Cancel', ok: 'OK',
    reasons: { common: 'common system font', license: 'the license does not allow it', unavailable: 'font file unavailable' },
    embedded: 'Fonts embedded', notEmbedded: 'not embedded',
  },
  pt: {
    and: 'e', title: 'Fontes no arquivo', embed: 'Incorporar fontes no arquivo',
    subset: 'Incorporar só os caracteres usados',
    subsetNote: '(arquivo menor; editar com outros caracteres em outra máquina usa outra fonte)',
    skipCommon: 'Não incorporar fontes comuns do sistema',
    neverEmbedded: (common: string) => `${common} nunca são incorporadas.`,
    note: 'Só entram fontes cujo arquivo está disponível e cuja licença permite incorporar; as que ficarem de fora são avisadas ao salvar.',
    cancel: 'Cancelar', ok: 'OK',
    reasons: { common: 'fonte comum do sistema', license: 'a licença não permite', unavailable: 'arquivo da fonte indisponível' },
    embedded: 'Fontes incorporadas', notEmbedded: 'não incorporadas',
  },
};
type Labels = typeof LABELS.en;

const join = (xs: readonly string[], L: Labels): string =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${L.and} ${xs[xs.length - 1]}`;

/** Abre o diálogo; resolve com as novas opções (OK) ou null (Cancelar/Esc). */
export function openFontEmbeddingDialog(opts: FontEmbeddingDialogOptions): Promise<FontEmbeddingSettings | null> {
  const { app, settings } = opts;
  const L = pickLabels(opts.lang, LABELS);
  const dlg = document.createElement('dialog');
  dlg.className = 'uo-font-embedding';
  dlg.style.cssText = 'max-width:460px;border:1px solid color-mix(in srgb,currentColor 25%,transparent);' +
    'border-radius:12px;padding:20px 22px;font:inherit;color:inherit;background:Canvas;';
  const common = join(COMMON_FONTS[app], L);
  dlg.innerHTML = `
    <form method="dialog" style="display:flex;flex-direction:column;gap:12px;margin:0">
      <strong style="font-size:1.1em">${L.title}</strong>
      <label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="embed"> <span>${L.embed}</span></label>
      <div data-sub style="display:flex;flex-direction:column;gap:10px;margin-left:26px">
        <label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="subset">
          <span>${L.subset} <small style="opacity:.7">${L.subsetNote}</small></span></label>
        ${app === 'write'
          ? `<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="skipCommon">
               <span>${L.skipCommon} <small style="opacity:.7">(${common})</small></span></label>`
          : `<small style="opacity:.7">${L.neverEmbedded(common)}</small>`}
      </div>
      <small style="opacity:.7">${L.note}</small>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">
        <button value="cancel" type="submit">${L.cancel}</button>
        <button value="ok" type="submit">${L.ok}</button>
      </div>
    </form>`;
  const box = (n: string) => dlg.querySelector<HTMLInputElement>(`input[name="${n}"]`);
  const embed = box('embed')!, subset = box('subset')!, skipCommon = box('skipCommon');
  embed.checked = settings.embed;
  subset.checked = settings.subset;
  if (skipCommon) skipCommon.checked = settings.skipCommonFonts;
  const sync = () => {
    for (const el of dlg.querySelectorAll<HTMLInputElement>('[data-sub] input')) el.disabled = !embed.checked;
    dlg.querySelector<HTMLElement>('[data-sub]')!.style.opacity = embed.checked ? '1' : '.5';
  };
  embed.addEventListener('change', sync);
  sync();
  (opts.parent ?? document.body).append(dlg);
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => {
      const ok = dlg.returnValue === 'ok';
      dlg.remove();
      resolve(ok ? {
        embed: embed.checked,
        subset: subset.checked,
        skipCommonFonts: skipCommon ? skipCommon.checked : settings.skipCommonFonts,
      } : null);
    }, { once: true });
    dlg.showModal();
  });
}

/** Resumo para a barra de status depois de salvar. Vazio se não houve o que dizer. */
export function describeFontEmbedding(detail: {
  embedded: readonly string[];
  skipped: readonly { family: string; reason: EmbeddingSkipReason }[];
}, lang?: UiLang | Element): string {
  const L = pickLabels(lang, LABELS);
  const parts: string[] = [];
  if (detail.embedded.length) parts.push(`${L.embedded}: ${join(detail.embedded, L)}`);
  const by = new Map<string, string[]>();
  for (const s of detail.skipped) {
    if (s.reason === 'already-embedded') continue;
    const r = L.reasons[s.reason];
    by.set(r, [...(by.get(r) ?? []), s.family]);
  }
  if (by.size) parts.push(`${L.notEmbedded}: ${[...by].map(([r, fs]) => `${join(fs, L)} (${r})`).join('; ')}`);
  return parts.join(' · ');
}
