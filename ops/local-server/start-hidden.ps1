param(
  [switch]$StartCloudflare
)

$ErrorActionPreference = "Stop"

$repoRoot   = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$configFile = "C:\Users\oxgur\.cloudflared\dmyc-config.yml"

function Start-DmycTunnel {
  $cloudflaredCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\cloudflared.exe"),
    "C:\tools\cloudflared.exe",
    "C:\Program Files\Cloudflare\Cloudflared\cloudflared.exe"
  )
  $cloudflared = $cloudflaredCandidates | Where-Object {
    (Test-Path $_) -and ((Get-Item $_).Length -gt 0)
  } | Select-Object -First 1

  if (-not $cloudflared) {
    Write-Warning "cloudflared bulunamadi."
    return $false
  }

  $alreadyRunning = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -ieq 'cloudflared.exe' -and $_.CommandLine -match "dmyc-config" } |
    Select-Object -First 1

  if (-not $alreadyRunning) {
    Start-Process -FilePath $cloudflared `
      -ArgumentList @("tunnel", "--config", $configFile, "run") `
      -WindowStyle Hidden | Out-Null
    Start-Sleep -Seconds 2
  }

  return [bool](Get-CimInstance Win32_Process |
    Where-Object { $_.Name -ieq 'cloudflared.exe' -and $_.CommandLine -match "dmyc-config" })
}

if ($StartCloudflare) {
  Write-Host "[DMYC] Cloudflare tunnel baslatiliyor..."
  $tunnelOk = Start-DmycTunnel
  if ($tunnelOk) {
    Write-Host "[DMYC] Tunnel OK"
  } else {
    Write-Warning "[DMYC] Tunnel baslanamadi, devam ediliyor..."
  }
}

# Stack'i basla
powershell -NoProfile -ExecutionPolicy Bypass -File "$repoRoot\ops\local-server\start-stack.ps1"
