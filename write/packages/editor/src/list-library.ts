// GERADO por write/tools/home-lab/gen-list-library.mjs — não editar à mão.
// As Bibliotecas de Marcadores, Numeração e Listas de Vários Níveis como o Word as grava
// (oráculo home-lab exp-lists.ps1; memória word-lists-facts): a definição de cada nível
// (w:lvl). Marcadores: {LCID} = idioma do w:tplc (0416 pt-BR, 0409 en-US); {H1}…{H9} =
// styleId dos títulos do documento; {ARTICLE}/{SECTION}/{CHAPTER} = textos no idioma.

export interface LibraryList {
  multiLevelType: string;
  /** w:tmpl fixo (modelos de títulos); sem ele, sorteado */
  tmpl?: string;
  /** os 9 w:lvl (ou 1, na lista legada) */
  levels: string[];
  /** níveis vinculados aos estilos de título (w:pStyle) */
  linked: boolean;
}

export const BULLET_LIBRARY: LibraryList[] = [
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}0009\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF076\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}000B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0D8\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}000D\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0FC\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}0001\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0003\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"o\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\" w:cs=\"Courier New\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}0005\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>"
    ],
    linked: false
  }
];

export const NUMBER_LIBRARY: LibraryList[] = [
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%2.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%3.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%4.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%5.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%6.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%7.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%8.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%9.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"180\"/></w:pPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}0011\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%2.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%3.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%4.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%5.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%6.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%7.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%8.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%9.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"180\"/></w:pPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}0013\"><w:start w:val=\"1\"/><w:numFmt w:val=\"upperRoman\"/><w:lvlText w:val=\"%1.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%2.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%3.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%4.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%5.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%6.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%7.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%8.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%9.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"180\"/></w:pPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}0015\"><w:start w:val=\"1\"/><w:numFmt w:val=\"upperLetter\"/><w:lvlText w:val=\"%1.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%2.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%3.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%4.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%5.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%6.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%7.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%8.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%9.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"180\"/></w:pPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}0017\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%1)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%2.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%3.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%4.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%5.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%6.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%7.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%8.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%9.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"180\"/></w:pPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%1.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%2.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%3.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%4.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%5.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%6.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%7.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%8.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%9.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"180\"/></w:pPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "hybridMultilevel",
    levels: [
      "<w:lvl w:ilvl=\"0\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%1.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%2.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%3.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%4.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%5.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%6.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"180\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\" w:tplc=\"{LCID}000F\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%7.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\" w:tplc=\"{LCID}0019\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%8.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\" w:tplc=\"{LCID}001B\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%9.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"6480\" w:hanging=\"180\"/></w:pPr></w:lvl>"
    ],
    linked: false
  }
];

export const MULTILEVEL_LIBRARY: LibraryList[] = [
  {
    multiLevelType: "multilevel",
    tmpl: "{LCID}001D",
    levels: [
      "<w:lvl w:ilvl=\"0\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"360\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%2)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%3)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1080\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"(%4)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"(%5)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1800\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"(%6)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%7.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2520\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:lvlText w:val=\"%8.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:lvlText w:val=\"%9.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3240\" w:hanging=\"360\"/></w:pPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "multilevel",
    tmpl: "{LCID}001F",
    levels: [
      "<w:lvl w:ilvl=\"0\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"360\" w:hanging=\"360\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.%2.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"792\" w:hanging=\"432\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.%2.%3.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1224\" w:hanging=\"504\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.%2.%3.%4.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1728\" w:hanging=\"648\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.%2.%3.%4.%5.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2232\" w:hanging=\"792\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.%2.%3.%4.%5.%6.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2736\" w:hanging=\"936\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.%2.%3.%4.%5.%6.%7.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3240\" w:hanging=\"1080\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.%2.%3.%4.%5.%6.%7.%8.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3744\" w:hanging=\"1224\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:lvlText w:val=\"%1.%2.%3.%4.%5.%6.%7.%8.%9.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"4320\" w:hanging=\"1440\"/></w:pPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "multilevel",
    tmpl: "{LCID}0021",
    levels: [
      "<w:lvl w:ilvl=\"0\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF076\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"360\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0D8\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1080\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A8\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1800\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0D8\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2160\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2520\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Wingdings\" w:hAnsi=\"Wingdings\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0B7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\"><w:start w:val=\"1\"/><w:numFmt w:val=\"bullet\"/><w:lvlText w:val=\"\uF0A8\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3240\" w:hanging=\"360\"/></w:pPr><w:rPr><w:rFonts w:ascii=\"Symbol\" w:hAnsi=\"Symbol\" w:hint=\"default\"/></w:rPr></w:lvl>"
    ],
    linked: false
  },
  {
    multiLevelType: "multilevel",
    tmpl: "{LCID}0023",
    levels: [
      "<w:lvl w:ilvl=\"0\"><w:start w:val=\"1\"/><w:numFmt w:val=\"upperRoman\"/><w:pStyle w:val=\"{H1}\"/><w:lvlText w:val=\"{ARTICLE} %1.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimalZero\"/><w:pStyle w:val=\"{H2}\"/><w:isLgl/><w:lvlText w:val=\"{SECTION} %1.%2\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:pStyle w:val=\"{H3}\"/><w:lvlText w:val=\"(%3)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"432\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:pStyle w:val=\"{H4}\"/><w:lvlText w:val=\"(%4)\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"864\" w:hanging=\"144\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H5}\"/><w:lvlText w:val=\"%5)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1008\" w:hanging=\"432\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:pStyle w:val=\"{H6}\"/><w:lvlText w:val=\"%6)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1152\" w:hanging=\"432\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:pStyle w:val=\"{H7}\"/><w:lvlText w:val=\"%7)\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"1296\" w:hanging=\"288\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:pStyle w:val=\"{H8}\"/><w:lvlText w:val=\"%8.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"432\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:pStyle w:val=\"{H9}\"/><w:lvlText w:val=\"%9.\"/><w:lvlJc w:val=\"right\"/><w:pPr><w:ind w:left=\"1584\" w:hanging=\"144\"/></w:pPr></w:lvl>"
    ],
    linked: true
  },
  {
    multiLevelType: "multilevel",
    tmpl: "{LCID}0025",
    levels: [
      "<w:lvl w:ilvl=\"0\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H1}\"/><w:lvlText w:val=\"%1\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"432\" w:hanging=\"432\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H2}\"/><w:lvlText w:val=\"%1.%2\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"576\" w:hanging=\"576\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H3}\"/><w:lvlText w:val=\"%1.%2.%3\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:hanging=\"720\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H4}\"/><w:lvlText w:val=\"%1.%2.%3.%4\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"864\" w:hanging=\"864\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H5}\"/><w:lvlText w:val=\"%1.%2.%3.%4.%5\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1008\" w:hanging=\"1008\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H6}\"/><w:lvlText w:val=\"%1.%2.%3.%4.%5.%6\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1152\" w:hanging=\"1152\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H7}\"/><w:lvlText w:val=\"%1.%2.%3.%4.%5.%6.%7\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1296\" w:hanging=\"1296\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H8}\"/><w:lvlText w:val=\"%1.%2.%3.%4.%5.%6.%7.%8\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:hanging=\"1440\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H9}\"/><w:lvlText w:val=\"%1.%2.%3.%4.%5.%6.%7.%8.%9\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1584\" w:hanging=\"1584\"/></w:pPr></w:lvl>"
    ],
    linked: true
  },
  {
    multiLevelType: "multilevel",
    tmpl: "{LCID}0027",
    levels: [
      "<w:lvl w:ilvl=\"0\"><w:start w:val=\"1\"/><w:numFmt w:val=\"upperRoman\"/><w:pStyle w:val=\"{H1}\"/><w:lvlText w:val=\"%1.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\"><w:start w:val=\"1\"/><w:numFmt w:val=\"upperLetter\"/><w:pStyle w:val=\"{H2}\"/><w:lvlText w:val=\"%2.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"720\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H3}\"/><w:lvlText w:val=\"%3.\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"1440\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:pStyle w:val=\"{H4}\"/><w:lvlText w:val=\"%4)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2160\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H5}\"/><w:lvlText w:val=\"(%5)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"2880\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:pStyle w:val=\"{H6}\"/><w:lvlText w:val=\"(%6)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"3600\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:pStyle w:val=\"{H7}\"/><w:lvlText w:val=\"(%7)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"4320\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerLetter\"/><w:pStyle w:val=\"{H8}\"/><w:lvlText w:val=\"(%8)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5040\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\"><w:start w:val=\"1\"/><w:numFmt w:val=\"lowerRoman\"/><w:pStyle w:val=\"{H9}\"/><w:lvlText w:val=\"(%9)\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"5760\" w:firstLine=\"0\"/></w:pPr></w:lvl>"
    ],
    linked: true
  },
  {
    multiLevelType: "multilevel",
    tmpl: "{LCID}0029",
    levels: [
      "<w:lvl w:ilvl=\"0\"><w:start w:val=\"1\"/><w:numFmt w:val=\"decimal\"/><w:pStyle w:val=\"{H1}\"/><w:suff w:val=\"space\"/><w:lvlText w:val=\"{CHAPTER} %1\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"1\"><w:start w:val=\"1\"/><w:numFmt w:val=\"none\"/><w:pStyle w:val=\"{H2}\"/><w:suff w:val=\"nothing\"/><w:lvlText w:val=\"\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"2\"><w:start w:val=\"1\"/><w:numFmt w:val=\"none\"/><w:pStyle w:val=\"{H3}\"/><w:suff w:val=\"nothing\"/><w:lvlText w:val=\"\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"3\"><w:start w:val=\"1\"/><w:numFmt w:val=\"none\"/><w:pStyle w:val=\"{H4}\"/><w:suff w:val=\"nothing\"/><w:lvlText w:val=\"\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"4\"><w:start w:val=\"1\"/><w:numFmt w:val=\"none\"/><w:pStyle w:val=\"{H5}\"/><w:suff w:val=\"nothing\"/><w:lvlText w:val=\"\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"5\"><w:start w:val=\"1\"/><w:numFmt w:val=\"none\"/><w:pStyle w:val=\"{H6}\"/><w:suff w:val=\"nothing\"/><w:lvlText w:val=\"\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"6\"><w:start w:val=\"1\"/><w:numFmt w:val=\"none\"/><w:pStyle w:val=\"{H7}\"/><w:suff w:val=\"nothing\"/><w:lvlText w:val=\"\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"7\"><w:start w:val=\"1\"/><w:numFmt w:val=\"none\"/><w:pStyle w:val=\"{H8}\"/><w:suff w:val=\"nothing\"/><w:lvlText w:val=\"\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>",
      "<w:lvl w:ilvl=\"8\"><w:start w:val=\"1\"/><w:numFmt w:val=\"none\"/><w:pStyle w:val=\"{H9}\"/><w:suff w:val=\"nothing\"/><w:lvlText w:val=\"\"/><w:lvlJc w:val=\"left\"/><w:pPr><w:ind w:left=\"0\" w:firstLine=\"0\"/></w:pPr></w:lvl>"
    ],
    linked: true
  }
];
