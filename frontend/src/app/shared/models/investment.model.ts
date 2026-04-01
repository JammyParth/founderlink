export enum InvestmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  STARTUP_CLOSED = 'STARTUP_CLOSED'
}

export function parseInvestmentStatus(status: string | null | undefined): InvestmentStatus {
  if (!status) return InvestmentStatus.PENDING;
  const upperStatus = status.toUpperCase();
  
  if (Object.values(InvestmentStatus).includes(upperStatus as InvestmentStatus)) {
    return upperStatus as InvestmentStatus;
  }
  
  return InvestmentStatus.PENDING;
}

export interface Investment {
  id: number;
  startupId: number;
  investorId: number;
  amount: number;
  status: InvestmentStatus;
  createdAt: Date | null;
}
