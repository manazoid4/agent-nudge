$ErrorActionPreference = 'Stop'

$repo = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$output = [System.IO.Path]::GetFullPath((Join-Path $repo 'release'))
$runtime = [System.IO.Path]::GetFullPath((Join-Path $repo 'node_modules\electron\dist'))
$unpacked = [System.IO.Path]::GetFullPath((Join-Path $output 'win-unpacked'))
$stage = [System.IO.Path]::GetFullPath((Join-Path $output 'staging-app'))
$version = (Get-Content -Raw -LiteralPath (Join-Path $repo 'package.json') | ConvertFrom-Json).version

foreach ($path in @($output, $runtime, $unpacked, $stage)) {
  if (-not $path.StartsWith($repo, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Packaging path escaped repository: $path"
  }
}

if (-not (Test-Path -LiteralPath $runtime)) {
  throw "Electron runtime missing: $runtime. Run npm install first."
}

if (Test-Path -LiteralPath $output) {
  Remove-Item -LiteralPath $output -Recurse -Force
}

New-Item -ItemType Directory -Path $output | Out-Null
New-Item -ItemType Directory -Path $stage | Out-Null
Copy-Item -LiteralPath $runtime -Destination $unpacked -Recurse
Copy-Item -LiteralPath (Join-Path $repo 'package.json') -Destination $stage
Copy-Item -LiteralPath (Join-Path $repo 'dist-node') -Destination $stage -Recurse
Copy-Item -LiteralPath (Join-Path $repo 'dist-web') -Destination $stage -Recurse

$defaultApp = Join-Path $unpacked 'resources\default_app.asar'
if (Test-Path -LiteralPath $defaultApp) {
  Remove-Item -LiteralPath $defaultApp
}

& npx asar pack $stage (Join-Path $unpacked 'resources\app.asar')
if ($LASTEXITCODE -ne 0) { throw 'Failed to create app.asar' }

Move-Item -LiteralPath (Join-Path $unpacked 'electron.exe') -Destination (Join-Path $unpacked 'Agent Nudge.exe')

& npx electron-builder --win nsis portable --x64 --prepackaged $unpacked --config.directories.output=$output
if ($LASTEXITCODE -ne 0) { throw 'Failed to create Windows distributables' }

Remove-Item -LiteralPath $stage -Recurse -Force

$installer = Join-Path $output "Agent-Nudge-Setup-$version-x64.exe"
$portable = Join-Path $output "Agent-Nudge-Portable-$version-x64.exe"
if (-not (Test-Path -LiteralPath $installer) -or -not (Test-Path -LiteralPath $portable)) {
  throw 'Expected Windows artifacts were not created.'
}

Write-Output "Installer: $installer"
Write-Output "Portable:  $portable"
