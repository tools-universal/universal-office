$ErrorActionPreference = 'Stop'
$ppt = New-Object -ComObject PowerPoint.Application
try {
  try { $ppt.WindowState = 2 } catch {}
  $pres = $ppt.Presentations.Open('D:\Projects\OfficeNext\slides\samples\haunted-mansion.pptx', $true, $false, $false)
  $out = 'D:\Projects\OfficeNext\slides\tools\ppt-lab\results\stress\haunted-mansion\ppt'
  New-Item -ItemType Directory -Force -Path $out | Out-Null
  for ($i = 1; $i -le $pres.Slides.Count; $i++) {
    $pres.Slides.Item($i).Export("$out\slide$i.png", 'PNG', 1280, 720)
  }
  Write-Host "exportados $($pres.Slides.Count) slides"
  $pres.Close()
} finally { $ppt.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) }
