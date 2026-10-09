import type { PostList } from "../../articles/types/article";
import type { Page } from "../../pages/types/page";

export type SearchResult = { posts: PostList; pages: { items: Page[] } };
