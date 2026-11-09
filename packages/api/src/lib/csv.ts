/**
 * One CSV cell. A cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return is a formula
 * to Excel and Sheets, so it gets a leading apostrophe and reads as text.
 */
export function escapeCSV(value: string) {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`;
  return guarded;
}
