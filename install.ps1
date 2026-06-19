param(
  [string]$Version = $(if ($env:ORANGE_HYPER_VERSION) { $env:ORANGE_HYPER_VERSION } else { "1.1.0-alpha.8" }),
  [string]$Repo = $(if ($env:ORANGE_HYPER_REPO) { $env:ORANGE_HYPER_REPO } else { "KoreanCode/orange-hyper" }),
  [string]$InstallDir = $(if ($env:ORANGE_HYPER_INSTALL_DIR) { $env:ORANGE_HYPER_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "OrangeHyper\bin" }),
  [switch]$AddToPath
)

$ErrorActionPreference = "Stop"

$arch = switch ($env:PROCESSOR_ARCHITECTURE) {
  "AMD64" { "x64" }
  default { throw "Unsupported Windows architecture: $env:PROCESSOR_ARCHITECTURE" }
}

$filename = "orange-windows-$arch.exe"

if ($env:ORANGE_HYPER_BASE_URL) {
  $baseUrl = $env:ORANGE_HYPER_BASE_URL.TrimEnd("/")
} elseif ($Version -eq "latest") {
  $baseUrl = "https://github.com/$Repo/releases/latest/download"
} else {
  if ($Version.StartsWith("v")) {
    $tag = $Version
  } else {
    $tag = "v$Version"
  }
  $baseUrl = "https://github.com/$Repo/releases/download/$tag"
}

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("orange-hyper-install-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null

try {
  $binaryTmp = Join-Path $tmp $filename
  $checksumsTmp = Join-Path $tmp "checksums.txt"

  Invoke-WebRequest -Uri "$baseUrl/checksums.txt" -OutFile $checksumsTmp
  Invoke-WebRequest -Uri "$baseUrl/$filename" -OutFile $binaryTmp

  $line = Get-Content $checksumsTmp | Where-Object { $_ -match "\s+$([Regex]::Escape($filename))$" } | Select-Object -First 1
  if (-not $line) {
    throw "Checksum entry not found for $filename."
  }

  $expected = ($line -split "\s+")[0].ToLowerInvariant()
  $actual = (Get-FileHash -Algorithm SHA256 $binaryTmp).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    throw "Checksum mismatch for $filename. Expected $expected but got $actual."
  }

  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  $target = Join-Path $InstallDir "orange.exe"
  Copy-Item -Force $binaryTmp $target
  Unblock-File -Path $target -ErrorAction SilentlyContinue

  if ($AddToPath) {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $parts = @()
    if ($currentPath) {
      $parts = $currentPath -split ";"
    }
    if ($parts -notcontains $InstallDir) {
      $nextPath = (@($currentPath, $InstallDir) | Where-Object { $_ }) -join ";"
      [Environment]::SetEnvironmentVariable("Path", $nextPath, "User")
      Write-Host "Added $InstallDir to the user PATH. Open a new terminal before running orange."
    }
  }

  Write-Host "Installed Orange Hyper to $target"
  if (-not $AddToPath) {
    Write-Host "To add it to the user PATH, rerun with -AddToPath or add this directory manually:"
    Write-Host "  $InstallDir"
  }
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
