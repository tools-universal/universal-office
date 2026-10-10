// Diálogo ÚNICO da opção "fontes no arquivo" (Write e Slides; o Sheet não tem:
// o .xlsx não guarda fontes). DOM puro (<dialog>), herda a fonte e o
// color-scheme da página.
import { COMMON_FONTS, type EmbeddingApp, type EmbeddingSkipReason, type FontEmbeddingSettings } from './embedding.js';

export interface FontEmbeddingDialogOptions {
  app: EmbeddingApp;
  settings: FontEmbeddingSettings;
  /** Onde pendurar o <dialog> (padrão: document.body). */
  parent?: HTMLElement;
}

const join = (xs: readonly string[]): string =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`;

/** Abre o diálogo; resolve com as novas opções (OK) ou null (Cancelar/Esc). */
export function openFontEmbeddingDialog(opts: FontEmbeddingDialogOptions): Promise<FontEmbeddingSettings | null> {
  const { app, settings } = opts;
  const dlg = document.createElement('dialog');
  dlg.className = 'uo-font-embedding';
  dlg.style.cssText = 'max-width:460px;border:1px solid color-mix(in srgb,currentColor 25%,transparent);' +
    'border-radius:12px;padding:20px 22px;font:inherit;color:inherit;background:Canvas;';
  const common = join(COMMON_FONTS[app]);
  dlg.innerHTML = `
    <form method="dialog" style="display:flex;flex-direction:column;gap:12px;margin:0">
      <strong style="font-size:1.1em">Fontes no arquivo</strong>
      <label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="embed"> <span>Incorporar fontes no arquivo</span></label>
      <div data-sub style="display:flex;flex-direction:column;gap:10px;margin-left:26px">
        <label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="subset">
          <span>Incorporar só os caracteres usados <small style="opacity:.7">(arquivo menor; editar com outros caracteres em outra máquina usa outra fonte)</small></span></label>
        ${app === 'write'
          ? `<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="skipCommon">
               <span>Não incorporar fontes comuns do sistema <small style="opacity:.7">(${common})</small></span></label>`
          : `<small style="opacity:.7">${common} nunca são incorporadas, como no PowerPoint.</small>`}
      </div>
      <small style="opacity:.7">Só entram fontes cujo arquivo está disponível e cuja licença permite incorporar; as que ficarem de fora são avisadas ao salvar.</small>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">
        <button value="cancel" type="submit">Cancelar</button>
        <button value="ok" type="submit">OK</button>
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

const REASONS: Record<Exclude<EmbeddingSkipReason, 'already-embedded'>, string> = {
  common: 'fonte comum do sistema',
  license: 'a licença não permite',
  unavailable: 'arquivo da fonte indisponível',
};

/** Resumo para a barra de status depois de salvar. Vazio se não houve o que dizer. */
export function describeFontEmbedding(detail: {
  embedded: readonly string[];
  skipped: readonly { family: string; reason: EmbeddingSkipReason }[];
}): string {
  const parts: string[] = [];
  if (detail.embedded.length) parts.push(`Fontes incorporadas: ${join(detail.embedded)}`);
  const by = new Map<string, string[]>();
  for (const s of detail.skipped) {
    if (s.reason === 'already-embedded') continue;
    const r = REASONS[s.reason];
    by.set(r, [...(by.get(r) ?? []), s.family]);
  }
  if (by.size) parts.push(`não incorporadas: ${[...by].map(([r, fs]) => `${join(fs)} (${r})`).join('; ')}`);
  return parts.join(' · ');
}
