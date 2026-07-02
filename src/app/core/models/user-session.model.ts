export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  token?: string;
  jwtToken?: string;
  access_token?: string;

  email?: string;
  fullName?: string;
  name?: string;
  role?: string;
  roles?: string[];

  expiresAtUtc?: string;
  expiresAt?: string;

  user?: {
    id?: string;
    email?: string;
    fullName?: string;
    name?: string;
    role?: string;
    roles?: string[];
  };
}

export interface UserSession {
  accessToken: string;
  email: string;
  fullName: string;
  roles: string[];
  expiresAtUtc?: string;
}

export interface CurrentUserResponse {
  id?: string;
  email?: string;
  fullName?: string;
  name?: string;
  role?: string;
  roles?: string[];
}
