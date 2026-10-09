import type { Paginated } from "../../../shared/types/api";
import type { Post } from "../../articles/types/article";

export type LikeState = { count: number; liked: boolean };
export type RecentLike = {
  kind: Post["kind"];
  slug: string;
  title: string;
  createdAt: string;
};
export type LikedPost = {
  kind: Post["kind"];
  slug: string;
  title: string;
  likedAt: string;
};
export type LikedPostList = Paginated<LikedPost>;
