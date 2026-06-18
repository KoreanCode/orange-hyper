import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { isInitialized } from "./config.js";
import { ORANGE_HYPER_VERSION } from "./origin.js";

const require = createRequire(typeof __filename === "string" ? __filename : import.meta.url);
const DISTRIBUTIONS = new Set(["standalone", "npm", "source"]);

export function buildEnvironmentInfo(cwd = process.cwd(), options = {}) {
  const nodeRuntimeEmbedded = detectEmbeddedNodeRuntime();
  const distribution = detectDistribution({
    nodeRuntimeEmbedded,
    executable: options.executable,
    argv: options.argv || process.argv,
    env: options.env || process.env
  });
  const executable = executablePath({
    nodeRuntimeEmbedded,
    argv: options.argv || process.argv
  });
  const projectInitialized = isInitialized(cwd);

  return {
    version: ORANGE_HYPER_VERSION,
    distribution,
    executable,
    platform: process.platform,
    arch: process.arch,
    node_runtime_embedded: nodeRuntimeEmbedded,
    project_initialized: projectInitialized,
    project_root: projectInitialized ? cwd : null
  };
}

export function detectEmbeddedNodeRuntime() {
  try {
    const sea = require("node:sea");
    return Boolean(sea?.isSea?.());
  } catch {
    return false;
  }
}

function detectDistribution(options = {}) {
  if (options.nodeRuntimeEmbedded) {
    return "standalone";
  }

  const envDistribution = options.env?.ORANGE_HYPER_DISTRIBUTION;
  if (DISTRIBUTIONS.has(envDistribution)) {
    return envDistribution;
  }

  const executable = executablePath({
    nodeRuntimeEmbedded: false,
    argv: options.argv || process.argv
  });
  const packageRoot = findPackageRoot(executable);
  if (packageRoot && fs.existsSync(path.join(packageRoot, ".git"))) {
    return "source";
  }
  return "npm";
}

function executablePath(options = {}) {
  if (options.nodeRuntimeEmbedded) {
    return process.execPath;
  }
  const argv = options.argv || process.argv;
  const script = argv[1];
  return script ? path.resolve(script) : process.execPath;
}

function findPackageRoot(startPath) {
  let current = fs.existsSync(startPath) && fs.statSync(startPath).isDirectory()
    ? startPath
    : path.dirname(startPath);
  while (current && current !== path.dirname(current)) {
    const packageJson = path.join(current, "package.json");
    if (fs.existsSync(packageJson)) {
      try {
        const packageData = JSON.parse(fs.readFileSync(packageJson, "utf8"));
        if (packageData.name === "orange-hyper") {
          return current;
        }
      } catch {
        return null;
      }
    }
    current = path.dirname(current);
  }
  return null;
}
