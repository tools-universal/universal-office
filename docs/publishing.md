# Publicação — npm e NuGet

Como sai uma versão dos pacotes do UniversalOffice. Tudo é MIT (ver `LICENSE`);
os dados de terceiros (fontes, Hunspell, dicionários, padrões de hifenização)
levam os próprios textos de licença dentro do pacote. O que mudou em cada
versão vai no `CHANGELOG.md`.

## O que existe e o que está publicado

| Pacote | Origem | Versão atual | Publicado? |
|---|---|---|---|
| `@universal-office/write` | `write/packages/editor` (+ entrada `./viewer`) | 0.9.1 | sim |
| `@universal-office/document-viewer` | `write/packages/viewer` | 0.9.1 | sim |
| `@universal-office/font-files` | `shared/fonts/packages/font-files` | 0.9.1 | sim |
| `@universal-office/spellcheck` | `shared/spell/packages/spellcheck` | 0.9.1 | sim |
| `@universal-office/dictionary-pt-br` | `shared/spell/packages/dictionary-pt-br` | 0.9.1 | sim |
| `@universal-office/dictionary-en-us` | `shared/spell/packages/dictionary-en-us` | 0.9.1 | sim |
| `@universal-office/compare` | `write/packages/compare` | 0.0.1 | sim |
| `@universal-office/presentation-viewer` | `slides/packages/viewer` | 0.0.1 | sim |
| `@universal-office/sheet` | `sheet/packages/sheet` | 0.0.1 | **não** (gerado, ainda não publicado) |
| `@universal-office/slides` | `slides/packages/slides` | 0.0.1 | **não** (gerado, ainda não publicado) |
| `UniversalOffice.Core` (NuGet) | `dotnet/src/UniversalOffice.Core` (Core + Fonts + Pdf + DrawingML) | 0.9.1 | sim |
| `UniversalOffice.Docx` (NuGet) | `dotnet/src/UniversalOffice.Docx` (Docx + Editing + DocxLayout + DocBinary + exportadores do docx) | 0.9.1 | sim |
| `UniversalOffice.Xlsx` (NuGet) | `dotnet/src/UniversalOffice.Xlsx` | 0.9.1 | **não** (empacotado) |
| `UniversalOffice.Pptx` (NuGet) | `dotnet/src/UniversalOffice.Pptx` | 0.9.1 | **não** (empacotado) |

Os pacotes internos do monorepo (`fonts`, `charts`, `drawingml`, `ui`, `spell`,
`docx-core`, `docx-layout`, `sheet-core`, `sheet-calc`, `slides-core`) são
`private` e nunca vão para o registro: só existem dentro dos bundles.

## Regras de versão

- `write` e `document-viewer` têm SEMPRE a mesma versão (o write leva o mesmo
  viewer como 2ª entrada, `@universal-office/write/viewer`). O par `slides` /
  `presentation-viewer` também.
- Os produtos com fontes (`write`, `document-viewer`, `sheet`,
  `presentation-viewer`, `slides`) dependem do `@universal-office/font-files`
  com a versão EXATA que está no `package.json` dele no momento do build
  (hoje 0.9.1, inclusive nos produtos 0.0.1). Mudou o `font-files`: publique-o
  ANTES dos produtos, e só republique os produtos que precisam da versão nova.
- `spellcheck` e os dicionários são opcionais e independentes do write; a
  recomendação é instalá-los na mesma versão do write.
- NuGet: a versão vem do `<Version>` do `dotnet/Directory.Build.props` (a
  mesma para os quatro pacotes) e acompanha a do `write`.
- Versão publicada não se republica (npm e nuget.org recusam o mesmo número):
  qualquer correção, mesmo só no README, é uma versão nova. O README do
  pacote vai dentro dele — o que está no repositório só aparece no registro na
  próxima versão.

## npm

Pré-requisitos: dependências instaladas (`npm run install:all`) e uma conta
membro da organização `@universal-office` no npmjs.com, com 2FA ligado.

1. Ajuste a versão no `package.json` de cada pacote que vai sair (e nos pares
   acima) e registre a versão no `CHANGELOG.md`.
2. Gere a pasta publicável de cada pacote (ou de todos, sem argumentos):

   ```bash
   node tools/build-pkg.mjs font-files write document-viewer
   ```

   O `tools/build-pkg.mjs` (também `npm run build:pkg`) grava
   `<pacote>/publish/` (fora do git, recriada a cada build): o bundle com todo
   o código (pacotes internos pelo src, dependências npm, `chunks/` sob
   demanda), um `.d.ts` por entrada, `licenses/` de terceiros, README (com os
   GIFs em `media/`), `LICENSE` e o `package.json` publicável (descrição,
   palavras-chave e licença vêm do bloco `publish` do `package.json` da pasta).
   O build falha se um produto embutir o motor ou um dicionário da revisão.
3. Empacote de dentro de `publish/`, com o `.tgz` fora dela (o próximo build
   apaga a pasta), e confira o conteúdo:

   ```bash
   cd write/packages/editor/publish
   npm pack --pack-destination ../../../../out
   tar -tzf ../../../../out/universal-office-write-0.9.1.tgz
   ```

4. Publique o `.tgz` (pacote com escopo precisa de `--access public` na 1ª
   publicação; o npm pede o código do 2FA, ou passe `--otp <código>`):

   ```bash
   npm publish ../../../../out/universal-office-write-0.9.1.tgz --access public
   ```

   Ordem: `font-files` → `spellcheck` e dicionários → `document-viewer` e
   `write` (juntos) → os demais produtos.
5. Confira: `npm view @universal-office/write version dependencies`.

Como o host consome (bundler × pasta estática `/vendor/universal-office/<pacote>/`,
atributos `fonts`, `spellcheck-url`, `spellcheck-languages`,
`registerSpellcheck`/`registerDictionary`/`configureSpellcheck`): READMEs dos
pacotes (`write/packages/editor/README.md`, seções "Installation" e "Spelling").

## NuGet

Pré-requisitos: SDK do .NET 8+ e uma conta no nuget.org que seja dona (ou
membro com permissão de publicar) da organização dona dos pacotes.

1. Ajuste `<Version>` em `dotnet/Directory.Build.props` (metadados comuns:
   autor, copyright, `PackageLicenseExpression` MIT, README, símbolos
   `.snupkg`, build determinístico, sem URL de repositório).
2. Empacote (só os projetos com `IsPackable=true`: Core, Docx, Xlsx, Pptx):

   ```powershell
   cd dotnet
   dotnet test
   dotnet pack UniversalOffice.sln -c Release -o ..\out\nuget
   ```

   Sai um `.nupkg` e um `.snupkg` por pacote. O README de cada projeto vai na
   raiz do pacote; o `UniversalOffice.Core` leva também os avisos do hyph-utf8
   em `licenses/hyphenation/`.
3. Publique o `UniversalOffice.Core` ANTES do `UniversalOffice.Docx` (que
   depende dele), por um dos caminhos:
   - **upload pela web** (nuget.org › Upload): envie o `.nupkg`; o `.snupkg`
     de mesmo nome vai junto ou em seguida;
   - **chave de API de vida curta** e escopo restrito (só "Push new packages
     and package versions", glob `UniversalOffice.*`, poucos dias de validade),
     apagada depois do uso:

     ```powershell
     dotnet nuget push ..\out\nuget\UniversalOffice.Core.0.9.1.nupkg --api-key <chave> --source https://api.nuget.org/v3/index.json
     ```

     (o `dotnet nuget push` envia o `.snupkg` da mesma pasta automaticamente).
   - **CI**: preferir o *Trusted Publishing* do nuget.org (token OIDC de curta
     duração emitido para o workflow), sem chave guardada em segredo.
4. A validação e a indexação do nuget.org levam alguns minutos; confira a
   página do pacote (README, licença MIT, dependência do Core).
5. Prefixo: pedir ao nuget.org a reserva do prefixo `UniversalOffice.` para a
   organização dona — pacotes com o prefixo ganham o selo de verificado e
   ninguém mais publica com ele.

`UniversalOffice.Xlsx` e `UniversalOffice.Pptx` são empacotados junto, mas não
são publicados ainda: não envie esses `.nupkg`.

## Apps desktop

Os apps desktop (Universal Write, Sheet e Slides, Beta) não saem por aqui —
ver a seção "Apps desktop" do `README.md` da raiz.
