import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("posts/:slug", "routes/post.tsx"),
  route("archive", "routes/archive.tsx"),
  route("about", "routes/about.tsx"),
  route("account", "routes/account.tsx"),
] satisfies RouteConfig;
