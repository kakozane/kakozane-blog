import { route } from "@react-router/dev/routes";

export const articlesRoutes = [
  route("preview", "routes/articles/preview.tsx"),
  route("posts", "routes/articles/posts.tsx"),
  route("posts/:slug", "routes/articles/post.tsx"),
  route("archive", "routes/articles/archive.tsx"),
  route("topics", "routes/articles/topics.tsx"),
  route("categories/:slug", "routes/articles/category.tsx"),
  route("tags/:slug", "routes/articles/tag.tsx"),
];
