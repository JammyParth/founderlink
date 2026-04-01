export interface MessageDto {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string | null;
}

export interface MessageSendDto {
  receiverId: number;
  content: string;
}
