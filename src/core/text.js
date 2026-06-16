export function slugify(value, fallback = "quest") {
  const ascii = String(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (ascii || fallback).slice(0, 48);
}

export function makeTitle(rawRequest) {
  const oneLine = String(rawRequest).replace(/\s+/g, " ").trim();
  if (!oneLine) {
    return "Untitled quest";
  }
  return oneLine.length > 72 ? `${oneLine.slice(0, 69)}...` : oneLine;
}

export function asArray(value) {
  if (value === undefined || value === null || value === "") {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
