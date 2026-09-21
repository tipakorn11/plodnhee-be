export interface CreatePersonDto {
  name: string;
  profileImageUrl?: string;
}

export interface CreateGroupDto {
  name: string;
}

export interface CreateBillDto {
  personId: string;
  amount: number;
  description?: string;
}

export interface UpdateBillDto {
  amount?: number;
  description?: string;
}
