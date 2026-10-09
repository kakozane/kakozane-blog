import { useEffect, useState } from "react";
import { currentLikes, setLiked } from "../api/likes";
import type { LikeState } from "../types/like";
import type { Post } from "../../articles/types/article";
import type { PublicUser } from "../../auth/types/auth";

export function useArticleLikes(post: Post, likes: LikeState, user: PublicUser | null) {
  const [likeOverride, setLikeOverride] = useState<{ postID: number; state: LikeState } | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likeMessage, setLikeMessage] = useState("");
  const likeState = likeOverride?.postID === post.id ? likeOverride.state : likes;
  useEffect(() => {
    if (!user) return;
    let active = true;
    currentLikes(post.kind, post.slug)
      .then((state) => { if (active && state) setLikeOverride({ postID: post.id, state }); })
      .catch(() => { if (active) setLikeMessage("暂时无法读取点赞"); });
    return () => { active = false; };
  }, [post.kind, post.slug, post.id, user]);

  async function toggleLike() {
    setLikeBusy(true);
    setLikeMessage("");
    try {
      setLikeOverride({ postID: post.id, state: await setLiked(post.kind, post.slug, !likeState.liked) });
    } catch (cause) {
      setLikeMessage(cause instanceof Error ? cause.message : "暂时无法更新点赞");
    } finally { setLikeBusy(false); }
  }

  return { likeState, likeBusy, likeMessage, setLikeMessage, toggleLike };
}
