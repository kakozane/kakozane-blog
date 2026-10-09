export type Site = {
  title: string;
  tagline: string;
  description: string;
  aboutMd: string;
  siteUrl: string;
  githubUrl: string;
  navLinks: { label: string; href: string }[];
  avatarUrl: string;
  faviconUrl: string;
  statusEmoji: string;
  statusText: string;
  statusUntil: string | null;
};
