# Little Pixel Firefox add-on packager (Windows PowerShell 5.1 or PowerShell 7+).
# Put beside manifest.json and run:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-firefox.ps1
# You may also pass -SourceDir 'C:\dev\pixel-clock'.
[CmdletBinding()]
param(
    [string]$SourceDir = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Prefer explicit path; otherwise use this script's directory; finally current directory.
if ([string]::IsNullOrWhiteSpace($SourceDir)) {
    if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) {
        $SourceDir = $PSScriptRoot
    } else {
        $SourceDir = (Get-Location).Path
    }
}
$SourceDir = [System.IO.Path]::GetFullPath($SourceDir)
$manifestPath = Join-Path $SourceDir 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "manifest.json not found in '$SourceDir'. Put this script beside manifest.json, or supply -SourceDir."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.manifest_version -ne 3) { throw 'Expected a Manifest V3 extension.' }
if (-not $manifest.version -or $manifest.version -notmatch '^\d+\.\d+(?:\.\d+){0,2}$') {
    throw 'manifest.json is missing a valid version.'
}
$files = @(
    'manifest.json', 'index.html', 'app.js', 'background.js',
    'boot.js', 'bridge-client.js', 'display-init.js', 'floating.js', 'ui-dialog.js',
    'icon-192.png', 'icon-512.png'
)
$paths = @()
foreach ($name in $files) {
    $path = Join-Path $SourceDir $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing extension file: $name" }
    $paths += $path
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -ne $node) {
    foreach ($name in ($files | Where-Object { $_ -like '*.js' })) {
        & $node.Source --check (Join-Path $SourceDir $name)
        if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax check failed: $name" }
    }
    Write-Host 'JavaScript syntax checks: passed.' -ForegroundColor Green
} else {
    Write-Host 'Node.js not installed: skipped optional syntax check.' -ForegroundColor Yellow
}

$dist = Join-Path $SourceDir 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$output = Join-Path $dist ("Little-Pixel-Firefox-v{0}-AMO-UNSIGNED.zip" -f $manifest.version)
if (Test-Path -LiteralPath $output) { Remove-Item -LiteralPath $output -Force }

# Input paths are individual files so manifest.json is at ZIP root.
Compress-Archive -LiteralPath $paths -DestinationPath $output -CompressionLevel Optimal -ErrorAction Stop

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($output)
try {
    $actual = @($archive.Entries | ForEach-Object { $_.FullName })
    $missing = @($files | Where-Object { $_ -notin $actual })
    $extra = @($actual | Where-Object { $_ -notin $files })
    if ($missing.Count -gt 0 -or $extra.Count -gt 0 -or $actual.Count -ne $files.Count) {
        throw "Unexpected ZIP contents. Missing: $($missing -join ', '); extra: $($extra -join ', ')"
    }
} finally { $archive.Dispose() }

$zip = Get-Item -LiteralPath $output
$hash = Get-FileHash -LiteralPath $output -Algorithm SHA256
Write-Host ''
Write-Host 'Firefox add-on package created successfully.' -ForegroundColor Green
Write-Host "Version: $($manifest.version)"
Write-Host "Files: $($files.Count)"
Write-Host "Size: $([math]::Round($zip.Length / 1KB, 1)) KB"
Write-Host "Path: $output"
Write-Host "SHA256: $($hash.Hash)"
Write-Host 'Unsigned: submit ZIP to Mozilla for signing.' -ForegroundColor Yellow
