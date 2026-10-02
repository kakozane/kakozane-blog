export function addSelectionQuote(draft: string, selection: string): string | null {
  const text = selection.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const characters = Array.from(text);
  const quote = `> ${characters.slice(0, 240).join("")}${characters.length > 240 ? "…" : ""}`;
  const result = `${draft.trimEnd()}${draft.trim() ? "\n\n" : ""}${quote}\n\n`;
  return result.length <= 2000 ? result : null;
}
