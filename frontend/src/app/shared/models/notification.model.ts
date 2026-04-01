export interface AppNotification {
  id: number;
  userId: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: Date | null;
}
