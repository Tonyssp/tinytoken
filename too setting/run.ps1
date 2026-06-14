$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js not found.'
  Write-Host 'Please install Node.js 20 or newer, then run this file again.'
  exit 1
}

& node (Join-Path $PSScriptRoot 'tinytoken-setup.mjs') @args
