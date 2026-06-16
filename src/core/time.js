export function nowIso(clock = new Date()) {
  return clock.toISOString();
}

export function timestampForId(clock = new Date()) {
  return clock
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
    .replace("T", "_");
}
