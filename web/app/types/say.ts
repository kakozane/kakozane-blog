export type Say = {
  id: number;
  text: string;
  source: string;
  author: string;
  createdAt: string;
};

export type SayList = { items: Say[]; total: number; page: number; pageSize: number };
