# Write — backlog de funcionalidades do editor

Lacunas do `<universal-write>` em relação às faixas de opções do Word 365 pt-BR
(levantamento de 2026-10-21) e o fluxo combinado para fechá-las.

## Fluxo de cada frente

Uma **frente** é um recurso completo (ex.: "tabela: inserir + Design da Tabela
+ Layout da tabela"), não um botão.

1. **Escopo** — antes de codar: comandos, diálogos e comportamentos que entram,
   o que fica de fora e o que é afetado no .docx. O usuário aprova.
2. **Medir no Word** — oráculo COM em segundo plano, sem janela nem foco: XML
   que o Word grava, padrões (larguras, estilos), posição do cursor depois,
   tamanho do passo de desfazer. Os fatos viram casos de teste e nota na memória.
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
9. **Fechamento** — recompilar os bundles versionados; um commit por frente,
   direto na main, feito sem pedir aval quando testes e `lossless-check` estão
   verdes; resumo com print para o usuário; atualizar este arquivo.

Regras gerais:

- Uma frente de CÓDIGO por vez: quase tudo passa por `universal-write.ts`,
  `chrome-commands.ts` e `chrome-layout.ts`.
- Em paralelo, só leitura: uma sessão pode medir no oráculo a PRÓXIMA frente
  enquanto a atual é implementada — nunca edita código.
- Pedir decisão ao usuário só em escopo, comportamento que diverge do Word ou
  mudança no framework compartilhado.

## Backlog

Estado: `—` a fazer · `medindo` · `em curso` · `feito`.
◐ = comando já declarado nas barras; fica oculto até o método existir.

### Fase A — dia a dia

| Frente | Inclui | Estado |
|---|---|---|
| Tabela | ◐ inserir; desenhar; converter texto↔tabela; Design da Tabela (estilos, sombreamento, bordas); Layout (dimensionar, distribuir, alinhar na célula, direção do texto, repetir cabeçalho, fórmula) | — |
| Controle de alterações | ◐ ligar/desligar; ◐ aceitar/rejeitar (uma e todas); anterior/próxima; modo de marcação (Simples/Todas/Nenhuma/Original); Mostrar Marcação; Painel de Revisão | — |
| Notas | ◐ nota de rodapé e de fim; próxima nota; mostrar notas | — |
| Seções e colunas | ◐ quebra de seção e de coluna; Colunas | — |
| Estilos | galeria com miniaturas; painel de estilos; criar/modificar estilo; Inspetor de Estilo | — |
| Navegação | Painel de Navegação; Régua; Linhas de Grade | — |

### Fase B — documento

| Frente | Inclui | Estado |
|---|---|---|
| Cabeçalho e rodapé | primeira página diferente; pares e ímpares diferentes; vincular ao anterior; distância da borda; galerias de modelos | — |
| Imagem | ◐ excluir; posição; quebra automática; cortar; estilos; correções/cor; texto alternativo; Avançar/Recuar, Alinhar, Agrupar, Girar | — |
| Caixa de texto | ◐ inserir; Painel de Seleção | — |
| Links e referências | ◐ Indicador; Referência Cruzada; Legendas; Índice de Ilustrações | — |
| Sumário | inserir sumário (hoje só atualiza); Adicionar Texto | — |
| Página | ◐ marca-d'água; ◐ cor da página; bordas de página; Folha de Rosto; Página em Branco | — |
| Layout do texto | ◐ hifenização; números de linha; recuo/espaçamento em caixas numéricas | — |
| Página Inicial | Colar Especial e opções de colagem; painel da Área de Transferência; sublinhados com estilo; efeitos de texto; lista de vários níveis; bibliotecas de marcadores/numeração; Classificar; Selecionar texto semelhante; Ir para | — |
| Exibir | Estrutura de Tópicos e Rascunho no ribbon (os modos já existem); Lado a Lado; Uma Página/Várias Páginas/Largura da Página; Dividir | — |
| Revisão | Dicionário de Sinônimos; Ler em Voz Alta; Verificar Acessibilidade; Definir Idioma; Excluir Todos/Resolver comentários | — |

### Fase C — objetos

| Frente | Inclui | Estado |
|---|---|---|
| Formas | inserir e editar formas | — |
| Gráficos | inserir/editar gráfico sobre `shared/charts` | — |
| SmartArt | inserir/editar | — |
| Equações | editor de equações (OMML) | — |
| Texto decorativo | WordArt; Letra Capitular; Linha de Assinatura; Partes Rápidas | — |
| Ícones | biblioteca de ícones abertos | — |

### Fase D — avançado

| Frente | Inclui | Estado |
|---|---|---|
| Mala direta | ◐ iniciar; ◐ campo de mesclagem; destinatários; bloco de endereço; saudação; regras; visualizar; concluir; envelopes e etiquetas | — |
| Citações | fontes; estilo (ABNT/APA…); bibliografia | — |
| Índice remissivo | marcar entrada; inserir índice; índice de autoridades | — |
| Proteção | Restringir Edição; Bloquear Autores | — |
| Comparar | Combinar (hoje só compara) | — |
| Desenhar | canetas, marca-texto, borracha, laço, tinta para forma | — |

### Fora do escopo

Macros/VBA e a guia Desenvolvedor, Copilot, Ditar, Editor com IA, SharePoint,
imagens online/banco de imagens, Modelos 3D, vídeo online.
