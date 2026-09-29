export interface Person {
  id: string;
  ownerId: string;
  name: string;
  profileImageUrl?: string;
  createdAt: Date;
  personalTotalOwed?: number;
  personalBillCount?: number;
  personalBills?: Bill[];
}

export interface Group {
  id: string;
  ownerId: string;
  name: string;
  totalOwed: number;
  createdAt: Date;
}

export interface GroupCharge {
  id: string;
  groupId: string;
  amountPerPerson: number;
  description?: string;
  createdBy?: string;
  createdAt: Date;
}

export interface MemberDiscount {
  id: string;
  groupId: string;
  personId: string;
  amount: number;
  description?: string;
  createdBy?: string;
  createdAt: Date;
}

export interface Bill {
  id: string;
  groupId?: string;
  personId: string;
  amount: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  paymentStatus: string;
  paidAt?: Date;
}
