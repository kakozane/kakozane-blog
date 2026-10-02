type ShortcutEvent = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey" | "isComposing" | "repeat" | "defaultPrevented">;

export function isSearchShortcut(event: ShortcutEvent): boolean {
  return !event.defaultPrevented && !event.isComposing && !event.repeat && !event.altKey && !event.shiftKey &&
    (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
}
