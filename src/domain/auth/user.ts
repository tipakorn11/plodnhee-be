export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  createdAt: Date;
}
