import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { Invitation, TeamMember } from '../../shared/models/team.model';
import { InviteUserDto } from '../../shared/models/team.dto';
import { TeamService } from './team.service';

@Injectable({
  providedIn: 'root'
})
export class FounderTeamFacade {
  private teamService = inject(TeamService);
  
  private membersStateSubject = new BehaviorSubject<DataState<TeamMember[]>>(createInitialState());
  membersState$: Observable<DataState<TeamMember[]>> = this.membersStateSubject.asObservable();

  private invitesStateSubject = new BehaviorSubject<DataState<Invitation[]>>(createInitialState());
  invitesState$: Observable<DataState<Invitation[]>> = this.invitesStateSubject.asObservable();

  private mutateStateSubject = new BehaviorSubject<DataState<void>>(createInitialState());
  mutateState$: Observable<DataState<void>> = this.mutateStateSubject.asObservable();

  loadTeam(startupId: number): void {
    this.membersStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.teamService.getStartupTeam(startupId).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.membersStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.membersStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to load team' });
      }
    });
  }

  loadInvitations(startupId: number): void {
    this.invitesStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.teamService.getStartupInvitations(startupId).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.invitesStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.invitesStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to load invitations' });
      }
    });
  }

  inviteUser(dto: InviteUserDto): void {
    if (this.mutateStateSubject.value.loadingState === 'loading') return;
    this.mutateStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.teamService.inviteUser(dto).subscribe(envelope => {
      if (envelope.success) {
        this.mutateStateSubject.next({ data: undefined, loadingState: 'loaded', error: null });
        this.loadInvitations(dto.startupId);
      } else {
        this.mutateStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to invite user' });
      }
    });
  }

  cancelInvitation(invitationId: number, startupId: number): void {
    this.mutateStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.teamService.cancelInvitation(invitationId).subscribe(envelope => {
      if (envelope.success) {
        this.mutateStateSubject.next({ data: undefined, loadingState: 'loaded', error: null });
        this.loadInvitations(startupId);
      } else {
        this.mutateStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to cancel invitation' });
      }
    });
  }

  removeMember(startupId: number, userId: number): void {
    this.mutateStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.teamService.removeMember(startupId, userId).subscribe(envelope => {
      if (envelope.success) {
        this.mutateStateSubject.next({ data: undefined, loadingState: 'loaded', error: null });
        this.loadTeam(startupId);
      } else {
        this.mutateStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to remove member' });
      }
    });
  }

  clearMutateState(): void {
    this.mutateStateSubject.next(createInitialState());
  }
}
