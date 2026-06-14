$ErrorActionPreference = "Stop"

# TinyToken Windows PowerShell launcher.
# Usage:
#   irm https://tinyapi.org/install.ps1 | iex
#
# Local test:
#   $env:TINYTOKEN_INSTALLER_URL="http://127.0.0.1:3001/tinytoken-setup.mjs"
#   irm http://127.0.0.1:3001/install.ps1 | iex

function Assert-Node {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    throw "Node.js 20+ is required. Install it from https://nodejs.org/ first."
  }

  $major = & node -p "process.versions.node.split('.')[0]"
  if ([int]$major -lt 20) {
    $version = & node -v
    throw "Node.js >= 20 required. Current: $version"
  }
}

Assert-Node

$installerUrl = $env:TINYTOKEN_INSTALLER_URL
if (-not $installerUrl) {
  $installerUrl = "https://tinyapi.org/tinytoken-setup.mjs"
}

$tmp = Join-Path $env:TEMP ("tinytoken-setup-" + [Guid]::NewGuid().ToString("N") + ".mjs")
try {
  Invoke-WebRequest -Uri $installerUrl -UseBasicParsing -OutFile $tmp
  & node $tmp @args
}
finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
}
