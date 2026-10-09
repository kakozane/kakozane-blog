import { route } from "@react-router/dev/routes";

export const siteRoutes = [
  route("subscribe", "routes/site/subscribe.tsx"),
  route("about", "routes/site/about.tsx"),
  route("*", "routes/site/not-found.tsx"),
];
