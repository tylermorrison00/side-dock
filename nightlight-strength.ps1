param([string]$Action = "get", [int]$Percent = 50)
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\default$windows.data.bluelightreduction.settings\windows.data.bluelightreduction.settings'
try { $data = (Get-ItemProperty -Path $key -Name Data -ErrorAction Stop).Data } catch { Write-Output "NOKEY"; exit }
if ($data.Length -le 0x24) { Write-Output "UNSUPPORTED"; exit }
if ($Action -eq "get") {
  $kelvin = ($data[0x24] * 64) + (($data[0x23] - 128) / 2)
  $pct = [math]::Round(100 - (($kelvin - 1200) / (6500 - 1200)) * 100)
  if ($pct -lt 0) { $pct = 0 }; if ($pct -gt 100) { $pct = 100 }
  Write-Output $pct; exit
}
# set
if ($Percent -lt 0) { $Percent = 0 }; if ($Percent -gt 100) { $Percent = 100 }
$backup = Join-Path $env:APPDATA 'Side Dock\nightlight-settings-backup.txt'
try { if (-not (Test-Path $backup)) { New-Item -ItemType Directory -Force -Path (Split-Path $backup) | Out-Null; ($data | ForEach-Object { $_.ToString('x2') }) -join '' | Out-File -FilePath $backup -Encoding ascii } } catch {}
$kelvin = 6500 - ($Percent / 100) * (6500 - 1200)
$tempHi = [math]::Floor($kelvin / 64)
$tempLo = (($kelvin - ($tempHi * 64)) * 2) + 128
$newData = New-Object byte[] $data.Length
[Array]::Copy($data, $newData, $data.Length)
$newData[0x23] = [byte]$tempLo
$newData[0x24] = [byte]$tempHi
for ($i = 10; $i -lt 15; $i++) { if ($newData[$i] -ne 0xff) { $newData[$i]++; break } }
try { Set-ItemProperty -Path $key -Name Data -Value $newData -ErrorAction Stop; Write-Output "OK" } catch { Write-Output "FAIL" }
