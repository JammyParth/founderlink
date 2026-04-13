import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { HomeComponent } from './home';
import { AuthService } from '../../../core/services/auth.service';
import { StartupService } from '../../../core/services/startup.service';
import { InvestmentService } from '../../../core/services/investment.service';
import { TeamService } from '../../../core/services/team.service';
import { UserService } from '../../../core/services/user.service';

const mockStartup = { id: 1, name: 'StartupX', founderId: 10, fundingGoal: 100000 } as any;
const mockInvestment = { id: 1, startupId: 1, investorId: 20, amount: 5000, status: 'APPROVED' } as any;
const mockInvitation = { id: 1, startupId: 1, invitedUserId: 30, status: 'PENDING', role: 'CTO' } as any;
const mockUser = { userId: 20, name: 'Investor Joe', email: 'joe@test.com' } as any;

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let authStub: Partial<AuthService>;
  let startupStub: Partial<StartupService>;
  let investStub: Partial<InvestmentService>;
  let teamStub: Partial<TeamService>;
  let userStub: Partial<UserService>;

  const setup = async (role: string, overrides: { getMyStartups?: any; getMyPortfolio?: any; getMyInvitations?: any } = {}) => {
    authStub = {
      role: vi.fn().mockReturnValue(role) as any,
      userId: vi.fn().mockReturnValue(10) as any,
      email: vi.fn().mockReturnValue('test@test.com') as any
    };
    startupStub = {
      getMyStartups: overrides.getMyStartups ?? vi.fn().mockReturnValue(of({ success: true, data: [mockStartup], error: null })),
      getAll: vi.fn().mockReturnValue(of({ success: true, data: [mockStartup], error: null }))
    };
    investStub = {
      getMyPortfolio: overrides.getMyPortfolio ?? vi.fn().mockReturnValue(of({ success: true, data: [mockInvestment], error: null })),
      getStartupInvestments: vi.fn().mockReturnValue(of({ success: true, data: [mockInvestment], error: null }))
    };
    teamStub = {
      getMyInvitations: overrides.getMyInvitations ?? vi.fn().mockReturnValue(of({ success: true, data: [mockInvitation], error: null }))
    };
    userStub = {
      getAllUsers: vi.fn().mockReturnValue(of({ success: true, data: [mockUser], error: null }))
    };

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: StartupService, useValue: startupStub },
        { provide: InvestmentService, useValue: investStub },
        { provide: TeamService, useValue: teamStub },
        { provide: UserService, useValue: userStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  // ─── FOUNDER ──────────────────────────────────────────────────────────────

  describe('FOUNDER role', () => {
    beforeEach(async () => setup('ROLE_FOUNDER'));

    it('Normal: should load founder startup data and set myStartups signal', () => {
      expect(startupStub.getMyStartups).toHaveBeenCalled();
      expect(component.myStartups()).toHaveLength(1);
      expect(component.myStartups()[0].name).toBe('StartupX');
    });

    it('Boundary: should load startup investments for the first startup when at least one exists', () => {
      expect(investStub.getStartupInvestments).toHaveBeenCalledWith(1);
      expect(component.startupInvestments()).toHaveLength(1);
    });

    it('Exception: should set myStartups to [] when getMyStartups fails', async () => {
      await setup('ROLE_FOUNDER', { getMyStartups: vi.fn().mockReturnValue(throwError(() => ({ error: 'Service unavailable' }))) });
      expect(component.myStartups()).toEqual([]);
      expect(component.loading()).toBe(false);
    });
  });

  // ─── INVESTOR ─────────────────────────────────────────────────────────────

  describe('INVESTOR role', () => {
    beforeEach(async () => setup('ROLE_INVESTOR'));

    it('Normal: should load investor portfolio data', () => {
      expect(investStub.getMyPortfolio).toHaveBeenCalled();
      expect(component.myInvestments()).toHaveLength(1);
    });

    it('Boundary: should compute totalInvested as sum of all investment amounts', () => {
      expect(component.totalInvested).toBe(5000);
    });

    it('Exception: should set myInvestments to [] when getMyPortfolio fails', async () => {
      await setup('ROLE_INVESTOR', { getMyPortfolio: vi.fn().mockReturnValue(throwError(() => ({ error: 'fail' }))) });
      expect(component.myInvestments()).toEqual([]);
    });
  });

  // ─── COFOUNDER ────────────────────────────────────────────────────────────

  describe('COFOUNDER role', () => {
    beforeEach(async () => setup('ROLE_COFOUNDER'));

    it('Normal: should load cofounder invitations on init', () => {
      expect(teamStub.getMyInvitations).toHaveBeenCalled();
      expect(component.myInvitations()).toHaveLength(1);
    });

    it('Boundary: should return only PENDING invitations from pendingInvitations getter', () => {
      expect(component.pendingInvitations).toHaveLength(1);
      expect(component.pendingInvitations[0].status).toBe('PENDING');
    });

    it('Exception: should set myInvitations to [] when getMyInvitations fails', async () => {
      await setup('ROLE_COFOUNDER', { getMyInvitations: vi.fn().mockReturnValue(throwError(() => ({ error: 'fail' }))) });
      expect(component.myInvitations()).toEqual([]);
    });
  });

  // ─── helper methods ───────────────────────────────────────────────────────

  describe('helper methods', () => {
    beforeEach(async () => setup('ROLE_INVESTOR'));

    it('Normal: getStatusClass should return "badge-success" for APPROVED status', () => {
      expect(component.getStatusClass('APPROVED')).toBe('badge-success');
    });

    it('Boundary: getStatusClass should return "badge-gray" for unknown status strings', () => {
      expect(component.getStatusClass('UNKNOWN_STATUS')).toBe('badge-gray');
    });

    it('Exception: formatCurrency should correctly format a large Indian currency value', () => {
      const result = component.formatCurrency(100000);
      expect(result).toContain('1,00,000');
    });
  });
});
