import { parseYaml, stringifyYaml } from "./yaml.js";

export function splitFrontmatter(source) {
  if (!source.startsWith("---\n")) {
    throw new Error("Missing YAML frontmatter");
  }
  const end = source.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error("Unclosed YAML frontmatter");
  }
  const yaml = source.slice(4, end);
  const body = source.slice(end + 5).replace(/^\r?\n/, "");
  return { data: parseYaml(yaml), body };
}

export function stringifyFrontmatter(data, body) {
  return `---\n${stringifyYaml(data)}\n---\n\n${body.trimEnd()}\n`;
}
