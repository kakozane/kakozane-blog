import { route } from "@react-router/dev/routes";

export const pagesRoutes = [
  route("pages", "routes/pages/pages.tsx"),
  route("pages/:slug", "routes/pages/page.tsx"),
];
