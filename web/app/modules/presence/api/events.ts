export function connectPresence(visitor: string): EventSource {
  return new EventSource(`/api/v1/events?visitor=${encodeURIComponent(visitor)}`);
}
