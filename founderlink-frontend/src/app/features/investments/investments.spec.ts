import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';

import { InvestmentsComponent } from './investments';
import { AuthService } from '../../core/services/auth.service';
import { InvestmentService } from '../../core/services/investment.service';
import { StartupService } from '../../core/services/startup.service';
import { UserService } from '../../core/services/user.service';

const mockStartup = { id: 1, name: 'TechCo', founderId: 10 } as any;
const mockInvestment = { id: 11, startupId: 1, investorId: 20, amount: 10000, status: 'PENDING' } as any;
const mockApprovedInvestment = { ...mockInvestment, id: 12, status: 'APPROVED' };

describe('InvestmentsComponent', () => {
  let fixture: ComponentFixture<InvestmentsComponent>;
  let component: InvestmentsComponent;
  let authStub: Partial<AuthService>;
  let investStub: Partial<InvestmentService>;
  let startupStub: Partial<StartupService>;
  let userStub: Partial<UserService>;
  let router: Router;

  beforeEach(async () => {
    authStub = { role: vi.fn().mockReturnValue('ROLE_FOUNDER') as any };
    startupStub = {
      getMyStartups: vi.fn().mockReturnValue(of({ success: true, data: [mockStartup], error: null }))
    };
    investStub = {
      getStartupInvestments: vi.fn().mockReturnValue(
        of({ success: true, data: [mockInvestment, mockApprovedInvestment], error: null })
      ),
      updateStatus: vi.fn().mockReturnValue(
        of({ success: true, data: { ...mockInvestment, status: 'APPROVED' }, error: null })
      )
    };
    userStub = {
      getAllUsers: vi.fn().mockReturnValue(of({ success: true, data: [], error: null }))
    };

    await TestBed.configureTestingModule({
      imports: [InvestmentsComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: InvestmentService, useValue: investStub },
        { provide: StartupService, useValue: startupStub },
        { provide: UserService, useValue: userStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(InvestmentsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  // ─── ngOnInit ─────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should load first startup and its investments on init', () => {
      expect(startupStub.getMyStartups).toHaveBeenCalled();
      expect(investStub.getStartupInvestments).toHaveBeenCalledWith(1);
      expect(component.investments()).toHaveLength(2);
    });

    it('Boundary: should not call getStartupInvestments when founder has no startups', async () => {
      startupStub.getMyStartups = vi.fn().mockReturnValue(of({ success: true, data: [], error: null }));
      investStub.getStartupInvestments = vi.fn().mockReturnValue(of({ success: true, data: [], error: null }));
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [InvestmentsComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: authStub },
          { provide: InvestmentService, useValue: investStub },
          { provide: StartupService, useValue: startupStub },
          { provide: UserService, useValue: userStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(InvestmentsComponent);
      f.detectChanges();
      expect(investStub.getStartupInvestments).not.toHaveBeenCalled();
      expect(f.componentInstance.loading()).toBe(false);
    });

    it('Exception: should set loading false when getMyStartups fails', async () => {
      startupStub.getMyStartups = vi.fn().mockReturnValue(throwError(() => new Error('fail')));
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [InvestmentsComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: authStub },
          { provide: InvestmentService, useValue: investStub },
          { provide: StartupService, useValue: startupStub },
          { provide: UserService, useValue: userStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(InvestmentsComponent);
      f.detectChanges();
      expect(f.componentInstance.loading()).toBe(false);
    });
  });

  // ─── updateStatus() ──────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('Normal: should call investmentService.updateStatus and update the list', () => {
      vi.useFakeTimers();
      component.updateStatus(11, 'APPROVED');
      vi.advanceTimersByTime(3000);
      expect(investStub.updateStatus).toHaveBeenCalledWith(11, { status: 'APPROVED' });
      const updated = component.investments().find(i => i.id === 11);
      expect(updated?.status).toBe('APPROVED');
      vi.useRealTimers();
    });

    it('Boundary: should set successMsg to "Investment approved successfully."', () => {
      vi.useFakeTimers();
      component.updateStatus(11, 'APPROVED');
      expect(component.successMsg()).toContain('approved');
      vi.advanceTimersByTime(3000);
      vi.useRealTimers();
    });

    it('Exception: should set errorMsg and clear updating when updateStatus fails', () => {
      investStub.updateStatus = vi.fn().mockReturnValue(
        throwError(() => ({ error: 'Cannot approve at this stage' }))
      );
      component.updateStatus(11, 'APPROVED');
      expect(component.errorMsg()).toBe('Cannot approve at this stage');
      expect(component.updating()).toBeNull();
    });
  });

  // ─── filteredInvestments computed ─────────────────────────────────────────

  describe('filteredInvestments', () => {
    it('Normal: should return all investments when filterStatus is empty', () => {
      component.filterStatus = '';
      expect(component.filteredInvestments).toHaveLength(2);
    });

    it('Boundary: should return only PENDING investments when filterStatus is PENDING', () => {
      component.filterStatus = 'PENDING';
      expect(component.filteredInvestments).toHaveLength(1);
      expect(component.filteredInvestments[0].status).toBe('PENDING');
    });

    it('Exception: should return empty array when filterStatus matches no investment', () => {
      component.filterStatus = 'COMPLETED';
      expect(component.filteredInvestments).toHaveLength(0);
    });
  });

  // ─── computed stats ───────────────────────────────────────────────────────

  describe('computed stats', () => {
    it('Normal: totalAmount should sum all investment amounts', () => {
      expect(component.totalAmount).toBe(20000);
    });

    it('Boundary: pendingCount should count only PENDING investments', () => {
      expect(component.pendingCount).toBe(1);
    });

    it('Exception: approvedCount should be correct when no approved investments exist', () => {
      component.investments.set([mockInvestment]);
      expect(component.approvedCount).toBe(0);
    });
  });

  // ─── completedCount ───────────────────────────────────────────────────────

  describe('completedCount', () => {
    it('Normal: should count COMPLETED investments', () => {
      component.investments.set([
        { ...mockInvestment, status: 'COMPLETED' },
        mockInvestment
      ]);
      expect(component.completedCount).toBe(1);
    });

    it('Boundary: should return 0 when no COMPLETED investments', () => {
      expect(component.completedCount).toBe(0);
    });
  });

  // ─── statusClass() / statusLabel() ───────────────────────────────────────

  describe('statusClass() / statusLabel()', () => {
    it('Normal: statusClass should return badge-success for APPROVED', () => {
      expect(component.statusClass('APPROVED')).toBe('badge-success');
    });

    it('Boundary: statusClass should return correct badge for each status', () => {
      expect(component.statusClass('PENDING')).toBe('badge-warning');
      expect(component.statusClass('COMPLETED')).toBe('badge-info');
      expect(component.statusClass('STARTUP_CLOSED')).toBe('badge-gray');
      expect(component.statusClass('REJECTED')).toBe('badge-danger');
      expect(component.statusClass('PAYMENT_FAILED')).toBe('badge-danger');
    });

    it('Normal: statusLabel should return readable text for each status', () => {
      expect(component.statusLabel('PENDING' as any)).toBe('Pending Review');
      expect(component.statusLabel('APPROVED' as any)).toBe('Approved');
      expect(component.statusLabel('COMPLETED' as any)).toBe('Completed');
      expect(component.statusLabel('REJECTED' as any)).toBe('Rejected');
      expect(component.statusLabel('PAYMENT_FAILED' as any)).toBe('Payment Failed');
      expect(component.statusLabel('STARTUP_CLOSED' as any)).toBe('Startup Closed');
    });
  });

  // ─── formatCurrency() ────────────────────────────────────────────────────

  describe('formatCurrency()', () => {
    it('Normal: should format amount as INR currency string', () => {
      const result = component.formatCurrency(10000);
      expect(result).toContain('10,000');
    });

    it('Boundary: should format 0 without decimal digits', () => {
      const result = component.formatCurrency(0);
      expect(result).toContain('0');
    });
  });

  // ─── messageInvestor() ────────────────────────────────────────────────────

  describe('messageInvestor()', () => {
    it('Normal: should navigate to messages with investor user id', () => {
      component.messageInvestor(20);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: 20 } }
      );
    });

    it('Boundary: should navigate even for investorId = 0', () => {
      component.messageInvestor(0);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: 0 } }
      );
    });
  });

  // ─── loadInvestments() error path ────────────────────────────────────────

  describe('loadInvestments() error', () => {
    it('Exception: should set errorMsg and stop loading when getStartupInvestments fails', () => {
      investStub.getStartupInvestments = vi.fn().mockReturnValue(
        throwError(() => ({ error: 'Investment fetch failed' }))
      );
      component.loadInvestments(1);
      expect(component.errorMsg()).toBe('Investment fetch failed');
      expect(component.loading()).toBe(false);
    });

    it('Boundary: should use fallback message when error has no error field', () => {
      investStub.getStartupInvestments = vi.fn().mockReturnValue(
        throwError(() => ({}))
      );
      component.loadInvestments(1);
      expect(component.errorMsg()).toBe('Failed to load investments.');
    });
  });

  // ─── onStartupChange() ───────────────────────────────────────────────────

  describe('onStartupChange()', () => {
    it('Normal: should update selectedStartupId and load new investments', () => {
      component.onStartupChange(2);
      expect(component.selectedStartupId()).toBe(2);
      expect(investStub.getStartupInvestments).toHaveBeenCalledWith(2);
    });
  });
});
