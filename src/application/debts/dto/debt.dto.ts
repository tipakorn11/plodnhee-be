export interface CreatePersonDto {
  name: string;
  profileImageUrl?: string;
}

export interface CreateGroupDto {
  name: string;
  memberIds?: string[];
}

export interface AddGroupMemberDto { personId: string; }

export interface CreateGroupChargeDto {
  /** The full shared expense; the service splits it equally between members. */
  totalAmount: number;
  description?: string;
  createdBy?: string;
}

export interface CreateMemberDiscountDto {
  amount: number;
  description?: string;
  createdBy?: string;
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

export interface PayBillsDto {
  /** `one` requires billId; `all` clears every currently unpaid bill. */
  scope: 'one' | 'all';
  billId?: string;
  /** A partial payment can only be made against one bill. */
  amount?: number;
}
