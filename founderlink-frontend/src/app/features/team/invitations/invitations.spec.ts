import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { InvitationsComponent } from './invitations';
import { AuthService } from '../../../core/services/auth.service';
import { TeamService } from '../../../core/services/team.service';
import { StartupService } from '../../../core/services/startup.service';

const mockInvitationPending = {
  id: 1, startupId: 1, founderId: 10, invitedUserId: 30, role: 'CTO', status: 'PENDING',
  createdAt: '2025-06-01T00:00:00', updatedAt: null
} as any;
const mockInvitationAccepted = { ...mockInvitationPending, id: 2, status: 'ACCEPTED' } as any;

describe('InvitationsComponent', () => {
  let fixture: ComponentFixture<InvitationsComponent>;
  let component: InvitationsComponent;
  let authStub: Partial<AuthService>;
  let teamStub: Partial<TeamService>;
  let startupStub: Partial<StartupService>;

  beforeEach(async () => {
    authStub = { userId: vi.fn().mockReturnValue(30) as any };
    teamStub = {
      getMyInvitations: vi.fn().mockReturnValue(
        of({ success: true, data: [mockInvitationPending, mockInvitationAccepted], error: null })
      ),
      joinTeam: vi.fn().mockReturnValue(of({ success: true, data: {} as any, error: null })),
      rejectInvitation: vi.fn().mockReturnValue(
        of({ success: true, data: { ...mockInvitationPending, status: 'REJECTED' } as any, error: null })
      )
    };
    startupStub = {
      getAll: vi.fn().mockReturnValue(of({ success: true, data: [], error: null }))
    };

    await TestBed.configureTestingModule({
      imports: [InvitationsComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: TeamService, useValue: teamStub },
        { provide: StartupService, useValue: startupStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(InvitationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── ngOnInit ─────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should load invitations on init', () => {
      expect(teamStub.getMyInvitations).toHaveBeenCalled();
      expect(component.invitations()).toHaveLength(2);
    });

    it('Boundary: should separate pending and responded invitations correctly', () => {
      expect(component.pending()).toHaveLength(1);
      expect(component.responded()).toHaveLength(1);
    });

    it('Exception: should set errorMsg when getMyInvitations fails', async () => {
      teamStub.getMyInvitations = vi.fn().mockReturnValue(throwError(() => ({ error: 'Network error' })));
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [InvitationsComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: authStub },
          { provide: TeamService, useValue: teamStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(InvitationsComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toBe('Network error');
    });
  });

  // ─── accept() ────────────────────────────────────────────────────────────

  describe('accept()', () => {
    it('Normal: should call teamService.joinTeam and update invitation status to ACCEPTED', () => {
      vi.useFakeTimers();
      component.accept(mockInvitationPending);
      vi.advanceTimersByTime(3000);
      expect(teamStub.joinTeam).toHaveBeenCalledWith({ invitationId: 1 });
      const updated = component.invitations().find(i => i.id === 1);
      expect(updated?.status).toBe('ACCEPTED');
      vi.useRealTimers();
    });

    it('Boundary: should set successMsg "You have joined the team!" on accept', () => {
      component.accept(mockInvitationPending);
      expect(component.successMsg()).toContain('joined the team');
    });

    it('Exception: should set errorMsg and clear acting signal when joinTeam fails', () => {
      teamStub.joinTeam = vi.fn().mockReturnValue(throwError(() => ({ error: 'Already a member' })));
      component.accept(mockInvitationPending);
      expect(component.errorMsg()).toBe('Already a member');
      expect(component.acting()).toBeNull();
    });
  });

  // ─── reject() ────────────────────────────────────────────────────────────

  describe('reject()', () => {
    beforeEach(() => vi.spyOn(window, 'confirm').mockReturnValue(true));
    afterEach(() => vi.restoreAllMocks());

    it('Normal: should call rejectInvitation and update status to REJECTED', () => {
      vi.useFakeTimers();
      component.reject(mockInvitationPending);
      vi.advanceTimersByTime(3000);
      expect(teamStub.rejectInvitation).toHaveBeenCalledWith(1);
      const updated = component.invitations().find(i => i.id === 1);
      expect(updated?.status).toBe('REJECTED');
      vi.useRealTimers();
    });

    it('Boundary: should not call rejectInvitation when user cancels confirm dialog', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      component.reject(mockInvitationPending);
      expect(teamStub.rejectInvitation).not.toHaveBeenCalled();
    });

    it('Exception: should set errorMsg when rejectInvitation fails', () => {
      teamStub.rejectInvitation = vi.fn().mockReturnValue(throwError(() => ({ error: 'Rejection failed' })));
      component.reject(mockInvitationPending);
      expect(component.errorMsg()).toBe('Rejection failed');
    });
  });

  // ─── status helpers ───────────────────────────────────────────────────────

  describe('statusLabel()', () => {
    it('Normal: should return "Awaiting Response" for PENDING status', () => {
      expect(component.statusLabel('PENDING')).toBe('Awaiting Response');
    });

    it('Boundary: should return "Accepted" for ACCEPTED status', () => {
      expect(component.statusLabel('ACCEPTED')).toBe('Accepted');
    });

    it('Exception: roleLabel should format ENGINEERING_LEAD with spaces', () => {
      expect(component.roleLabel('ENGINEERING_LEAD')).toBe('Engineering Lead');
    });
  });
});
