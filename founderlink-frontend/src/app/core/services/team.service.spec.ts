import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TeamService } from './team.service';
import { environment } from '../../../environments/environment';
import {
  InvitationRequest, InvitationResponse,
  JoinTeamRequest, TeamMemberResponse
} from '../../models';

const API = environment.apiUrl;

const mockInvitation: InvitationResponse = {
  id: 1,
  startupId: 1,
  founderId: 10,
  invitedUserId: 30,
  role: 'CTO',
  status: 'PENDING',
  createdAt: '2025-06-01T00:00:00',
  updatedAt: null
};

const mockTeamMember: TeamMemberResponse = {
  id: 5,
  startupId: 1,
  userId: 30,
  role: 'CTO',
  isActive: true,
  joinedAt: '2025-06-02T00:00:00',
  leftAt: null
} as any;

describe('TeamService', () => {
  let service: TeamService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TeamService]
    });
    service = TestBed.inject(TeamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── sendInvitation() ─────────────────────────────────────────────────────

  describe('sendInvitation()', () => {
    const req: InvitationRequest = { startupId: 1, invitedUserId: 30, role: 'CTO' };

    it('Normal: should POST /teams/invite and return invitation envelope', () => {
      service.sendInvitation(req).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.status).toBe('PENDING');
        expect(res.data?.role).toBe('CTO');
      });
      const http = httpMock.expectOne(`${API}/teams/invite`);
      expect(http.request.method).toBe('POST');
      expect(http.request.body).toEqual(req);
      http.flush({ message: 'Invited', data: mockInvitation });
    });

    it('Boundary: should send invitation with ENGINEERING_LEAD role (last enum value)', () => {
      const el: InvitationRequest = { ...req, role: 'ENGINEERING_LEAD' };
      service.sendInvitation(el).subscribe(res => {
        expect(res.data?.role).toBe('ENGINEERING_LEAD');
      });
      httpMock.expectOne(`${API}/teams/invite`).flush({
        message: 'ok',
        data: { ...mockInvitation, role: 'ENGINEERING_LEAD' }
      });
    });

    it('Exception: should return normalised error on HTTP 409 (already invited)', () => {
      let errorEnv: any;
      service.sendInvitation(req).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/teams/invite`).flush(
        { message: 'User already has a pending invitation' },
        { status: 409, statusText: 'Conflict' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── cancelInvitation() ───────────────────────────────────────────────────

  describe('cancelInvitation()', () => {
    it('Normal: should PUT /teams/invitations/{id}/cancel and return cancelled invitation', () => {
      service.cancelInvitation(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.status).toBe('CANCELLED');
      });
      const http = httpMock.expectOne(`${API}/teams/invitations/1/cancel`);
      expect(http.request.method).toBe('PUT');
      http.flush({ message: 'Cancelled', data: { ...mockInvitation, status: 'CANCELLED' } });
    });

    it('Boundary: should cancel invitation with the minimum id of 1', () => {
      service.cancelInvitation(1).subscribe(res => {
        expect(res.data?.id).toBe(1);
      });
      httpMock.expectOne(`${API}/teams/invitations/1/cancel`).flush({
        message: 'ok',
        data: { ...mockInvitation, status: 'CANCELLED' }
      });
    });

    it('Exception: should return normalised error on HTTP 404 (invitation not found)', () => {
      let errorEnv: any;
      service.cancelInvitation(9999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/teams/invitations/9999/cancel`).flush(
        { message: 'Invitation not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── rejectInvitation() ───────────────────────────────────────────────────

  describe('rejectInvitation()', () => {
    it('Normal: should PUT /teams/invitations/{id}/reject and return rejected invitation', () => {
      service.rejectInvitation(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.status).toBe('REJECTED');
      });
      const http = httpMock.expectOne(`${API}/teams/invitations/1/reject`);
      expect(http.request.method).toBe('PUT');
      http.flush({ message: 'Rejected', data: { ...mockInvitation, status: 'REJECTED' } });
    });

    it('Boundary: should reject invitation that was previously PENDING only', () => {
      service.rejectInvitation(1).subscribe(res => {
        expect(res.data?.status).not.toBe('PENDING');
      });
      httpMock.expectOne(`${API}/teams/invitations/1/reject`).flush({
        message: 'ok',
        data: { ...mockInvitation, status: 'REJECTED' }
      });
    });

    it('Exception: should return normalised error on HTTP 403 (not the recipient)', () => {
      let errorEnv: any;
      service.rejectInvitation(1).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/teams/invitations/1/reject`).flush(
        { message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── joinTeam() ───────────────────────────────────────────────────────────

  describe('joinTeam()', () => {
    const req: JoinTeamRequest = { invitationId: 1 } as any;

    it('Normal: should POST /teams/join and return team member envelope', () => {
      service.joinTeam(req).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.role).toBe('CTO');
        expect(res.data?.isActive).toBe(true);
      });
      const http = httpMock.expectOne(`${API}/teams/join`);
      expect(http.request.method).toBe('POST');
      http.flush({ message: 'Joined', data: mockTeamMember });
    });

    it('Boundary: should join team when invitation is at id = 1 (minimum)', () => {
      service.joinTeam({ invitationId: 1 } as any).subscribe(res => {
        expect(res.data?.userId).toBe(30);
      });
      httpMock.expectOne(`${API}/teams/join`).flush({ message: 'ok', data: mockTeamMember });
    });

    it('Exception: should return normalised error on HTTP 400 when invitation already accepted', () => {
      let errorEnv: any;
      service.joinTeam(req).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/teams/join`).flush(
        { message: 'Invitation already accepted' },
        { status: 400, statusText: 'Bad Request' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getMyInvitations() ───────────────────────────────────────────────────

  describe('getMyInvitations()', () => {
    it('Normal: should GET /teams/invitations/user and return invitation list', () => {
      service.getMyInvitations().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.[0].invitedUserId).toBe(30);
      });
      httpMock.expectOne(`${API}/teams/invitations/user`).flush({ message: 'ok', data: [mockInvitation] });
    });

    it('Boundary: should return empty list for user with no pending invitations', () => {
      service.getMyInvitations().subscribe(res => {
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/teams/invitations/user`).flush({ message: 'ok', data: [] });
    });

    it('Exception: should return normalised error on HTTP 401', () => {
      let errorEnv: any;
      service.getMyInvitations().subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/teams/invitations/user`).flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getStartupInvitations() ──────────────────────────────────────────────

  describe('getStartupInvitations()', () => {
    it('Normal: should GET /teams/invitations/startup/{id}', () => {
      service.getStartupInvitations(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.[0].startupId).toBe(1);
      });
      httpMock.expectOne(`${API}/teams/invitations/startup/1`).flush({ message: 'ok', data: [mockInvitation] });
    });

    it('Boundary: should handle startup with no sent invitations', () => {
      service.getStartupInvitations(2).subscribe(res => {
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/teams/invitations/startup/2`).flush({ message: 'ok', data: [] });
    });

    it('Exception: should normalise error on 404', () => {
      let errorEnv: any;
      service.getStartupInvitations(9999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/teams/invitations/startup/9999`).flush(
        { message: 'Startup not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getTeamMembers() ─────────────────────────────────────────────────────

  describe('getTeamMembers()', () => {
    it('Normal: should GET /teams/startup/{id} and return team members', () => {
      service.getTeamMembers(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.[0].startupId).toBe(1);
        expect(res.data?.[0].isActive).toBe(true);
      });
      httpMock.expectOne(`${API}/teams/startup/1`).flush({ message: 'ok', data: [mockTeamMember] });
    });

    it('Boundary: should return empty team for startup with no active members', () => {
      service.getTeamMembers(2).subscribe(res => {
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/teams/startup/2`).flush({ message: 'ok', data: [] });
    });

    it('Exception: should normalise error on 500', () => {
      let errorEnv: any;
      service.getTeamMembers(1).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/teams/startup/1`).flush({}, { status: 500, statusText: 'Server Error' });
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── removeMember() ───────────────────────────────────────────────────────

  describe('removeMember()', () => {
    it('Normal: should DELETE /teams/{id} and return null envelope', () => {
      service.removeMember(5).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toBeNull();
      });
      const http = httpMock.expectOne(`${API}/teams/5`);
      expect(http.request.method).toBe('DELETE');
      http.flush({ message: 'Removed', data: null });
    });

    it('Boundary: should remove member with minimum id = 1', () => {
      service.removeMember(1).subscribe(res => {
        expect(res.success).toBe(true);
      });
      httpMock.expectOne(`${API}/teams/1`).flush({ message: 'ok', data: null });
    });

    it('Exception: should normalise error on 403 (not the startup founder)', () => {
      let errorEnv: any;
      service.removeMember(5).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/teams/5`).flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getMyActiveRoles() ───────────────────────────────────────────────────

  describe('getMyActiveRoles()', () => {
    it('Normal: should GET /teams/member/active and return active team memberships', () => {
      service.getMyActiveRoles().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.[0].isActive).toBe(true);
      });
      httpMock.expectOne(`${API}/teams/member/active`).flush({ message: 'ok', data: [mockTeamMember] });
    });

    it('Boundary: should return empty array when user has no active memberships', () => {
      service.getMyActiveRoles().subscribe(res => {
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/teams/member/active`).flush({ message: 'ok', data: [] });
    });

    it('Exception: should normalise error on 401 (unauthenticated user)', () => {
      let errorEnv: any;
      service.getMyActiveRoles().subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/teams/member/active`).flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getMemberHistory() ───────────────────────────────────────────────────

  describe('getMemberHistory()', () => {
    it('Normal: should GET /teams/member/history and return all past and active memberships', () => {
      const past: TeamMemberResponse = { ...mockTeamMember, isActive: false, leftAt: '2025-09-01T00:00:00' } as any;
      service.getMemberHistory().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toHaveLength(2);
      });
      httpMock.expectOne(`${API}/teams/member/history`).flush({ message: 'ok', data: [mockTeamMember, past] });
    });

    it('Boundary: should return empty history for a brand-new user', () => {
      service.getMemberHistory().subscribe(res => {
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/teams/member/history`).flush({ message: 'ok', data: [] });
    });

    it('Exception: should normalise error on 500 server error', () => {
      let errorEnv: any;
      service.getMemberHistory().subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/teams/member/history`).flush({}, { status: 500, statusText: 'Server Error' });
      expect(errorEnv.success).toBe(false);
    });
  });
});
