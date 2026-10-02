import type { PublicUser } from "./auth";

export interface SSOCandidate {
  user: PublicUser;
  canLogin: boolean;
  sourceOrigin: string;
}
