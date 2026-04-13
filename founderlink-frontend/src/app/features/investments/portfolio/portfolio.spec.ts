import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter, Router } from '@angular/router';

import { PortfolioComponent } from './portfolio';
import { AuthService } from '../../../core/services/auth.service';
import { InvestmentService } from '../../../core/services/investment.service';
import { StartupService } from '../../../core/services/startup.service';

const mockStartup = { id: 1, name: 'StartupAlpha', founderId: 10 } as any;
const inv1 = { id: 1, startupId: 1, investorId: 20, amount: 5000, status: 'COMPLETED' } as any;
const inv2 = { id: 2, startupId: 1, investorId: 20, amount: 3000, status: 'PENDING' } as any;
const inv3 = { id: 3, startupId: 1, investorId: 20, amount: 2000, status: 'APPROVED' } as any;

describe('PortfolioComponent', () => {
  let fixture: ComponentFixture<PortfolioComponent>;
  let component: PortfolioComponent;
  let authStub: Partial<AuthService>;
  let investStub: Partial<InvestmentService>;
  let startupStub: Partial<StartupService>;
  let router: Router;

  beforeEach(async () => {
    authStub = { userId: vi.fn().mockReturnValue(20) as any };
    investStub = {
      getMyPortfolio: vi.fn().mockReturnValue(of({ success: true, data: [inv1, inv2, inv3], error: null }))
    };
    startupStub = {
      getAll: vi.fn().mockReturnValue(of({ success: true, data: [mockStartup], error: null }))
    };

    await TestBed.configureTestingModule({
      imports: [PortfolioComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: InvestmentService, useValue: investStub },
        { provide: StartupService, useValue: startupStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  // ─── ngOnInit ─────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should load portfolio and populate all investments', () => {
      expect(investStub.getMyPortfolio).toHaveBeenCalled();
      expect(component['allInvestments']()).toHaveLength(3);
    });

    it('Boundary: should build startupNames map from getAll response', () => {
      expect(component.startupNames().get(1)).toBe('StartupAlpha');
    });

    it('Exception: should set errorMsg when getMyPortfolio fails', async () => {
      investStub.getMyPortfolio = vi.fn().mockReturnValue(throwError(() => ({ error: 'Access denied' })));
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [PortfolioComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: InvestmentService, useValue: investStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(PortfolioComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toBe('Access denied');
    });
  });

  // ─── stats computed properties ────────────────────────────────────────────

  describe('stats computed properties', () => {
    it('Normal: totalInvested should sum all investment amounts', () => {
      expect(component.totalInvested).toBe(10000); // 5000+3000+2000
    });

    it('Boundary: completedAmount should only sum COMPLETED investments', () => {
      expect(component.completedAmount).toBe(5000);
    });

    it('Exception: pendingAmount should be 0 when all are non-PENDING', () => {
      component['allInvestments'].set([inv1, inv3]);
      expect(component.pendingAmount).toBe(0);
    });
  });

  // ─── filtering ────────────────────────────────────────────────────────────

  describe('filtered investments', () => {
    it('Normal: should return all investments when no filter is set', () => {
      component.filterStatus = '';
      expect(component.filtered).toHaveLength(3);
    });

    it('Boundary: should filter to only COMPLETED when filterStatus = COMPLETED', () => {
      component.filterStatus = 'COMPLETED';
      expect(component.filtered).toHaveLength(1);
      expect(component.filtered[0].status).toBe('COMPLETED');
    });

    it('Exception: should return empty when filter matches nothing', () => {
      component.filterStatus = 'STARTUP_CLOSED';
      expect(component.filtered).toHaveLength(0);
    });
  });

  // ─── pagination ───────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('Normal: pagedInvestments should return first 10 on page 0', () => {
      expect(component.pagedInvestments).toHaveLength(3); // only 3 items total
    });

    it('Boundary: onFilterChange should reset currentPage to 0', () => {
      component.currentPage.set(2);
      component.onFilterChange();
      expect(component.currentPage()).toBe(0);
    });

    it('Exception: goToPage with page >= totalPages should be ignored', () => {
      component.goToPage(999);
      expect(component.currentPage()).toBe(0);
    });
  });

  // ─── messageFounder ───────────────────────────────────────────────────────

  describe('messageFounder()', () => {
    it('Normal: should navigate to messages with correct founder user id', () => {
      component.messageFounder(1);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: 10 } }
      );
    });

    it('Boundary: should not navigate when startupId has no founder mapping', () => {
      component.messageFounder(9999);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('Exception: founderIds map should store founderId=10 for startupId=1', () => {
      expect(component.founderIds().get(1)).toBe(10);
    });
  });

  // ─── approvedAmount ───────────────────────────────────────────────────────

  describe('approvedAmount', () => {
    it('Normal: should sum only APPROVED investment amounts', () => {
      expect(component.approvedAmount).toBe(2000);
    });

    it('Boundary: should be 0 when no APPROVED investments exist', () => {
      component['allInvestments'].set([inv1, inv2]);
      expect(component.approvedAmount).toBe(0);
    });

    it('Exception: should sum all APPROVED amounts correctly', () => {
      const extra = { ...inv3, id: 4, amount: 1500 };
      component['allInvestments'].set([inv1, inv3, extra]);
      expect(component.approvedAmount).toBe(3500);
    });
  });

  // ─── nextPage() / prevPage() ──────────────────────────────────────────────

  describe('nextPage() / prevPage()', () => {
    beforeEach(() => {
      const manyInvs = Array.from({ length: 12 }, (_, i) =>
        ({ ...inv1, id: i + 1, amount: 100 })
      );
      component['allInvestments'].set(manyInvs);
    });

    it('Normal: nextPage should advance currentPage to 1', () => {
      expect(component.totalPages).toBe(2);
      component.nextPage();
      expect(component.currentPage()).toBe(1);
    });

    it('Boundary: prevPage from page 1 should go back to 0', () => {
      component.currentPage.set(1);
      component.prevPage();
      expect(component.currentPage()).toBe(0);
    });

    it('Exception: prevPage from page 0 should not go below 0', () => {
      component.prevPage();
      expect(component.currentPage()).toBe(0);
    });

    it('Exception: nextPage beyond last page should not advance', () => {
      component.currentPage.set(1);
      component.nextPage();
      expect(component.currentPage()).toBe(1);
    });
  });

  // ─── pageNumbers getter ───────────────────────────────────────────────────

  describe('pageNumbers getter', () => {
    it('Normal: should return range centered on current page', () => {
      const manyInvs = Array.from({ length: 60 }, (_, i) => ({ ...inv1, id: i + 1 }));
      component['allInvestments'].set(manyInvs);
      component.currentPage.set(3);
      const nums = component.pageNumbers;
      expect(nums).toContain(3);
      expect(nums.length).toBeGreaterThan(1);
    });

    it('Boundary: should return empty array when no investments', () => {
      component['allInvestments'].set([]);
      expect(component.pageNumbers).toHaveLength(0);
    });

    it('Boundary: should not exceed totalPages - 1', () => {
      const manyInvs = Array.from({ length: 30 }, (_, i) => ({ ...inv1, id: i + 1 }));
      component['allInvestments'].set(manyInvs);
      component.currentPage.set(2);
      const nums = component.pageNumbers;
      expect(Math.max(...nums)).toBeLessThan(component.totalPages);
    });
  });

  // ─── statusLabel() / statusClass() ───────────────────────────────────────

  describe('statusLabel() / statusClass()', () => {
    it('Normal: statusLabel should return readable label for each status', () => {
      expect(component.statusLabel('PENDING' as any)).toBe('Pending Review');
      expect(component.statusLabel('APPROVED' as any)).toBe('Approved');
      expect(component.statusLabel('COMPLETED' as any)).toBe('Completed');
      expect(component.statusLabel('REJECTED' as any)).toBe('Rejected');
      expect(component.statusLabel('PAYMENT_FAILED' as any)).toBe('Payment Failed');
      expect(component.statusLabel('STARTUP_CLOSED' as any)).toBe('Startup Closed');
    });

    it('Boundary: statusClass should return badge-success for APPROVED', () => {
      expect(component.statusClass('APPROVED')).toBe('badge-success');
    });

    it('Boundary: statusClass should return correct class for each status', () => {
      expect(component.statusClass('PENDING')).toBe('badge-warning');
      expect(component.statusClass('COMPLETED')).toBe('badge-info');
      expect(component.statusClass('STARTUP_CLOSED')).toBe('badge-gray');
      expect(component.statusClass('REJECTED')).toBe('badge-danger');
      expect(component.statusClass('PAYMENT_FAILED')).toBe('badge-danger');
    });
  });

  // ─── formatCurrency() ────────────────────────────────────────────────────

  describe('formatCurrency()', () => {
    it('Normal: should format amount as INR currency', () => {
      const result = component.formatCurrency(5000);
      expect(result).toContain('5,000');
    });

    it('Boundary: should format 0 correctly', () => {
      const result = component.formatCurrency(0);
      expect(result).toContain('0');
    });

    it('Exception: should format large amounts with commas', () => {
      const result = component.formatCurrency(1000000);
      expect(result).toContain('10,00,000');
    });
  });

  // ─── startupService.getAll() edge cases ──────────────────────────────────

  describe('startupService.getAll() edge cases', () => {
    it('Exception: should handle getAll returning null data gracefully', async () => {
      startupStub.getAll = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [PortfolioComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: InvestmentService, useValue: investStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(PortfolioComponent);
      f.detectChanges();
      expect(f.componentInstance.startupNames().size).toBe(0);
    });
  });

  // ─── getMyPortfolio() error fallback ──────────────────────────────────────

  describe('getMyPortfolio() error fallback', () => {
    it('Exception: should use default errorMsg when error has no error property', async () => {
      investStub.getMyPortfolio = vi.fn().mockReturnValue(throwError(() => ({})));
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [PortfolioComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: InvestmentService, useValue: investStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(PortfolioComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toBe('Failed to load portfolio.');
      expect(f.componentInstance.loading()).toBe(false);
    });

    it('Boundary: should set allInvestments to empty array when data is null', async () => {
      investStub.getMyPortfolio = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [PortfolioComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: InvestmentService, useValue: investStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(PortfolioComponent);
      f.detectChanges();
      expect(f.componentInstance['allInvestments']()).toHaveLength(0);
      expect(f.componentInstance.totalInvested).toBe(0);
    });
  });

  // ─── goToPage() valid page ────────────────────────────────────────────────

  describe('goToPage() valid page', () => {
    beforeEach(() => {
      const manyInvs = Array.from({ length: 25 }, (_, i) => ({ ...inv1, id: i + 1, amount: 100 }));
      component['allInvestments'].set(manyInvs);
    });

    it('Normal: should navigate directly to page 1 via goToPage', () => {
      expect(component.totalPages).toBe(3);
      component.goToPage(1);
      expect(component.currentPage()).toBe(1);
    });

    it('Boundary: pagedInvestments on page 1 should return items 10-19', () => {
      component.goToPage(1);
      expect(component.pagedInvestments).toHaveLength(10);
    });

    it('Exception: goToPage(-1) should not change currentPage', () => {
      component.currentPage.set(1);
      component.goToPage(-1);
      expect(component.currentPage()).toBe(1);
    });
  });

  // ─── filterStatus + onFilterChange edge cases ─────────────────────────────

  describe('filterStatus + onFilterChange edge cases', () => {
    it('Normal: approvedAmount should correctly compute with null filterStatus', () => {
      component.filterStatus = '';
      component.onFilterChange();
      expect(component.currentPage()).toBe(0);
      expect(component.approvedAmount).toBe(2000);
    });

    it('Boundary: filtered with PAYMENT_FAILED status should return matching items', () => {
      const failedInv = { ...inv1, id: 4, status: 'PAYMENT_FAILED' };
      component['allInvestments'].set([inv1, inv2, failedInv]);
      component.filterStatus = 'PAYMENT_FAILED';
      expect(component.filtered).toHaveLength(1);
    });

    it('Exception: totalPages should be 0 when no investments', () => {
      component['allInvestments'].set([]);
      expect(component.totalPages).toBe(0);
      expect(component.pageNumbers).toHaveLength(0);
    });
  });
});
