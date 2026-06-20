#!/usr/bin/env node

export function resolveReleaseMetadata(releaseTag) {
  if (typeof releaseTag !== "string" || !releaseTag.startsWith("v")) {
    throw new Error(`Release tag must start with v: ${releaseTag || ""}`);
  }

  const version = releaseTag.slice(1);
  const prereleaseMatch = version.match(/^\d+\.\d+\.\d+-(alpha|beta|rc)\.\d+(?:\+[A-Za-z0-9.-]+)?$/);
  const npmTag = prereleaseMatch ? prereleaseMatch[1] : "latest";

  return {
    release_tag: releaseTag,
    version,
    npm_tag: npmTag,
    is_prerelease: Boolean(prereleaseMatch)
  };
}

export function formatGithubOutput(metadata) {
  return [
    `release_tag=${metadata.release_tag}`,
    `version=${metadata.version}`,
    `npm_tag=${metadata.npm_tag}`,
    `is_prerelease=${metadata.is_prerelease ? "true" : "false"}`
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const releaseTag = process.argv[2];
    const metadata = resolveReleaseMetadata(releaseTag);
    process.stdout.write(`${formatGithubOutput(metadata)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
