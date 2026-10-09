import { getCategories, getTags } from "../api/posts.server";

export async function loadTopics() {
  const [categories, tags] = await Promise.all([getCategories(), getTags()]);
  return { categories, tags };
}
