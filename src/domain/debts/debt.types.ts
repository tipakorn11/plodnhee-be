export interface Person {
  id: string;
  ownerId: string;
  name: string;
  profileImageUrl?: string;
  createdAt: Date;
}

export interface Group {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Date;
}

export interface Bill {
  id: string;
  groupId: string;
  personId: string;
  amount: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
