export const CODEX_PLUGIN_NAME = "orange-hyper-codex";
export const CODEX_PLUGIN_VERSION = "1.1.0-beta.2";
export const CODEX_HOST_BRIDGE_SCHEMA_VERSION = "codex-host-bridge-v1";
export const CODEX_PLUGIN_RELATIVE_ROOT = ".agents/plugins/orange-hyper-codex";
export const CODEX_MARKETPLACE_RELATIVE_PATH = ".agents/plugins/marketplace.json";

export const CODEX_PLUGIN_FILES = {
  ".codex-plugin/plugin.json": `${JSON.stringify({
    name: CODEX_PLUGIN_NAME,
    version: CODEX_PLUGIN_VERSION,
    description: "Orange Hyper lifecycle binding for Codex.",
    skills: "./skills/",
    hooks: "./hooks/hooks.json"
  }, null, 2)}\n`,
  "skills/orange-hyper/SKILL.md": `---
name: orange-hyper
description: Use Orange Hyper lifecycle context and kernel commands for activated projects.
---

Orange Hyper is a local lifecycle harness for activated projects.

- Treat Orange hook context as route, memory, evidence, and verification guidance, not as an autonomous planner.
- Use Orange Kernel JSON commands when project state must change. Do not edit \`.orange-hyper\` files directly.
- Keep L0/L1 tasks light. Do not create Quest ceremony unless the route or user asks for it.
- For L2 and above, honor the supplied Route level, Context Capsule, and verification expectation.
- Pending Memory Proposals are review candidates only. Never accept, reject, or turn them into durable graph memory without explicit user approval.
- Accepted Memory Graph state is durable project truth. Working memory, episodes, runtime state, and pending proposals are not automatically accepted memory.
- Do not install MCP servers, materialize project-specific skills or agents, spawn subagents, or start autonomous loops unless the user explicitly approves that separate action.
`,
  "hooks/hooks.json": `${JSON.stringify({
    hooks: {
      SessionStart: [
        {
          matcher: "startup|resume|clear|compact",
          hooks: [
            {
              type: "command",
              command: "\"$PLUGIN_ROOT/hooks/run-orange.sh\" session-start",
              commandWindows: "powershell -NoProfile -ExecutionPolicy Bypass -File \"$env:PLUGIN_ROOT\\hooks\\run-orange.ps1\" session-start",
              timeout: 30,
              statusMessage: "Loading Orange context"
            }
          ]
        }
      ],
      UserPromptSubmit: [
        {
          hooks: [
            {
              type: "command",
              command: "\"$PLUGIN_ROOT/hooks/run-orange.sh\" user-prompt-submit",
              commandWindows: "powershell -NoProfile -ExecutionPolicy Bypass -File \"$env:PLUGIN_ROOT\\hooks\\run-orange.ps1\" user-prompt-submit",
              timeout: 30,
              statusMessage: "Routing with Orange"
            }
          ]
        }
      ],
      PostToolUse: [
        {
          matcher: "Bash|apply_patch|Edit|Write|mcp__.*",
          hooks: [
            {
              type: "command",
              command: "\"$PLUGIN_ROOT/hooks/run-orange.sh\" post-tool-use",
              commandWindows: "powershell -NoProfile -ExecutionPolicy Bypass -File \"$env:PLUGIN_ROOT\\hooks\\run-orange.ps1\" post-tool-use",
              timeout: 30,
              statusMessage: "Recording Orange evidence"
            }
          ]
        }
      ],
      Stop: [
        {
          hooks: [
            {
              type: "command",
              command: "\"$PLUGIN_ROOT/hooks/run-orange.sh\" stop",
              commandWindows: "powershell -NoProfile -ExecutionPolicy Bypass -File \"$env:PLUGIN_ROOT\\hooks\\run-orange.ps1\" stop",
              timeout: 30,
              statusMessage: "Checking Orange verification"
            }
          ]
        }
      ]
    }
  }, null, 2)}\n`,
  "hooks/run-orange.sh": `#!/usr/bin/env sh

event="\${1:-}"

hook_event_name() {
  case "$1" in
    session-start) printf '%s\\n' "SessionStart" ;;
    user-prompt-submit) printf '%s\\n' "UserPromptSubmit" ;;
    post-tool-use) printf '%s\\n' "PostToolUse" ;;
    stop) printf '%s\\n' "Stop" ;;
    *) printf '%s\\n' "Stop" ;;
  esac
}

find_orange() {
  if [ "\${ORANGE_HYPER_BIN:-}" ] && [ -x "\${ORANGE_HYPER_BIN}" ]; then
    printf '%s\\n' "\${ORANGE_HYPER_BIN}"
    return 0
  fi
  if command -v orange >/dev/null 2>&1; then
    command -v orange
    return 0
  fi
  if command -v orange.exe >/dev/null 2>&1; then
    command -v orange.exe
    return 0
  fi
  if [ "\${HOME:-}" ] && [ -x "\${HOME}/.local/bin/orange" ]; then
    printf '%s\\n' "\${HOME}/.local/bin/orange"
    return 0
  fi
  if [ "\${HOME:-}" ] && [ -x "\${HOME}/.orange-hyper/bin/orange" ]; then
    printf '%s\\n' "\${HOME}/.orange-hyper/bin/orange"
    return 0
  fi
  return 1
}

degraded() {
  hook_event="$1"
  message="$2"
  if [ "$hook_event" = "Stop" ]; then
    printf '{}\\n'
    return 0
  fi
  printf '{"continue":true,"systemMessage":"Orange Hyper binding degraded: %s","hookSpecificOutput":{"hookEventName":"%s","additionalContext":""}}\\n' "$message" "$hook_event"
}

hook_event="$(hook_event_name "$event")"

if [ -z "$event" ]; then
  degraded "$hook_event" "hook event was not provided."
  exit 0
fi

if ! orange_bin="$(find_orange)"; then
  degraded "$hook_event" "orange executable not found."
  exit 0
fi

if ! output="$("$orange_bin" host codex hook "$event" 2>/dev/null)"; then
  degraded "$hook_event" "orange host bridge failed."
  exit 0
fi

case "$output" in
  \{*\}) printf '%s\\n' "$output" ;;
  *) degraded "$hook_event" "orange host bridge returned invalid JSON." ;;
esac
exit 0
`,
  "hooks/run-orange.ps1": `param(
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
    $local = Join-Path $env:LOCALAPPDATA "OrangeHyper\\bin\\orange.exe"
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
fi

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
`
};
