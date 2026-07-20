$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$portable = Join-Path $root 'release\Agent-Nudge-Portable-0.1.0-x64.exe'
$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$launcher = $null
$listenerProcessId = $null

if (-not (Test-Path -LiteralPath $portable -PathType Leaf)) {
  throw "Portable release is missing: $portable"
}

if (Get-NetTCPConnection -LocalPort 47831 -State Listen -ErrorAction SilentlyContinue) {
  throw 'Port 47831 already has a listener; refusing an ambiguous smoke test.'
}

try {
  $launcher = Start-Process -FilePath $portable -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 5

  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:47831/health' -TimeoutSec 5
  $listener = Get-NetTCPConnection -LocalPort 47831 -State Listen -ErrorAction Stop
  $listenerProcessId = $listener.OwningProcess
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$listenerProcessId"
  $executablePath = [System.IO.Path]::GetFullPath($process.ExecutablePath)

  if ($listener.LocalAddress -ne '127.0.0.1') {
    throw "Expected a loopback-only listener, received $($listener.LocalAddress)."
  }

  if (-not $executablePath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
      [System.IO.Path]::GetFileName($executablePath) -ne 'Agent Nudge.exe') {
    throw "Unexpected listener executable: $executablePath"
  }

  [pscustomobject]@{
    HealthOk = $health.ok
    Service = $health.service
    Version = $health.version
    LocalOnly = $health.localOnly
    LocalAddress = $listener.LocalAddress
    ListenerProcessId = $listenerProcessId
    ExecutablePath = $executablePath
  } | Format-List
}
finally {
  if ($listenerProcessId) {
    Stop-Process -Id $listenerProcessId -Force -ErrorAction SilentlyContinue
  }
  if ($launcher -and -not $launcher.HasExited) {
    Stop-Process -Id $launcher.Id -Force -ErrorAction SilentlyContinue
  }
}

Start-Sleep -Milliseconds 500
if (Get-NetTCPConnection -LocalPort 47831 -State Listen -ErrorAction SilentlyContinue) {
  throw 'The release smoke-test listener did not stop.'
}

Write-Host 'Release smoke test passed.'
