import { Invitation, TeamMember, parseInvitationStatus, parseTeamRole } from '../models/team.model';
import { InvitationDto, TeamMemberDto } from '../models/team.dto';
import { DateAdapter } from '../utils/date.adapter';
import { Mapper } from './base.mapper';

export class InvitationMapper implements Mapper<Invitation, InvitationDto> {
  toDomain(dto: InvitationDto): Invitation {
    return {
      id: dto.id,
      startupId: dto.startupId,
      founderId: dto.founderId,
      invitedUserId: dto.invitedUserId,
      role: parseTeamRole(dto.role),
      status: parseInvitationStatus(dto.status),
      createdAt: DateAdapter.fromServer(dto.createdAt),
      updatedAt: DateAdapter.fromServer(dto.updatedAt)
    };
  }
}

export class TeamMemberMapper implements Mapper<TeamMember, TeamMemberDto> {
  toDomain(dto: TeamMemberDto): TeamMember {
    return {
      id: dto.id,
      startupId: dto.startupId,
      userId: dto.userId,
      role: parseTeamRole(dto.role),
      isActive: dto.isActive,
      joinedAt: DateAdapter.fromServer(dto.joinedAt),
      leftAt: DateAdapter.fromServer(dto.leftAt)
    };
  }
}

export const invitationMapper = new InvitationMapper();
export const teamMemberMapper = new TeamMemberMapper();
