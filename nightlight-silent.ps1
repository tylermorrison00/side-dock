# Silent system Night Light toggle, no Settings window, no gamma, no layer
# Logic from nightlight-cli: enabled = Data[18] == 0x15, toggle swaps 41/43 byte blob, increments timestamp bytes 10-14
$key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\default$windows.data.bluelightreduction.bluelightreductionstate\windows.data.bluelightreduction.bluelightreductionstate'
try { $data = (Get-ItemProperty -Path $key -Name Data -ErrorAction Stop).Data } catch { Write-Output "NOKEY"; exit }
if ($data.Length -ne 41 -and $data.Length -ne 43) { Write-Output "UNSUPPORTED"; exit }
if ($data[18] -ne 0x15 -and $data[18] -ne 0x13) { Write-Output "UNSUPPORTED"; exit }
$enabled = ($data[18] -eq 0x15)
# Backup original once
$backup = Join-Path $env:APPDATA 'Side Dock\nightlight-backup.txt'
try { if (-not (Test-Path $backup)) { New-Item -ItemType Directory -Force -Path (Split-Path $backup) | Out-Null; ($data | ForEach-Object { $_.ToString('x2') }) -join '' | Out-File -FilePath $backup -Encoding ascii } } catch {}
if ($enabled) {
  $newData = New-Object byte[] 41
  [Array]::Copy($data, 0, $newData, 0, 22)
  [Array]::Copy($data, 25, $newData, 23, 18)
  $newData[18] = 0x13
} else {
  $newData = New-Object byte[] 43
  [Array]::Copy($data, 0, $newData, 0, 22)
  [Array]::Copy($data, 23, $newData, 25, 18)
  $newData[18] = 0x15
  $newData[23] = 0x10
  $newData[24] = 0x00
}
for ($i = 10; $i -lt 15; $i++) { if ($newData[$i] -ne 0xff) { $newData[$i]++; break } }
try { Set-ItemProperty -Path $key -Name Data -Value $newData -ErrorAction Stop; Write-Output "OK" } catch { Write-Output "FAIL" }
