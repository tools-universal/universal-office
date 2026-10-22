# Write — backlog de funcionalidades do editor

Lacunas do `<universal-write>` em relação às faixas de opções do Word 365 pt-BR
(levantamento de 2026-10-21) e o fluxo combinado para fechá-las. Objetivo:
implementar TUDO, menos o que está em "Fora do escopo", com frentes em paralelo.

## Fluxo de cada frente

Uma **frente** é um recurso completo (ex.: "tabela: inserir + Design da Tabela
+ Layout da tabela"), não um botão. Cada frente roda na própria sessão, no
próprio worktree.

0. **Montar o worktree** — `node tools/parallel/worktree-setup.mjs --build`
   (node_modules por junções, lab local, fonts:sync e os builds que os testes
   consomem). NUNCA `rm -rf` no worktree: as junções levam à cópia principal.
1. **Escopo** — antes de codar: comandos, diálogos e comportamentos que entram,
   o que fica de fora e o que é afetado no .docx. O usuário aprova NA SESSÃO
   da frente.
2. **Medir no Word** — oráculo COM em segundo plano, sem janela nem foco: XML
   que o Word grava, padrões (larguras, estilos), posição do cursor depois,
   tamanho do passo de desfazer. Todo uso de COM passa pela trava global
   (`node tools/parallel/word-lock.mjs -- <comando>`; o `layout-oracle/run.mjs`
   já usa). Os fatos viram casos de teste e nota na memória.
3. **API do editor** — método público no `<universal-write>` (ex.:
   `insertTable`), com desfazer, Modo Protegido e eventos. É o método que faz o
   botão aparecer (`supports = typeof editor[m] === 'function'`).
4. **Render** — se o elemento já é desenhado, conferir o relayout na edição;
   se não, entra no `docx-layout` e no `paintItems` (vale para viewer e PDF).
   Mexeu no layout ou no PDF: port .NET + fixtures de paridade.
5. **Salvar sem perdas** — gravação pelos patches do `SourceStore`, nunca
   reconstruindo do zero; XML novo segue o que o Word grava. `lossless-check` +
   `word-open-check` (o Word abre sem reparar).
6. **Interface** — comandos com rótulo `{ en, pt }` nas duas barras (compacta e
   ribbon) e na guia contextual, se houver. Diálogos e galerias pelo framework
   de `shared/ui`; widget que faltar entra lá (serve ao Slides e ao Sheet). Sem
   "Word"/"Google" nos textos da interface.
7. **Testes** — vitest da API e do modelo, caso do oráculo, conferência no
   navegador (en e pt, barra larga e estreita), suíte do editor verde.
8. **Docs** — README do produto (API nova) e `site/docs/write/api.html`.
9. **Entrega** — commits no branch do worktree, SEM os bundles versionados
   (`*/demo/bundle.js`, `*/demo/chunks/`, `site/assets/universal-office.js`);
   `git rebase main`, testes de novo, e avisar a sessão coordenadora com o
   resumo e um print. Não editar este arquivo (o estado é da coordenadora).

**Sessão coordenadora** (a que abriu as frentes): faz o merge fast-forward de
cada frente na main, sem pedir aval quando testes e `lossless-check` estão
verdes; recompila os bundles e commita; atualiza o estado aqui; desmonta o
worktree (`node tools/parallel/worktree-teardown.mjs`, depois
`git worktree remove`) e abre a próxima frente.

Regras gerais:

- Até 4 frentes de código ao mesmo tempo, escolhidas para mexer em partes
  diferentes do editor (todas passam por `universal-write.ts`,
  `chrome-commands.ts` e `chrome-layout.ts`; conflito nesses arquivos se
  resolve no rebase de quem entrega). A próxima entra quando uma chega na main.
- Pedir decisão ao usuário só em escopo, comportamento que diverge do Word ou
  mudança no framework compartilhado.

## Backlog

Estado: `—` a fazer · `em curso` · `feito`.
◐ = comando já declarado nas barras; fica oculto até o método existir.

### Fase A — dia a dia

| Frente | Inclui | Estado |
|---|---|---|
| Tabela | ◐ inserir; desenhar; converter texto↔tabela; Design da Tabela (estilos, sombreamento, bordas); Layout (dimensionar, distribuir, alinhar na célula, direção do texto, repetir cabeçalho, fórmula) | feito |
| Controle de alterações | ◐ ligar/desligar; ◐ aceitar/rejeitar (uma e todas); anterior/próxima; modo de marcação (Simples/Todas/Nenhuma/Original); Mostrar Marcação; Painel de Revisão | feito |
| Notas | ◐ nota de rodapé e de fim; próxima nota; mostrar notas | feito |
| Seções e colunas | ◐ quebra de seção e de coluna; Colunas | feito |
| Estilos | galeria com miniaturas; painel de estilos; criar/modificar estilo; Inspetor de Estilo | feito |
| Navegação | Painel de Navegação; Régua; Linhas de Grade | feito |

### Fase B — documento

| Frente | Inclui | Estado |
|---|---|---|
| Cabeçalho e rodapé | primeira página diferente; pares e ímpares diferentes; vincular ao anterior; distância da borda; galerias de modelos | feito |
| Imagem | ◐ excluir; posição; quebra automática; cortar; estilos; correções/cor; texto alternativo; Avançar/Recuar, Alinhar, Agrupar, Girar | em curso |
| Caixa de texto | ◐ inserir; Painel de Seleção | — |
| Links e referências | ◐ Indicador; Referência Cruzada; Legendas; Índice de Ilustrações | em curso |
| Sumário | inserir sumário (hoje só atualiza); Adicionar Texto | — |
| Página | ◐ marca-d'água; ◐ cor da página; bordas de página (feito na frente Tabela); Folha de Rosto; Página em Branco | — |
| Layout do texto | ◐ hifenização; números de linha; recuo/espaçamento em caixas numéricas | — |
| Página Inicial | Colar Especial e opções de colagem; painel da Área de Transferência; sublinhados com estilo; efeitos de texto; lista de vários níveis; bibliotecas de marcadores/numeração; Classificar; Selecionar texto semelhante; Ir para | — |
| Exibir | Estrutura de Tópicos e Rascunho no ribbon (os modos já existem); Lado a Lado; Uma Página/Várias Páginas/Largura da Página; Dividir; Nova Janela/Organizar Tudo/Rolagem Sincronizada | — |
| Revisão | Dicionário de Sinônimos; Ler em Voz Alta; Verificar Acessibilidade; Definir Idioma; Excluir Todos/Resolver comentários | — |
| Macros | preservar: abrir `.docm/.dotm/.dotx`, salvar no tipo certo, "Salvar como .docx" tira as macros com aviso, faixa "contém macros, que não são executadas aqui", `.doc` mantém o VBA ao converter; ver: Exibir › Macros com a lista de módulos e o código só leitura, gatilhos automáticos em destaque | em curso |

### Fase C — objetos

| Frente | Inclui | Estado |
|---|---|---|
| Formas | inserir e editar formas | — |
| Gráficos | inserir/editar gráfico sobre `shared/charts` | — |
| SmartArt | inserir/editar | — |
| Equações | editor de equações (OMML) | — |
| Texto decorativo | WordArt; Letra Capitular; Linha de Assinatura; Partes Rápidas | — |
| Ícones | biblioteca de ícones abertos | — |
| Mídia e 3D | Modelos 3D (glTF); vídeo online | — |
| Imagens online | busca de imagens e banco de imagens — precisa de um provedor (decidir quando chegar a vez) | — |

### Fase D — avançado

| Frente | Inclui | Estado |
|---|---|---|
| Mala direta | ◐ iniciar; ◐ campo de mesclagem; destinatários; bloco de endereço; saudação; regras; visualizar; concluir; envelopes e etiquetas | — |
| Citações | fontes; estilo (ABNT/APA…); bibliografia | — |
| Índice remissivo | marcar entrada; inserir índice; índice de autoridades | — |
| Proteção | Restringir Edição; Bloquear Autores | — |
| Comparar | Combinar (hoje só compara) | — |
| Desenhar | canetas, marca-texto, borracha, laço, tinta para forma | — |
| Ditar | ditado por voz — precisa de um motor de reconhecimento (decidir quando chegar a vez) | — |
| Desenvolvedor | controles de conteúdo; XML Mapping | — |

### Pendências deixadas pelas frentes

| Origem | Pendência |
|---|---|
| Tabela | Ajustar Texto (`tcFitText`): a regra do Word não saiu das medições; a opção é gravada, mas o layout não a aplica |
| Tabela | Bordas de página artísticas: ficaram de fora porque as imagens são do Word |
| Tabela | A colação do Windows é um alias para `sheet/packages/calc/src/collation.ts`; ir para um lugar compartilhado |
| Tabela | Inserir tabela no parágrafo vazio logo depois de outra tabela deixa as duas coladas |
| Tabela | O título "Documento sem título" não troca de idioma quando o `lang` muda depois de montado |
| Tabela | `<universal-sheet>`: `setCellValue(0, …)` cria uma referência de célula inválida |
| Seções | Larguras das colunas Esquerda/Direita não medidas (o COM não alcança a galeria); hoje é uma grade de 3 |
| Notas | Fixtures de paridade `symnotdef/sn-arial` diferem entre JS e .NET (anterior às notas) |
| Notas | O título do iniciador de Estilos repete o atalho: "Estilos (Ctrl+Alt+Shift+S) (Ctrl+Alt+Shift+S)" |
| Cabeçalho e rodapé | A lista de formatos do diálogo Data e Hora vem das convenções de cada idioma (o COM não a expõe); um print do diálogo do Word fecharia a comparação |

### Fora do escopo

SharePoint (e as propriedades do SharePoint), os assistentes de IA (Copilot,
Editor com IA) e EXECUTAR ou editar macros VBA (análise de 2026-10-21: 0,1% do
corpus com lógica; exigiria interpretador VBA + modelo de objetos do Word, e
macro é o principal vetor de malware do Office).
