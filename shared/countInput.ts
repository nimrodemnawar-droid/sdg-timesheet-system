export function parseOptionalNonNegativeInteger(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  if (normalized === "") return undefined;
  if (!/^(0|[1-9]\d*)$/.test(normalized)) return undefined;
  return Number(normalized);
}
