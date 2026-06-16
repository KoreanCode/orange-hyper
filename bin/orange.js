#!/usr/bin/env node
import { exitCodeForError, isJsonMode, jsonErrorFor, main } from "../src/cli/index.js";

main(process.argv.slice(2)).catch((error) => {
  const argv = process.argv.slice(2);
  const message = error instanceof Error ? error.message : String(error);
  if (isJsonMode(argv)) {
    console.log(JSON.stringify(jsonErrorFor(error, argv), null, 2));
  } else {
    console.error(`orange: ${message}`);
  }
  process.exitCode = exitCodeForError(error);
});
