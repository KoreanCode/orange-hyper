#!/usr/bin/env node
import { main } from "../src/cli/index.js";

main(process.argv.slice(2)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`orange: ${message}`);
  process.exitCode = 1;
});
