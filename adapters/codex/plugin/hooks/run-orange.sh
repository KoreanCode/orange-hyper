#!/usr/bin/env sh

event="${1:-}"

hook_event_name() {
  case "$1" in
    session-start) printf '%s\n' "SessionStart" ;;
    user-prompt-submit) printf '%s\n' "UserPromptSubmit" ;;
    post-tool-use) printf '%s\n' "PostToolUse" ;;
    stop) printf '%s\n' "Stop" ;;
    *) printf '%s\n' "Stop" ;;
  esac
}

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
  message="$2"
  if [ "$hook_event" = "Stop" ]; then
    printf '{}\n'
    return 0
  fi
  printf '{"continue":true,"systemMessage":"Orange Hyper binding degraded: %s","hookSpecificOutput":{"hookEventName":"%s","additionalContext":""}}\n' "$message" "$hook_event"
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
  \{*\}) printf '%s\n' "$output" ;;
  *) degraded "$hook_event" "orange host bridge returned invalid JSON." ;;
esac
exit 0
