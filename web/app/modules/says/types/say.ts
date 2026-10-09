import type { Paginated } from "../../../shared/types/api";
export type Say = {
  id: number;
  text: string;
  source: string;
  author: string;
  createdAt: string;
};

export type SayList = Paginated<Say>;
