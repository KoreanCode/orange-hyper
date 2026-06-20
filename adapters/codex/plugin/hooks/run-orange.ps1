param(
  [string]$Event = ""
)

$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$ProgressPreference = "SilentlyContinue"

function Find-Orange {
  if ($env:ORANGE_HYPER_BIN -and (Test-Path -LiteralPath $env:ORANGE_HYPER_BIN)) {
    return $env:ORANGE_HYPER_BIN
  }
  $cmd = Get-Command orange -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }
  $cmdExe = Get-Command orange.exe -ErrorAction SilentlyContinue
  if ($cmdExe) {
    return $cmdExe.Source
  }
  if ($env:LOCALAPPDATA) {
    $local = Join-Path $env:LOCALAPPDATA "OrangeHyper\bin\orange.exe"
    if (Test-Path -LiteralPath $local) {
      return $local
    }
  }
  return $null
}

function Hook-Event-Name([string]$Name) {
  switch ($Name) {
    "session-start" { "SessionStart" }
    "user-prompt-submit" { "UserPromptSubmit" }
    "post-tool-use" { "PostToolUse" }
    "stop" { "Stop" }
    default { "Stop" }
  }
}

function Write-Degraded([string]$HookEvent, [string]$Message) {
  if ($HookEvent -eq "Stop") {
    [Console]::Out.WriteLine("{}")
    return
  }
  $payload = @{
    continue = $true
    systemMessage = "Orange Hyper binding degraded: $Message"
    hookSpecificOutput = @{
      hookEventName = $HookEvent
      additionalContext = ""
    }
  }
  [Console]::Out.WriteLine(($payload | ConvertTo-Json -Depth 8 -Compress))
}

$hookEvent = Hook-Event-Name $Event
if ([string]::IsNullOrWhiteSpace($Event)) {
  Write-Degraded $hookEvent "hook event was not provided."
  exit 0
}

$orange = Find-Orange
if (-not $orange) {
  Write-Degraded $hookEvent "orange executable not found."
  exit 0
}

try {
  $output = & $orange host codex hook $Event 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Degraded $hookEvent "orange host bridge failed."
    exit 0
  }
  $text = ($output -join [Environment]::NewLine).Trim()
  if ($text.StartsWith("{") -and $text.EndsWith("}")) {
    [Console]::Out.WriteLine($text)
  } else {
    Write-Degraded $hookEvent "orange host bridge returned invalid JSON."
  }
} catch {
  Write-Degraded $hookEvent "orange host bridge failed."
}
exit 0
