export interface SSOCandidate {
  user: { id: number; username: string; displayName: string }
  canLogin: boolean
  sourceOrigin: string
}
