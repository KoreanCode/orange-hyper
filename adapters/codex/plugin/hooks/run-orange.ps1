param(
  [string]$Event = ""
)

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
  $local = Join-Path $env:LOCALAPPDATA "OrangeHyper\bin\orange.exe"
  if (Test-Path -LiteralPath $local) {
    return $local
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

$hookEvent = Hook-Event-Name $Event
$orange = Find-Orange
if (-not $orange) {
  $payload = @{
    continue = $true
    systemMessage = "Orange Hyper binding degraded: orange executable not found."
    hookSpecificOutput = @{
      hookEventName = $hookEvent
      additionalContext = ""
    }
  }
  $payload | ConvertTo-Json -Depth 8 -Compress
  exit 0
}

& $orange host codex hook $Event
exit $LASTEXITCODE
