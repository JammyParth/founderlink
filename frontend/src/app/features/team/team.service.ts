import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/http/api-client.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Invitation, TeamMember } from '../../shared/models/team.model';
import { InvitationDto, TeamMemberDto, InviteUserDto } from '../../shared/models/team.dto';
import { invitationMapper, teamMemberMapper } from '../../shared/mappers/team.mapper';
import { ApiEnvelope } from '../../shared/models/api-envelope.model';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private apiClient = inject(ApiClientService);
  private readonly baseUrl = '/team';

  // --- Mappers ---
  private mapInvitation(envelope: ApiEnvelope<InvitationDto>): ApiEnvelope<Invitation> {
    if (envelope.success && envelope.data) return { ...envelope, data: invitationMapper.toDomain(envelope.data) };
    return envelope as unknown as ApiEnvelope<Invitation>;
  }

  private mapInvitationList(envelope: ApiEnvelope<InvitationDto[]>): ApiEnvelope<Invitation[]> {
    if (envelope.success && envelope.data) return { ...envelope, data: envelope.data.map(d => invitationMapper.toDomain(d)) };
    return envelope as unknown as ApiEnvelope<Invitation[]>;
  }

  private mapMember(envelope: ApiEnvelope<TeamMemberDto>): ApiEnvelope<TeamMember> {
    if (envelope.success && envelope.data) return { ...envelope, data: teamMemberMapper.toDomain(envelope.data) };
    return envelope as unknown as ApiEnvelope<TeamMember>;
  }

  private mapMemberList(envelope: ApiEnvelope<TeamMemberDto[]>): ApiEnvelope<TeamMember[]> {
    if (envelope.success && envelope.data) return { ...envelope, data: envelope.data.map(d => teamMemberMapper.toDomain(d)) };
    return envelope as unknown as ApiEnvelope<TeamMember[]>;
  }

  // --- Methods ---
  inviteUser(dto: InviteUserDto): Observable<ApiEnvelope<Invitation>> {
    return this.apiClient.post<InvitationDto>(`${this.baseUrl}/invite`, dto).pipe(map(e => this.mapInvitation(e)));
  }

  cancelInvitation(id: number): Observable<ApiEnvelope<void>> {
    return this.apiClient.put<void>(`${this.baseUrl}/invite/${id}/cancel`, null);
  }

  rejectInvitation(id: number): Observable<ApiEnvelope<void>> {
    return this.apiClient.put<void>(`${this.baseUrl}/invite/${id}/reject`, null);
  }

  getUserInvitations(): Observable<ApiEnvelope<Invitation[]>> {
    return this.apiClient.get<InvitationDto[]>(`${this.baseUrl}/invitations`).pipe(map(e => this.mapInvitationList(e)));
  }

  getStartupInvitations(startupId: number): Observable<ApiEnvelope<Invitation[]>> {
    return this.apiClient.get<InvitationDto[]>(`${this.baseUrl}/startup/${startupId}/invitations`).pipe(map(e => this.mapInvitationList(e)));
  }

  joinTeam(invitationId: number): Observable<ApiEnvelope<TeamMember>> {
    return this.apiClient.post<TeamMemberDto>(`${this.baseUrl}/join`, { invitationId }).pipe(map(e => this.mapMember(e)));
  }

  getStartupTeam(startupId: number): Observable<ApiEnvelope<TeamMember[]>> {
    return this.apiClient.get<TeamMemberDto[]>(`${this.baseUrl}/startup/${startupId}/members`).pipe(map(e => this.mapMemberList(e)));
  }

  removeMember(startupId: number, userId: number): Observable<ApiEnvelope<void>> {
    return this.apiClient.delete<void>(`${this.baseUrl}/startup/${startupId}/members/${userId}`);
  }

  getActiveRoles(): Observable<ApiEnvelope<TeamMember[]>> {
    return this.apiClient.get<TeamMemberDto[]>(`${this.baseUrl}/roles`).pipe(map(e => this.mapMemberList(e)));
  }
}
