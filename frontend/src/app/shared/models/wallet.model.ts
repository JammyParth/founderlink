export interface Wallet {
  id: number;
  startupId: number;
  balance: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface WalletDto {
  id: number;
  startupId: number;
  balance: number;
  createdAt: string | null;
  updatedAt: string | null;
}
