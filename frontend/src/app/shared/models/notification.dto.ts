export interface AppNotificationDto {
  id: number;
  userId: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string | null;
}
