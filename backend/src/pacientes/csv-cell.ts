/** Serializes one spreadsheet-facing CSV field without allowing formula execution. */
export function csvCell(value: string): string {
  // Spreadsheet applications may ignore leading whitespace/control characters
  // before formula markers. A leading apostrophe keeps the exported cell text-only.
  const safe = /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
