export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  displayName: string;
}

export interface PublicUser {
  id: number;
  username: string;
  displayName: string;
}

export interface AuthResponse {
  user: PublicUser;
  error?: string;
}
