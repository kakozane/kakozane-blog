export type FriendLink = {
  id: number;
  kind: "friend" | "collection";
  name: string;
  url: string;
  description: string;
  avatarUrl: string;
};
