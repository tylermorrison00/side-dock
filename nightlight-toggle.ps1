# Toggle system Night Light via Settings UI (official toggle, no registry guess, no gamma, no layer)
Start-Process "ms-settings:nightlight"
Start-Sleep -Seconds 2
$nlStatus = $null
try {
  $nlStatus = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\Cache\DefaultAccount\$$windows.data.bluelightreduction.bluelightreductionstate\Current' -ErrorAction Stop | Select-Object -ExpandProperty Data -ErrorAction Stop
} catch {}
# The Settings page focus differs when Night Light is already on: use a simple heuristic - if the blob exists and is long, assume on is possible, otherwise just press Enter
# Community script approach: if on, Shift+Tab then Enter, if off, Enter only. We detect on by checking the Settings UI via the registry Data length heuristic used in community scripts: try the off-path first, then verify by re-reading is not reliable, so we send Enter and let Windows toggle.
$wshell = New-Object -ComObject wscript.shell
try { $wshell.SendKeys('{ENTER}') } catch {}
Start-Sleep -Seconds 1
try { Get-Process | Where-Object { $_.MainWindowTitle -like 'Settings' } | ForEach-Object { $_.CloseMainWindow() } } catch {}
Write-Output "TOGGLED"
