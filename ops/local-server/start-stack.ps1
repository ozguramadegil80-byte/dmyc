param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$logsDir  = Join-Path $repoRoot "ops\local-server\logs"
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

function Test-TcpPortOpen {
  param([int]$Port, [int]$TimeoutMs = 1500)
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    if (-not $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) { $client.Close(); return $false }
    $client.EndConnect($iar) | Out-Null
    $client.Close()
    return $true
  } catch { try { $client.Close() } catch {}; return $false }
}

function Stop-ProcessOnPort {
  param([int]$Port)
  $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $listeners) { return }
  foreach ($l in $listeners) {
    try { Stop-Process -Id $l.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
  }
  Start-Sleep -Milliseconds 600
}

# ── 1. Docker (postgres) ───────────────────────────────────────────────────
Write-Host "[DMYC] Docker container baslatiliyor (dmyc-postgres)..."
try {
  docker start dmyc-postgres 2>&1 | Out-Null
  Write-Host "[DMYC] dmyc-postgres OK"
} catch {
  Write-Warning "[DMYC] Docker baslatma hatasi: $($_.Exception.Message)"
}

Start-Sleep -Seconds 2

# ── 2. API (port 4311) ────────────────────────────────────────────────────
Write-Host "[DMYC] API baslatiliyor (port 4311)..."
Stop-ProcessOnPort -Port 4311

$apiDir  = Join-Path $repoRoot "apps\api"
$apiOut  = Join-Path $logsDir "api.out.log"
$apiErr  = Join-Path $logsDir "api.err.log"

Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c npm run start:dev > `"$apiOut`" 2> `"$apiErr`"" `
  -WorkingDirectory $apiDir `
  -WindowStyle Hidden

# ── 3. Web (port 4310) ────────────────────────────────────────────────────
Write-Host "[DMYC] Web build basliyor (bu 1-2 dakika surebilir)..."
Stop-ProcessOnPort -Port 4310

$webDir = Join-Path $repoRoot "apps\web"
$webOut = Join-Path $logsDir "web.out.log"
$webErr = Join-Path $logsDir "web.err.log"

$buildProc = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c npm run build > `"$webOut`" 2> `"$webErr`"" `
  -WorkingDirectory $webDir `
  -WindowStyle Hidden `
  -PassThru

$buildProc.WaitForExit()

if ($buildProc.ExitCode -ne 0) {
  Write-Warning "[DMYC] Web build basarisiz! Loglara bakin: $webErr"
  exit 1
}

Write-Host "[DMYC] Build tamam, web sunucu baslatiliyor..."
Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c npm run start > `"$webOut`" 2> `"$webErr`"" `
  -WorkingDirectory $webDir `
  -WindowStyle Hidden

# ── 4. Saglik kontrolu ────────────────────────────────────────────────────
Write-Host "[DMYC] Servisler baslatiliyor, bekleniyor..."
$apiOk = $false
$webOk = $false
for ($i = 0; $i -lt 30; $i++) {
  if (-not $apiOk) { $apiOk = Test-TcpPortOpen -Port 4311 }
  if (-not $webOk) { $webOk = Test-TcpPortOpen -Port 4310 }
  if ($apiOk -and $webOk) { break }
  Start-Sleep -Seconds 2
}

$apiStatus = if ($apiOk) { "OK" } else { "ZAMAN ASIMI" }
$webStatus = if ($webOk) { "OK" } else { "ZAMAN ASIMI" }
Write-Host "[DMYC] API  (4311): $apiStatus"
Write-Host "[DMYC] Web  (4310): $webStatus"

if (-not $apiOk -or -not $webOk) {
  Write-Warning "[DMYC] Bir veya daha fazla servis baslamadi. Loglar: $logsDir"
  exit 1
}

Write-Host "[DMYC] Stack hazir."
