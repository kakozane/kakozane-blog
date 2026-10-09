import { useEffect, useState, type FormEvent } from "react";
import { myComments as getMyComments, saveComment } from "../api/comments";
import type { Comment } from "../types/comment";
import type { Post } from "../../articles/types/article";
import type { PublicUser } from "../../auth/types/auth";

export function useArticleComments(post: Post, user: PublicUser | null) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<{ postID: number; id: number; authorName: string } | null>(null);
  const activeReply = replyTo?.postID === post.id ? replyTo : null;
  const [commentMessage, setCommentMessage] = useState("");
  const [commentPreview, setCommentPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myComments, setMyComments] = useState<{ postID: number; items: Comment[]; total: number } | null>(null);
  const [myCommentsError, setMyCommentsError] = useState("");
  const [editingComment, setEditingComment] = useState<{ postID: number; id: number } | null>(null);
  const activeEdit = editingComment?.postID === post.id ? editingComment : null;
  const ownComments = myComments?.postID === post.id ? myComments.items : [];
  const ownTotal = myComments?.postID === post.id ? myComments.total : 0;
  useEffect(() => {
    if (!user) return;
    let active = true;
    setMyCommentsError("");
    getMyComments(post.kind, post.slug)
      .then((list) => { if (active) setMyComments({ postID: post.id, items: list.items, total: list.total }); })
      .catch((cause) => { if (active) setMyCommentsError(cause instanceof Error ? cause.message : "暂时无法读取你的待审核评论"); });
    return () => { active = false; };
  }, [post.id, post.kind, post.slug, user?.id]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setCommentMessage("");
    try {
      const saved = await saveComment(post.kind, post.slug, activeEdit ? { body } : { body, parentId: activeReply?.id ?? null }, activeEdit?.id);
      setMyComments((current) => {
        const previous = current?.postID === post.id ? current : { postID: post.id, items: [], total: 0 };
        return activeEdit
          ? { ...previous, items: previous.items.map((item) => item.id === saved.id ? saved : item) }
          : { ...previous, items: [saved, ...previous.items].slice(0, 50), total: previous.total + 1 };
      });
      setBody("");
      setCommentPreview(false);
      setReplyTo(null);
      setEditingComment(null);
      setMyCommentsError("");
      setCommentMessage(activeEdit ? "修改已保存，重新等待审核。" : "评论已提交，审核通过后会显示。");
    } catch (cause) {
      setCommentMessage(cause instanceof Error ? cause.message : "提交失败");
    } finally { setSubmitting(false); }
  }
  return { body, setBody, activeReply, setReplyTo, commentMessage, setCommentMessage, commentPreview, setCommentPreview, submitting, myCommentsError, activeEdit, setEditingComment, ownComments, ownTotal, submitComment };
}
