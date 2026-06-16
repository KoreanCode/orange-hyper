function quoteString(value) {
  const text = String(value);
  if (text === "") {
    return '""';
  }
  if (/^[A-Za-z0-9_.:/@-]+$/.test(text)) {
    return text;
  }
  return JSON.stringify(text);
}

export function stringifyYaml(value, indent = 0) {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    return value
      .map((item) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return `${pad}-\n${stringifyYaml(item, indent + 2)}`;
        }
        return `${pad}- ${quoteString(item)}`;
      })
      .join("\n");
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        if (Array.isArray(item)) {
          if (item.length === 0) {
            return `${pad}${key}: []`;
          }
          return `${pad}${key}:\n${stringifyYaml(item, indent + 2)}`;
        }
        if (item && typeof item === "object") {
          return `${pad}${key}:\n${stringifyYaml(item, indent + 2)}`;
        }
        if (item === null || item === undefined) {
          return `${pad}${key}:`;
        }
        return `${pad}${key}: ${quoteString(item)}`;
      })
      .join("\n");
  }
  return `${pad}${quoteString(value)}`;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === "" || value === "null") {
    return null;
  }
  if (value === "[]") {
    return [];
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

export function parseYaml(source) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) {
      continue;
    }

    const indent = rawLine.match(/^ */)[0].length;
    const line = rawLine.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;

    if (line.startsWith("- ")) {
      if (!Array.isArray(parent)) {
        throw new Error(`Invalid YAML list item at line ${index + 1}`);
      }
      parent.push(parseScalar(line.slice(2)));
      continue;
    }

    const match = line.match(/^([^:]+):(.*)$/);
    if (!match) {
      throw new Error(`Invalid YAML line ${index + 1}: ${line}`);
    }

    const key = match[1].trim();
    const rest = match[2].trim();
    if (rest) {
      parent[key] = parseScalar(rest);
      continue;
    }

    let next = {};
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextRaw = lines[nextIndex];
      if (!nextRaw.trim() || nextRaw.trimStart().startsWith("#")) {
        continue;
      }
      const nextIndent = nextRaw.match(/^ */)[0].length;
      const nextLine = nextRaw.trim();
      if (nextIndent > indent && nextLine.startsWith("- ")) {
        next = [];
      }
      break;
    }
    parent[key] = next;
    stack.push({ indent, value: next });
  }

  return root;
}
