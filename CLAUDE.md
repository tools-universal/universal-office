# Universal Office — regras do repositório

## Fontes proprietárias: NUNCA commitar

Nenhum arquivo de fonte proprietária entra no repositório — nem em pasta de
lab, fixture, demo ou site, nem por um commit "temporário". Isso vale para
qualquer fonte da Microsoft/Monotype (Aptos, Aptos Narrow, Aptos Display,
Calibri, Arial, Segoe, Cambria, Tahoma, Times New Roman…) e para qualquer
fonte comercial (ex.: Proxima Nova) ou com incorporação restrita. A licença
embutida nelas ("Microsoft supplied font") só permite usá-las no produto em
que vieram e embuti-las em documentos; o ARQUIVO da fonte não pode ser
redistribuído — repositório privado também é distribuição. Tampouco entram
cópias disfarçadas: `.odttf` extraídas, documento do Office usado como
contêiner para extrair a fonte, bundle com a fonte em base64.

- **Uso local** (demos, labs de fidelidade, testes de PDF): `npm run
  fonts:sync` copia as fontes instaladas na máquina (Windows\Fonts, fontes do
  usuário, cache CloudFonts do Office 365) para os caminhos que o código
  espera — todos no `.gitignore`. Sem elas, o app cai na substituta aberta
  (Liberation Sans) e os testes usam fontes abertas versionadas.
- **Bloqueio automático** (pelo conteúdo, não só pelo nome):
  `tools/fonts/check-fonts.mjs`, rodado pelo hook de pre-commit
  (`.githooks/`, ativado por `npm run hooks:install` / `npm install` na raiz)
  e pelo CI (`.github/workflows/fonts.yml`). Nunca contornar com `git add -f`,
  `--no-verify` ou mudando o verificador para passar.
- **Fontes abertas** (OFL, Apache, Ubuntu Font Licence…) podem ser
  versionadas. Se o arquivo não declara a licença de forma legível (ou é
  EOT/`.fntdata`), registrar sha256 + licença + origem em
  `tools/fonts/allowed-fonts.txt`.
- **Documentos de amostra** (`.pptx`/`.docx`/`.xlsx`) com fonte EMBUTIDA só
  entram se a licença de cada fonte permitir a incorporação (fsType 0/8) — e
  também precisam constar em `allowed-fonts.txt`. Decks de templates de
  terceiros com fontes comerciais embutidas ficam fora do repositório.
- Encontrou uma fonte proprietária já versionada? Não basta apagar na ponta:
  ela fica no histórico — avise para reescrever o histórico.

## Resolução de fontes: um lugar só

Write, Sheet e Slides resolvem fontes da MESMA forma, em `shared/fonts`
(`@universal-office/fonts`) — não reimplementar nos apps. Lá ficam o
resolvedor dos web components (`FontResolver`: host → Local Font Access →
embarcada → `@font-face` da página → instalada pelo nome → substituta
métrico-compatível → Liberation Sans; o Write usa `getWithFile`: mede e
embute só com o ARQUIVO da fonte, então "instalada pelo nome" vira a
substituta, igual na tela e no PDF), o módulo de fontes do SO dos shells
Electron (`node/system-fonts.cjs`) e as substitutas ABERTAS (`files/`:
Carlito, Caladea, Liberation Serif/Mono — `npm run fonts:sync` copia para os
demos/site). Fontes embutidas no documento continuam com cada componente.
A opção "fontes no arquivo" também é única (`embedding.ts` decide o que
entra, `ooxml.ts` grava .docx/.pptx, `dialog.ts` é o diálogo dos dois apps);
o Sheet não tem — o .xlsx não guarda fontes (o Excel não oferece).
Fatos medidos que guiam o desenho: `document.fonts.check` devolve `true` para
qualquer família (não serve para saber se a fonte existe); nenhum navegador
enxerga o cache de fontes do Office (Aptos); só o Chromium enumera/dá bytes
(`queryLocalFonts`, com permissão); Firefox privado/ETP estrito só vê as
fontes base do sistema.
