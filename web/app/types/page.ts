export type Page = {
  id: number;
  title: string;
  slug: string;
  description: string;
  contentMd?: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
