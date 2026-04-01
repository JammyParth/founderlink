import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { Invitation, TeamMember } from '../../shared/models/team.model';
import { TeamService } from './team.service';

@Injectable({
  providedIn: 'root'
})
export class CofounderTeamFacade {
  private teamService = inject(TeamService);
  
  private invitesStateSubject = new BehaviorSubject<DataState<Invitation[]>>(createInitialState());
  invitesState$: Observable<DataState<Invitation[]>> = this.invitesStateSubject.asObservable();

  private rolesStateSubject = new BehaviorSubject<DataState<TeamMember[]>>(createInitialState());
  rolesState$: Observable<DataState<TeamMember[]>> = this.rolesStateSubject.asObservable();

  private mutateStateSubject = new BehaviorSubject<DataState<void>>(createInitialState());
  mutateState$: Observable<DataState<void>> = this.mutateStateSubject.asObservable();

  loadMyInvitations(): void {
    this.invitesStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.teamService.getUserInvitations().subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.invitesStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.invitesStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to load invitations' });
      }
    });
  }

  loadMyRoles(): void {
    this.rolesStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.teamService.getActiveRoles().subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.rolesStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.rolesStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to load roles' });
      }
    });
  }

  acceptInvitation(invitationId: number): void {
    if (this.mutateStateSubject.value.loadingState === 'loading') return;
    this.mutateStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.teamService.joinTeam(invitationId).subscribe(envelope => {
      if (envelope.success) {
        this.mutateStateSubject.next({ data: undefined, loadingState: 'loaded', error: null });
        this.loadMyInvitations();
        this.loadMyRoles();
      } else {
        this.mutateStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to accept invitation' });
      }
    });
  }

  rejectInvitation(invitationId: number): void {
    if (this.mutateStateSubject.value.loadingState === 'loading') return;
    this.mutateStateSubject.next({ data: null, loadingState: 'loading', error: null });
    this.teamService.rejectInvitation(invitationId).subscribe(envelope => {
      if (envelope.success) {
        this.mutateStateSubject.next({ data: undefined, loadingState: 'loaded', error: null });
        this.loadMyInvitations();
      } else {
        this.mutateStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to reject invitation' });
      }
    });
  }

  clearMutateState(): void {
    this.mutateStateSubject.next(createInitialState());
  }
}
