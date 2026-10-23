# Teclado no Word SEM foco: a janela do documento fica fora da tela (toolwindow,
# SW_SHOWNOACTIVATE, como a captura PrintWindow da frente Pagina) e as teclas vao por
# PostMessage(WM_KEYDOWN/WM_CHAR/WM_KEYUP) para a janela do texto (_WwG). Nao ativa
# nada e nao le a area de trabalho. Carregar com dot-source. ASCII puro.

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class UwWin {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr h, int i, int v);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint c, uint t);
  public static IntPtr FindChild(IntPtr parent, string cls) {
    IntPtr found = IntPtr.Zero;
    EnumChildWindows(parent, (h, l) => {
      var sb = new StringBuilder(64); GetClassName(h, sb, 64);
      if (sb.ToString() == cls) { found = h; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@

$script:UwState = $null

# mostra a janela do Word fora da tela, sem ativar; devolve o hwnd do texto (_WwG)
function Word-Offscreen($app) {
  $app.WindowState = 0
  $hwnd = [IntPtr]$app.ActiveWindow.Hwnd
  $ex = [UwWin]::GetWindowLong($hwnd, -20)
  $script:UwState = @{ hwnd = $hwnd; ex = $ex; fg = [UwWin]::GetForegroundWindow() }
  [UwWin]::SetWindowLong($hwnd, -20, ($ex -bor 0x80) -band (-bnot 0x40000)) | Out-Null
  [UwWin]::SetWindowPos($hwnd, [IntPtr]::Zero, -20000, -20000, 1200, 900, 0x0010 -bor 0x0004) | Out-Null
  [UwWin]::ShowWindow($hwnd, 4) | Out-Null
  Start-Sleep -Milliseconds 400
  $text = [UwWin]::FindChild($hwnd, '_WwG')
  return $text
}

function Word-Hide($app) {
  if ($script:UwState -eq $null) { return }
  [UwWin]::ShowWindow($script:UwState.hwnd, 0) | Out-Null
  [UwWin]::SetWindowLong($script:UwState.hwnd, -20, $script:UwState.ex) | Out-Null
  $script:UwState = $null
}

# tecla virtual (VK_RETURN 0x0D, VK_BACK 0x08, VK_TAB 0x09, VK_DELETE 0x2E...)
function Word-Key([IntPtr]$h, [int]$vk, [int]$char = 0) {
  $scan = [UwWin]::MapVirtualKey([uint32]$vk, 0)
  $ld = [IntPtr](1 -bor ($scan -shl 16))
  $lu = [IntPtr]((1 -bor ($scan -shl 16)) -bor 0xC0000000)
  [UwWin]::PostMessage($h, 0x0100, [IntPtr]$vk, $ld) | Out-Null
  if ($char -ne 0) { [UwWin]::PostMessage($h, 0x0102, [IntPtr]$char, $ld) | Out-Null }
  [UwWin]::PostMessage($h, 0x0101, [IntPtr]$vk, $lu) | Out-Null
  Start-Sleep -Milliseconds 250
}

# (o Word trata Enter/Backspace/Tab no WM_KEYDOWN E no WM_CHAR: so a tecla, sem o caractere)
function Word-Enter([IntPtr]$h) { Word-Key $h 0x0D 0 }
function Word-Backspace([IntPtr]$h) { Word-Key $h 0x08 0 }
function Word-Tab([IntPtr]$h) { Word-Key $h 0x09 0 }
