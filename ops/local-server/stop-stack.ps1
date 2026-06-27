[CmdletBinding()]
param(
  [switch]$StopCloudflare
)

$ErrorActionPreference = "SilentlyContinue"

# ── NestJS API ve Next.js Web'i durdur ───────────────────────────────────
Write-Host "==> DMyC node surecleri durduruluyor..."
Get-CimInstance Win32_Process | Where-Object {
  ($_.Name -eq "node.exe") -and
  (
    $_.CommandLine -match "dmyc" -or
    $_.CommandLine -match "nest" -or
    $_.CommandLine -match "next"
  )
} | ForEach-Object {
  try { Stop-Process -Id $_.ProcessId -Force } catch {}
}

# ── Portlari serbest birak ────────────────────────────────────────────────
Write-Host "==> Port 4310 ve 4311 serbest birakiliyor..."
foreach ($port in @(4310, 4311)) {
  $listeners = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($l in $listeners) {
    try { Stop-Process -Id $l.OwningProcess -Force } catch {}
  }
}

# ── Cloudflare tunnel ─────────────────────────────────────────────────────
if ($StopCloudflare) {
  Write-Host "==> DMyC cloudflared tunnel durduruluyor..."
  Get-CimInstance Win32_Process | Where-Object {
    $_.Name -ieq 'cloudflared.exe' -and $_.CommandLine -match "dmyc-config"
  } | ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force } catch {}
  }
} else {
  Write-Host "==> Cloudflare tunnel calismaya devam ediyor..."
}

# ── Docker ────────────────────────────────────────────────────────────────
Write-Host "==> dmyc-postgres durduruluyor..."
docker stop dmyc-postgres 2>&1 | Out-Null

Write-Host "==> Tamam."
