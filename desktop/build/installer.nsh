; Instalador NSIS da suíte Universal Office (Beta) — incluído pelo
; electron-builder (nsis.include). Um só executável, três editores: em vez do
; atalho "Universal Office", um atalho por editor no menu Iniciar e na área de
; trabalho, cada um com --editor=<editor>, o ícone dele (resources\icons) e o
; AppUserModelID dele (<appId>.<editor>, o mesmo que o main põe nas janelas
; com setAppDetails): no Windows, ícone e grupo próprios na barra de tarefas.
; Uma única entrada em "Aplicativos instalados".

!macro uoShortcut UO_KIND UO_NAME UO_DESC
  CreateShortCut "$SMPROGRAMS\${UO_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--editor=${UO_KIND}" "$INSTDIR\resources\icons\${UO_KIND}.ico" 0 "" "" "${UO_DESC}"
  WinShell::SetLnkAUMI "$SMPROGRAMS\${UO_NAME}.lnk" "${APP_ID}.${UO_KIND}"
  CreateShortCut "$DESKTOP\${UO_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "--editor=${UO_KIND}" "$INSTDIR\resources\icons\${UO_KIND}.ico" 0 "" "" "${UO_DESC}"
  WinShell::SetLnkAUMI "$DESKTOP\${UO_NAME}.lnk" "${APP_ID}.${UO_KIND}"
!macroend

!macro uoRemoveShortcut UO_NAME
  WinShell::UninstShortcut "$SMPROGRAMS\${UO_NAME}.lnk"
  Delete "$SMPROGRAMS\${UO_NAME}.lnk"
  WinShell::UninstShortcut "$DESKTOP\${UO_NAME}.lnk"
  Delete "$DESKTOP\${UO_NAME}.lnk"
!macroend

!macro customInstall
  !insertmacro uoShortcut "write" "Universal Write (Beta)" "Universal Write: .docx, .doc, .odt"
  !insertmacro uoShortcut "sheet" "Universal Sheet (Beta)" "Universal Sheet: .xlsx, .xlsm, .xls"
  !insertmacro uoShortcut "slides" "Universal Slides (Beta)" "Universal Slides: .pptx, .ppt"
  ; o Explorer relê os ícones dos atalhos e das associações
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro customUnInstall
  ; atualização (o desinstalador antigo roda com --updated): os atalhos ficam
  ; onde o usuário os deixou; o instalador novo os regrava
  ${ifNot} ${isUpdated}
    !insertmacro uoRemoveShortcut "Universal Write (Beta)"
    !insertmacro uoRemoveShortcut "Universal Sheet (Beta)"
    !insertmacro uoRemoveShortcut "Universal Slides (Beta)"
    ; o un.onInit do electron-builder faz SetOutPath $INSTDIR: com a pasta como
    ; diretório atual, o RMDir /r dele a esvazia mas não a apaga
    SetOutPath $TEMP
    RMDir $INSTDIR
  ${endIf}
!macroend
