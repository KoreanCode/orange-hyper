import { runLifecycleEvent } from "../../core/lifecycle.js";

export function runCodexHook(cwd = process.cwd(), event, input = {}, options = {}) {
  const result = runLifecycleEvent(cwd, event, input, options);
  return codexNativeOutput(event, result);
}

export function codexNativeOutput(event, result) {
  const hookEventName = codexHookEventName(event);
  if (result?.blocked) {
    return {
      decision: "block",
      reason: result.block_reason || "Orange Hyper requires confirmation before continuing."
    };
  }
  if (result?.continuation_required) {
    return {
      decision: "block",
      reason: result.continuation_reason
    };
  }
  const output = {
    continue: true
  };
  if (result?.system_message) {
    output.systemMessage = result.system_message;
  }
  if (result?.degraded && result?.reason) {
    output.systemMessage = `Orange Hyper binding degraded: ${result.reason}`;
  }
  const additionalContext = result?.additional_context || "";
  if (additionalContext || event === "session-start" || event === "user-prompt-submit" || event === "post-tool-use") {
    output.hookSpecificOutput = {
      hookEventName,
      additionalContext
    };
  }
  return output;
}

export function safeCodexHookFailure(event, error) {
  return {
    continue: true,
    systemMessage: `Orange Hyper binding degraded: ${error instanceof Error ? error.message : String(error)}`,
    hookSpecificOutput: {
      hookEventName: codexHookEventName(event),
      additionalContext: ""
    }
  };
}

export function codexHookEventName(event) {
  const map = {
    "session-start": "SessionStart",
    "user-prompt-submit": "UserPromptSubmit",
    "post-tool-use": "PostToolUse",
    stop: "Stop"
  };
  return map[event] || "Stop";
}
