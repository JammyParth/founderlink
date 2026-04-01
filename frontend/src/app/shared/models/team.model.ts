export enum TeamRole {
  CTO = 'CTO',
  CPO = 'CPO',
  MARKETING_HEAD = 'MARKETING_HEAD',
  ENGINEERING_LEAD = 'ENGINEERING_LEAD'
}

export function parseTeamRole(role: string | null | undefined): TeamRole {
  if (!role) return TeamRole.ENGINEERING_LEAD;
  const upper = role.toUpperCase();
  if (Object.values(TeamRole).includes(upper as TeamRole)) {
    return upper as TeamRole;
  }
  return TeamRole.ENGINEERING_LEAD;
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export function parseInvitationStatus(status: string | null | undefined): InvitationStatus {
  if (!status) return InvitationStatus.PENDING;
  const upper = status.toUpperCase();
  if (Object.values(InvitationStatus).includes(upper as InvitationStatus)) {
    return upper as InvitationStatus;
  }
  return InvitationStatus.PENDING;
}

export interface Invitation {
  id: number;
  startupId: number;
  founderId: number;
  invitedUserId: number;
  role: TeamRole;
  status: InvitationStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface TeamMember {
  id: number;
  startupId: number;
  userId: number;
  role: TeamRole;
  isActive: boolean;
  joinedAt: Date | null;
  leftAt: Date | null;
}
