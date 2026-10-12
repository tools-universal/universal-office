// Processo principal mínimo do Electron para o corpus-lab (run-ours.mjs --electron): o
// MESMO runtime do shell do UniversalWrite (Electron/Chromium no Windows), sem janela
// visível — o run-ours cria janelas OCULTAS pelo Playwright e roda nelas o harness do
// <universal-write>. As fontes do SO chegam pela ponte do host (system-fonts.cjs), como
// no shell (write/apps/electron/main.cjs).
const { app } = require('electron');

// janelas ocultas não podem ter timers/rAF estrangulados (o editor diagrama e exporta)
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
// sem janelas abertas o app continua vivo (o run-ours fecha no fim)
app.on('window-all-closed', () => {});
