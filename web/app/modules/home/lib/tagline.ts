export function taglinePhrases(value: string): string[] {
  return value.split(/(?<=[，,。.!?！？；;])/u).filter(Boolean);
}
