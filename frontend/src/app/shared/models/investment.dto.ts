export interface InvestmentDto {
  id: number;
  startupId: number;
  investorId: number;
  amount: number;
  status: string;
  createdAt: string | null;
}

export interface InvestmentCreateDto {
  startupId: number;
  amount: number;
}
