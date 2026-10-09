import { route } from "@react-router/dev/routes";

export const authRoutes = [
  route("login", "routes/auth/login.tsx"),
  route("register", "routes/auth/register.tsx"),
  route("account", "routes/auth/account.tsx"),
];
