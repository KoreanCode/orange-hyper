#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const README_FILES = [
  "README.md",
  "README.en.md",
  "README.zh-CN.md",
  "README.ja.md"
];

const root = process.cwd();
const versions = README_FILES.map((file) => {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const match = source.match(/README version:\s*`([^`]+)`/);
  if (!match) {
    throw new Error(`${file} is missing README version metadata.`);
  }
  return { file, version: match[1] };
});

const expected = versions[0].version;
const mismatches = versions.filter((item) => item.version !== expected);

if (mismatches.length) {
  console.error("README version metadata is out of sync.");
  for (const item of versions) {
    console.error(`- ${item.file}: ${item.version}`);
  }
  process.exitCode = 1;
} else {
  console.log(`README version sync OK: ${expected}`);
}
