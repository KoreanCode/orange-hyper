#!/usr/bin/env sh
set -eu

event="${1:-}"

find_orange() {
  if [ "${ORANGE_HYPER_BIN:-}" ] && [ -x "${ORANGE_HYPER_BIN}" ]; then
    printf '%s\n' "${ORANGE_HYPER_BIN}"
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
  if [ "${HOME:-}" ] && [ -x "${HOME}/.local/bin/orange" ]; then
    printf '%s\n' "${HOME}/.local/bin/orange"
    return 0
  fi
  if [ "${HOME:-}" ] && [ -x "${HOME}/.orange-hyper/bin/orange" ]; then
    printf '%s\n' "${HOME}/.orange-hyper/bin/orange"
    return 0
  fi
  return 1
}

degraded() {
  hook_event="$1"
  printf '{"continue":true,"systemMessage":"Orange Hyper binding degraded: orange executable not found.","hookSpecificOutput":{"hookEventName":"%s","additionalContext":""}}\n' "$hook_event"
}

case "$event" in
  session-start) hook_event="SessionStart" ;;
  user-prompt-submit) hook_event="UserPromptSubmit" ;;
  post-tool-use) hook_event="PostToolUse" ;;
  stop) hook_event="Stop" ;;
  *) hook_event="Stop" ;;
esac

if [ -z "$event" ]; then
  degraded "$hook_event"
  exit 0
fi

if ! orange_bin="$(find_orange)"; then
  degraded "$hook_event"
  exit 0
fi

exec "$orange_bin" host codex hook "$event"
