param([int]$WarmPercent = 0)
if ($WarmPercent -lt 0) { $WarmPercent = 0 }
if ($WarmPercent -gt 100) { $WarmPercent = 100 }
$code = @"
using System;
using System.Runtime.InteropServices;
public class Gamma {
  [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
  [DllImport("gdi32.dll")] public static extern bool SetDeviceGammaRamp(IntPtr hDC, ushort[] ramp);
  public static bool SetWarm(double warm) {
    IntPtr dc = GetDC(IntPtr.Zero);
    if (dc == IntPtr.Zero) return false;
    double greenF = 1.0 - 0.25 * warm;
    double blueF = 1.0 - 0.60 * warm;
    ushort[] ramp = new ushort[768];
    for (int i = 0; i < 256; i++) {
      ramp[i] = (ushort)Math.Min(65535, i * 257);
      ramp[256 + i] = (ushort)Math.Min(65535, i * 257 * greenF);
      ramp[512 + i] = (ushort)Math.Min(65535, i * 257 * blueF);
    }
    bool ok = SetDeviceGammaRamp(dc, ramp);
    ReleaseDC(IntPtr.Zero, dc);
    return ok;
  }
}
"@
Add-Type -TypeDefinition $code -Language CSharp
$warm = $WarmPercent / 100.0
$result = [Gamma]::SetWarm($warm)
if ($result) { Write-Output "OK" } else { Write-Output "FAIL" }
