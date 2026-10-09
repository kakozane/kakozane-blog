import type { RouteConfig } from "@react-router/dev/routes";
import { homeRoutes } from "./routes/home";
import { authRoutes } from "./routes/auth";
import { articlesRoutes } from "./routes/articles";
import { legacyRoutes } from "./routes/legacy";
import { saysRoutes } from "./routes/says";
import { searchRoutes } from "./routes/search";
import { siteRoutes } from "./routes/site";
import { friendsRoutes } from "./routes/friends";
import { projectsRoutes } from "./routes/projects";
import { pagesRoutes } from "./routes/pages";

export default [
  ...homeRoutes,
  ...authRoutes,
  ...articlesRoutes,
  ...legacyRoutes,
  ...saysRoutes,
  ...searchRoutes,
  ...siteRoutes,
  ...friendsRoutes,
  ...projectsRoutes,
  ...pagesRoutes,
] satisfies RouteConfig;
