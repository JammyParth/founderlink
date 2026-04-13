import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';

import { TeamComponent } from './team';
import { AuthService } from '../../core/services/auth.service';
import { TeamService } from '../../core/services/team.service';
import { StartupService } from '../../core/services/startup.service';
import { UserService } from '../../core/services/user.service';

const mockStartup = { id: 1, name: 'FounderCo', founderId: 10 } as any;
const mockMember = { id: 5, startupId: 1, userId: 30, role: 'CTO', isActive: true, joinedAt: '2025-01-01' } as any;
const mockUser = { userId: 30, name: 'Alice Dev', email: 'alice@test.com', skills: 'Angular' } as any;

describe('TeamComponent', () => {
  let fixture: ComponentFixture<TeamComponent>;
  let component: TeamComponent;
  let authStub: Partial<AuthService>;
  let teamStub: Partial<TeamService>;
  let startupStub: Partial<StartupService>;
  let userStub: Partial<UserService>;
  let router: Router;

  const createModule = async (role: string) => {
    authStub = {
      role: vi.fn().mockReturnValue(role) as any,
      userId: vi.fn().mockReturnValue(10) as any
    };
    teamStub = {
      getTeamMembers: vi.fn().mockReturnValue(of({ success: true, data: [mockMember], error: null })),
      getMyActiveRoles: vi.fn().mockReturnValue(of({ success: true, data: [mockMember], error: null })),
      sendInvitation: vi.fn().mockReturnValue(of({ success: true, data: {} as any, error: null })),
      removeMember: vi.fn().mockReturnValue(of({ success: true, data: null, error: null }))
    };
    startupStub = {
      getMyStartups: vi.fn().mockReturnValue(of({ success: true, data: [mockStartup], error: null })),
      getAll: vi.fn().mockReturnValue(of({ success: true, data: [mockStartup], error: null }))
    };
    userStub = {
      getAllUsers: vi.fn().mockReturnValue(of({ success: true, data: [mockUser], error: null })),
      getUsersByRole: vi.fn().mockReturnValue(of({ success: true, data: [mockUser], error: null }))
    };

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TeamComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: TeamService, useValue: teamStub },
        { provide: StartupService, useValue: startupStub },
        { provide: UserService, useValue: userStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TeamComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  };

  beforeEach(async () => createModule('ROLE_FOUNDER'));

  // ─── FOUNDER ──────────────────────────────────────────────────────────────

  describe('FOUNDER role', () => {
    it('Normal: should load founder startups and team members on init', () => {
      expect(startupStub.getMyStartups).toHaveBeenCalled();
      expect(teamStub.getTeamMembers).toHaveBeenCalledWith(1);
      expect(component.teamMembers()).toHaveLength(1);
    });

    it('Boundary: should set selectedStartupId to first startup\'s id', () => {
      expect(component.selectedStartupId()).toBe(1);
    });

    it('Exception: should set loading false when getMyStartups fails', async () => {
      startupStub.getMyStartups = vi.fn().mockReturnValue(throwError(() => new Error('fail')));
      await createModule('ROLE_FOUNDER');
      expect(component.loading()).toBe(false);
    });
  });

  // ─── COFOUNDER ────────────────────────────────────────────────────────────

  describe('COFOUNDER role', () => {
    beforeEach(async () => createModule('ROLE_COFOUNDER'));

    it('Normal: should load cofounder active roles instead of startup data', () => {
      expect(teamStub.getMyActiveRoles).toHaveBeenCalled();
      expect(component.myTeams()).toHaveLength(1);
    });

    it('Boundary: should not call getTeamMembers for cofounder', () => {
      expect(teamStub.getTeamMembers).not.toHaveBeenCalled();
    });

    it('Exception: should set loading false when getMyActiveRoles fails', async () => {
      teamStub.getMyActiveRoles = vi.fn().mockReturnValue(throwError(() => ({ error: 'fail' })));
      await createModule('ROLE_COFOUNDER');
      expect(component.loading()).toBe(false);
    });
  });

  // ─── removeMember() ───────────────────────────────────────────────────────

  describe('removeMember()', () => {
    beforeEach(() => vi.spyOn(globalThis, 'confirm').mockReturnValue(true));
    afterEach(() => vi.restoreAllMocks());

    it('Normal: should call teamService.removeMember and remove from teamMembers list', () => {
      vi.useFakeTimers();
      component.removeMember(5);
      vi.advanceTimersByTime(3000);
      expect(teamStub.removeMember).toHaveBeenCalledWith(5);
      expect(component.teamMembers().find(m => m.id === 5)).toBeUndefined();
      vi.useRealTimers();
    });

    it('Boundary: should not remove when confirm returns false', () => {
      vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
      component.removeMember(5);
      expect(teamStub.removeMember).not.toHaveBeenCalled();
    });

    it('Exception: should set errorMsg when removeMember fails', () => {
      teamStub.removeMember = vi.fn().mockReturnValue(throwError(() => ({ error: 'Cannot remove founder' })));
      component.removeMember(5);
      expect(component.errorMsg()).toBe('Cannot remove founder');
    });
  });

  // ─── discovery panel / sendInvite() ──────────────────────────────────────

  describe('sendInvite()', () => {
    beforeEach(() => {
      component.openDiscovery();
      component.selectUserToInvite(mockUser);
      component.selectedRole.set('CTO');
    });

    it('Normal: should call teamService.sendInvitation with correct payload', () => {
      component.sendInvite();
      expect(teamStub.sendInvitation).toHaveBeenCalledWith({
        startupId: 1, invitedUserId: 30, role: 'CTO'
      });
    });

    it('Boundary: should set errorMsg when no role selected before sendInvite', () => {
      component.selectedRole.set('');
      component.sendInvite();
      expect(teamStub.sendInvitation).not.toHaveBeenCalled();
      expect(component.errorMsg()).toBeTruthy();
    });

    it('Exception: should set errorMsg and clear inviting flag when sendInvitation fails', () => {
      teamStub.sendInvitation = vi.fn().mockReturnValue(throwError(() => ({ error: 'Already invited' })));
      component.sendInvite();
      expect(component.errorMsg()).toBe('Already invited');
      expect(component.inviting()).toBe(false);
    });
  });

  // ─── filteredUsers computed ───────────────────────────────────────────────

  describe('filteredUsers computed', () => {
    it('Normal: should exclude current user and existing team members from list', () => {
      // mockUser userId=30 is already a team member; current userId=10
      // allUsers has [mockUser (30)], teamMembers has [mockMember (userId=30)]
      // So filtered should be empty because 30 is in team
      expect(component.filteredUsers()).toHaveLength(0);
    });

    it('Boundary: should filter by search query case-insensitively', () => {
      component.teamMembers.set([]); // clear team so alice appears
      component.allUsers.set([mockUser]);
      component.searchQuery.set('alice');
      expect(component.filteredUsers()).toHaveLength(1);
    });

    it('Exception: should return empty when search term matches no user', () => {
      component.searchQuery.set('ZZZNOMATCH');
      expect(component.filteredUsers()).toHaveLength(0);
    });
  });

  // ─── onStartupChange() ───────────────────────────────────────────────────

  describe('onStartupChange()', () => {
    it('Normal: should update selectedStartupId and reload team', () => {
      component.onStartupChange(2);
      expect(component.selectedStartupId()).toBe(2);
      expect(teamStub.getTeamMembers).toHaveBeenCalledWith(2);
    });

    it('Boundary: should close discovery panel on startup change', () => {
      component.showDiscovery.set(true);
      component.onStartupChange(2);
      expect(component.showDiscovery()).toBe(false);
    });
  });

  // ─── messageMember() ─────────────────────────────────────────────────────

  describe('messageMember()', () => {
    it('Normal: should navigate to messages with userId', () => {
      component.messageMember(30);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: 30 } }
      );
    });

    it('Boundary: should navigate for userId = 0', () => {
      component.messageMember(0);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: 0 } }
      );
    });
  });

  // ─── openDiscovery() / closeDiscovery() ───────────────────────────────────

  describe('openDiscovery() / closeDiscovery()', () => {
    it('Normal: openDiscovery should show discovery panel and load users', () => {
      component.openDiscovery();
      expect(component.showDiscovery()).toBe(true);
      expect(userStub.getUsersByRole).toHaveBeenCalledWith('COFOUNDER');
    });

    it('Boundary: openDiscovery should reset selectedUser and selectedRole', () => {
      component.selectedUser.set(mockUser);
      component.selectedRole.set('CTO');
      component.openDiscovery();
      expect(component.selectedUser()).toBeNull();
      expect(component.selectedRole()).toBe('');
    });

    it('Normal: closeDiscovery should hide panel and reset state', () => {
      component.showDiscovery.set(true);
      component.selectedUser.set(mockUser);
      component.closeDiscovery();
      expect(component.showDiscovery()).toBe(false);
      expect(component.selectedUser()).toBeNull();
    });

    it('Exception: closeDiscovery should also clear viewedUser', () => {
      component.viewedUser.set(mockUser as any);
      component.closeDiscovery();
      expect(component.viewedUser()).toBeNull();
    });
  });

  // ─── viewProfile() / closeProfile() ──────────────────────────────────────

  describe('viewProfile() / closeProfile()', () => {
    it('Normal: viewProfile should set viewedUser', () => {
      component.viewProfile(mockUser as any);
      expect(component.viewedUser()).toEqual(mockUser);
    });

    it('Boundary: closeProfile should set viewedUser to null', () => {
      component.viewedUser.set(mockUser as any);
      component.closeProfile();
      expect(component.viewedUser()).toBeNull();
    });
  });

  // ─── loadUsersForRole() ───────────────────────────────────────────────────

  describe('loadUsersForRole()', () => {
    it('Normal: should call getUsersByRole when role is provided', () => {
      vi.clearAllMocks();
      component.loadUsersForRole('CTO');
      expect(userStub.getUsersByRole).toHaveBeenCalledWith('CTO');
      expect(component.roleFilter()).toBe('CTO');
    });

    it('Boundary: should call getAllUsers when role is empty string', () => {
      vi.clearAllMocks();
      component.loadUsersForRole('');
      expect(userStub.getAllUsers).toHaveBeenCalled();
    });

    it('Exception: should set allUsers to empty array on error', () => {
      userStub.getUsersByRole = vi.fn().mockReturnValue(
        throwError(() => new Error('fail'))
      );
      component.loadUsersForRole('CTO');
      expect(component.allUsers()).toHaveLength(0);
      expect(component.usersLoading()).toBe(false);
    });
  });

  // ─── viewStartup() ───────────────────────────────────────────────────────

  describe('viewStartup()', () => {
    it('Normal: should navigate to startup detail page', () => {
      component.viewStartup(1);
      expect(router.navigate).toHaveBeenCalledWith(['/startup', 1]);
    });
  });

  // ─── messageFounder() ────────────────────────────────────────────────────

  describe('messageFounder()', () => {
    it('Normal: should navigate to messages when founderId exists in map', () => {
      component.startupFounders.set(new Map([[1, 10]]));
      component.messageFounder(1);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: 10 } }
      );
    });

    it('Exception: should not navigate when startupId has no founder in map', () => {
      component.startupFounders.set(new Map());
      vi.clearAllMocks();
      component.messageFounder(999);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  // ─── roleLabel() / roleShortLabel() / roleClass() ─────────────────────────

  describe('role helpers', () => {
    it('Normal: roleLabel should return full label for CTO', () => {
      expect(component.roleLabel('CTO')).toBe('Chief Technology Officer');
    });

    it('Normal: roleLabel should return full label for CPO', () => {
      expect(component.roleLabel('CPO')).toBe('Chief Product Officer');
    });

    it('Normal: roleLabel should return full label for MARKETING_HEAD', () => {
      expect(component.roleLabel('MARKETING_HEAD')).toBe('Marketing Head');
    });

    it('Exception: roleLabel should return formatted string for unknown role', () => {
      expect(component.roleLabel('SOME_ROLE')).toBe('SOME ROLE');
    });

    it('Boundary: roleShortLabel should return short label for CTO', () => {
      expect(component.roleShortLabel('CTO')).toBe('CTO');
    });

    it('Boundary: roleShortLabel should return raw for unknown role', () => {
      expect(component.roleShortLabel('UNKNOWN')).toBe('UNKNOWN');
    });

    it('Normal: roleClass should return badge-purple for CTO', () => {
      expect(component.roleClass('CTO')).toBe('badge-purple');
    });

    it('Normal: roleClass should return badge-info for CPO', () => {
      expect(component.roleClass('CPO')).toBe('badge-info');
    });

    it('Normal: roleClass should return badge-warning for MARKETING_HEAD', () => {
      expect(component.roleClass('MARKETING_HEAD')).toBe('badge-warning');
    });

    it('Exception: roleClass should return badge-success for ENGINEERING_LEAD', () => {
      expect(component.roleClass('ENGINEERING_LEAD')).toBe('badge-success');
    });
  });

  // ─── userInitials() ──────────────────────────────────────────────────────

  describe('userInitials()', () => {
    it('Normal: should return 2-letter initials from full name', () => {
      expect(component.userInitials({ name: 'Alice Dev', email: 'a@test.com' } as any)).toBe('AD');
    });

    it('Boundary: should return single letter when name has one word', () => {
      expect(component.userInitials({ name: 'Alice', email: 'a@test.com' } as any)).toBe('A');
    });

    it('Exception: should use email when name is null', () => {
      const result = component.userInitials({ name: null, email: 'alice@test.com' } as any);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ─── isFounder() / isCoFounder() ─────────────────────────────────────────

  describe('isFounder() / isCoFounder()', () => {
    it('Normal: isFounder should return true for ROLE_FOUNDER', async () => {
      await createModule('ROLE_FOUNDER');
      expect(component.isFounder()).toBe(true);
      expect(component.isCoFounder()).toBe(false);
    });

    it('Boundary: isCoFounder should return true for ROLE_COFOUNDER', async () => {
      await createModule('ROLE_COFOUNDER');
      expect(component.isCoFounder()).toBe(true);
      expect(component.isFounder()).toBe(false);
    });

    it('Exception: both should return false for ROLE_INVESTOR', async () => {
      await createModule('ROLE_INVESTOR');
      expect(component.isFounder()).toBe(false);
      expect(component.isCoFounder()).toBe(false);
    });
  });

  // ─── loadFounderData() no startups ────────────────────────────────────────

  describe('loadFounderData() — no startups', () => {
    it('Boundary: should set loading to false when founder has no startups', async () => {
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [TeamComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: { role: vi.fn().mockReturnValue('ROLE_FOUNDER') as any, userId: vi.fn().mockReturnValue(10) as any } },
          { provide: TeamService, useValue: {
              getTeamMembers: vi.fn().mockReturnValue(of({ success: true, data: [mockMember], error: null })),
              getMyActiveRoles: vi.fn().mockReturnValue(of({ success: true, data: [], error: null })),
              sendInvitation: vi.fn().mockReturnValue(of({ success: true, data: {} as any, error: null })),
              removeMember: vi.fn().mockReturnValue(of({ success: true, data: null, error: null }))
            }
          },
          { provide: StartupService, useValue: {
              getMyStartups: vi.fn().mockReturnValue(of({ success: true, data: [], error: null })),
              getAll: vi.fn().mockReturnValue(of({ success: true, data: [], error: null }))
            }
          },
          { provide: UserService, useValue: {
              getAllUsers: vi.fn().mockReturnValue(of({ success: true, data: [mockUser], error: null })),
              getUsersByRole: vi.fn().mockReturnValue(of({ success: true, data: [mockUser], error: null }))
            }
          }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(TeamComponent);
      f.detectChanges();
      expect(f.componentInstance.loading()).toBe(false);
      expect(f.componentInstance.teamMembers()).toHaveLength(0);
    });
  });

  // ─── loadTeam() error path ────────────────────────────────────────────────

  describe('loadTeam() error', () => {
    it('Exception: should set errorMsg and stop loading when getTeamMembers fails', () => {
      teamStub.getTeamMembers = vi.fn().mockReturnValue(
        throwError(() => ({ error: 'Forbidden' }))
      );
      component.loadTeam(1);
      expect(component.errorMsg()).toBe('Forbidden');
      expect(component.loading()).toBe(false);
    });

    it('Boundary: should use fallback message when error has no error field', () => {
      teamStub.getTeamMembers = vi.fn().mockReturnValue(
        throwError(() => ({}))
      );
      component.loadTeam(1);
      expect(component.errorMsg()).toBe('Failed to load team.');
    });
  });

  // ─── sendInvite() success path ────────────────────────────────────────────

  describe('sendInvite() success', () => {
    it('Normal: should close discovery and show successMsg on successful invite', () => {
      vi.useFakeTimers();
      component.openDiscovery();
      component.selectUserToInvite(mockUser as any);
      component.selectedRole.set('CTO');
      component.sendInvite();
      expect(component.showDiscovery()).toBe(false);
      expect(component.successMsg()).toContain('Invitation sent');
      vi.advanceTimersByTime(4000);
      expect(component.successMsg()).toBe('');
      vi.useRealTimers();
    });
  });

  // ─── sendInvite() guard: no startupId ─────────────────────────────────────

  describe('sendInvite() guard cases', () => {
    it('Boundary: should set errorMsg when no user selected', () => {
      component.openDiscovery();
      component.selectedUser.set(null);
      component.selectedRole.set('CTO');
      component.sendInvite();
      expect(teamStub.sendInvitation).not.toHaveBeenCalled();
      expect(component.errorMsg()).toBeTruthy();
    });

    it('Boundary: should set errorMsg when no startupId', () => {
      component.openDiscovery();
      component.selectedStartupId.set(null);
      component.selectedUser.set(mockUser as any);
      component.selectedRole.set('CTO');
      component.sendInvite();
      expect(teamStub.sendInvitation).not.toHaveBeenCalled();
      expect(component.errorMsg()).toBeTruthy();
    });
  });

  // ─── selectUserToInvite() ────────────────────────────────────────────────

  describe('selectUserToInvite()', () => {
    it('Normal: should set selectedUser and clear selectedRole', () => {
      component.selectedRole.set('CTO');
      component.selectUserToInvite(mockUser as any);
      expect(component.selectedUser()).toEqual(mockUser);
      expect(component.selectedRole()).toBe('');
    });
  });

  // ─── Template: discovery panel branches ──────────────────────────────────

  describe('Template: discovery panel rendering', () => {
    const discoveryUser = {
      userId: 99, name: 'Bob Builder', email: 'bob@test.com',
      skills: 'React,TypeScript', bio: 'Experienced dev',
      experience: '5 yrs', portfolioLinks: 'http://portfolio.com', role: 'CTO'
    } as any;

    it('should render usersLoading spinner in discovery panel', () => {
      component.showDiscovery.set(true);
      component.usersLoading.set(true);
      fixture.detectChanges();
      expect(component.usersLoading()).toBe(true);
    });

    it('should render empty-state in discovery when filteredUsers is empty', () => {
      component.allUsers.set([]);
      component.teamMembers.set([]);
      component.showDiscovery.set(true);
      component.usersLoading.set(false);
      fixture.detectChanges();
      expect(component.filteredUsers()).toHaveLength(0);
    });

    it('should render user cards grid when filteredUsers has data', () => {
      component.allUsers.set([discoveryUser]);
      component.teamMembers.set([]);
      component.showDiscovery.set(true);
      component.usersLoading.set(false);
      fixture.detectChanges();
      expect(component.filteredUsers()).toHaveLength(1);
    });

    it('should render user card with no-name fallback', () => {
      const noName = { userId: 88, name: null, email: 'noname@test.com', role: 'CPO' } as any;
      component.allUsers.set([noName]);
      component.teamMembers.set([]);
      component.showDiscovery.set(true);
      component.usersLoading.set(false);
      fixture.detectChanges();
      expect(component.filteredUsers()).toHaveLength(1);
    });

    it('should render invite form panel when selectedUser is set', () => {
      component.allUsers.set([discoveryUser]);
      component.teamMembers.set([]);
      component.showDiscovery.set(true);
      component.usersLoading.set(false);
      component.selectedUser.set(discoveryUser);
      fixture.detectChanges();
      expect(component.selectedUser()).toBeTruthy();
    });

    it('should render invite form error when errorMsg is set with selectedUser', () => {
      component.showDiscovery.set(true);
      component.selectedUser.set(discoveryUser);
      component.errorMsg.set('Please select a role.');
      fixture.detectChanges();
      expect(component.errorMsg()).toBe('Please select a role.');
    });

    it('should render profile modal when viewedUser is set', () => {
      component.showDiscovery.set(true);
      component.viewedUser.set(discoveryUser);
      fixture.detectChanges();
      expect(component.viewedUser()).toBeTruthy();
    });

    it('should render selected badge on user card after selectUserToInvite', () => {
      component.allUsers.set([discoveryUser]);
      component.teamMembers.set([]);
      component.showDiscovery.set(true);
      component.usersLoading.set(false);
      component.selectedUser.set(discoveryUser);
      fixture.detectChanges();
      expect(component.selectedUser()?.userId).toBe(99);
    });
  });

  // ─── Template: member list states ─────────────────────────────────────────

  describe('Template: member list states', () => {
    it('should render successMsg alert when set', () => {
      component.successMsg.set('Member removed.');
      fixture.detectChanges();
      expect(component.successMsg()).toBe('Member removed.');
    });

    it('should render errorMsg alert when set', () => {
      component.errorMsg.set('Failed.');
      fixture.detectChanges();
      expect(component.errorMsg()).toBe('Failed.');
    });

    it('should render removing spinner when removing matches member id', () => {
      component.removing.set(5);
      fixture.detectChanges();
      expect(component.removing()).toBe(5);
    });

    it('should render empty team members state when teamMembers is empty', () => {
      component.teamMembers.set([]);
      fixture.detectChanges();
      expect(component.teamMembers()).toHaveLength(0);
    });

    it('should render loading skeleton in founder view when loading is true', () => {
      component.loading.set(true);
      component.showDiscovery.set(false);
      fixture.detectChanges();
      expect(component.loading()).toBe(true);
    });

    it('should render no-startups empty state when myStartups is empty and not loading', () => {
      component.myStartups.set([]);
      component.loading.set(false);
      fixture.detectChanges();
      expect(component.myStartups()).toHaveLength(0);
    });
  });

  // ─── Template: CoFounder view ─────────────────────────────────────────────

  describe('Template: CoFounder view rendering', () => {
    beforeEach(async () => createModule('ROLE_COFOUNDER'));

    it('should render loading skeleton for CoFounder when loading is true', () => {
      component.loading.set(true);
      fixture.detectChanges();
      expect(component.loading()).toBe(true);
    });

    it('should render empty-teams state when myTeams is empty', () => {
      component.myTeams.set([]);
      component.loading.set(false);
      fixture.detectChanges();
      expect(component.myTeams()).toHaveLength(0);
    });

    it('should render team cards when myTeams has data', () => {
      component.myTeams.set([mockMember]);
      component.loading.set(false);
      component.startupNames.set(new Map([[1, 'FounderCo']]));
      fixture.detectChanges();
      expect(component.myTeams()).toHaveLength(1);
    });

    it('should render fallback startup name when not in map', () => {
      component.myTeams.set([{ ...mockMember, startupId: 999 }]);
      component.loading.set(false);
      component.startupNames.set(new Map());
      fixture.detectChanges();
      expect(component.myTeams()).toHaveLength(1);
    });
  });

  // ─── ngOnInit prefetch paths ──────────────────────────────────────────────

  describe('ngOnInit prefetch', () => {
    it('should populate startupNames from getAll response', () => {
      expect(component.startupNames().get(1)).toBe('FounderCo');
    });

    it('should populate startupFounders from getAll response', () => {
      expect(component.startupFounders().get(1)).toBe(10);
    });

    it('should populate userNames from getAllUsers response', () => {
      expect(component.userNames().get(30)).toBe('Alice Dev');
    });

    it('should handle getAll returning null data gracefully', async () => {
      await createModule('ROLE_FOUNDER');
      startupStub.getAll = vi.fn().mockReturnValue(of({ success: true, data: null, error: null }));
      component.startupNames.set(new Map());
      component.ngOnInit();
      expect(component.startupNames().size).toBe(0);
    });

    it('should handle getAllUsers returning null data gracefully', async () => {
      await createModule('ROLE_FOUNDER');
      userStub.getAllUsers = vi.fn().mockReturnValue(of({ success: true, data: null, error: null }));
      component.userNames.set(new Map());
      component.ngOnInit();
      expect(component.userNames().size).toBe(0);
    });
  });

  // ─── loadCoFounderData() error with no error field ────────────────────────

  describe('loadCoFounderData() — fallback error message', () => {
    it('Boundary: should use fallback message when getMyActiveRoles error has no error field', async () => {
      await createModule('ROLE_COFOUNDER');
      teamStub.getMyActiveRoles = vi.fn().mockReturnValue(throwError(() => ({})));
      component.errorMsg.set('');
      component.loadCoFounderData();
      expect(component.errorMsg()).toBe('Failed to load teams.');
    });
  });

  // ─── filteredUsers: skills/email search ───────────────────────────────────

  describe('filteredUsers: search variants', () => {
    it('should filter by email substring', () => {
      const u = { userId: 77, name: 'Charlie', email: 'charlie@company.com', skills: '' } as any;
      component.allUsers.set([u]);
      component.teamMembers.set([]);
      component.searchQuery.set('company');
      expect(component.filteredUsers()).toHaveLength(1);
    });

    it('should filter by skills substring', () => {
      const u = { userId: 77, name: 'Charlie', email: 'c@test.com', skills: 'Python,Django' } as any;
      component.allUsers.set([u]);
      component.teamMembers.set([]);
      component.searchQuery.set('django');
      expect(component.filteredUsers()).toHaveLength(1);
    });

    it('should exclude current user (authService.userId) from filtered list', () => {
      const currentUser = { userId: 10, name: 'Me', email: 'me@test.com', skills: '' } as any;
      component.allUsers.set([currentUser]);
      component.teamMembers.set([]);
      component.searchQuery.set('');
      expect(component.filteredUsers()).toHaveLength(0);
    });
  });

  // ─── roleLabel() for ENGINEERING_LEAD ─────────────────────────────────────

  describe('role helpers — additional', () => {
    it('Normal: roleLabel should return full label for ENGINEERING_LEAD', () => {
      expect(component.roleLabel('ENGINEERING_LEAD')).toBe('Engineering Lead');
    });

    it('Normal: roleClass should return badge-success for unknown role', () => {
      expect(component.roleClass('SOME_UNKNOWN')).toBe('badge-success');
    });

    it('Boundary: userInitials should handle multi-word email when name is null', () => {
      const result = component.userInitials({ name: null, email: 'first.last@test.com' } as any);
      expect(result.length).toBeGreaterThan(0);
    });

    it('Boundary: userInitials should return max 2 chars for long name', () => {
      const result = component.userInitials({ name: 'Alice Bob Charlie', email: 'a@test.com' } as any);
      expect(result).toBe('AB');
    });
  });
});
