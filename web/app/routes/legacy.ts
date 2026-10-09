import { route } from "@react-router/dev/routes";

export const legacyRoutes = [
  route("notes", "routes/legacy/notes.tsx"),
  route("notes/series", "routes/legacy/note-series.tsx"),
  route("notes/series/:slug", "routes/legacy/note-series-detail.tsx"),
  route("notes/:slug", "routes/legacy/note.tsx"),
  route("thinking", "routes/legacy/thinking.tsx"),
  route("thinking/:slug", "routes/legacy/thought.tsx"),
  route("timeline", "routes/legacy/timeline.tsx"),
];
