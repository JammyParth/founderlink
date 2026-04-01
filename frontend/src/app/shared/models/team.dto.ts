export interface InvitationDto {
  id: number;
  startupId: number;
  founderId: number;
  invitedUserId: number;
  role: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TeamMemberDto {
  id: number;
  startupId: number;
  userId: number;
  role: string;
  isActive: boolean;
  joinedAt: string | null;
  leftAt: string | null;
}

export interface InviteUserDto {
  startupId: number;
  invitedUserId: number;
  role: string;
}
