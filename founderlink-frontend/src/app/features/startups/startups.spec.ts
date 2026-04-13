import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { StartupsComponent } from './startups';
import { AuthService } from '../../core/services/auth.service';
import { StartupService } from '../../core/services/startup.service';
import { InvestmentService } from '../../core/services/investment.service';

const mockStartup = {
  id: 1, name: 'TechCo', description: 'A great startup', industry: 'Technology',
  stage: 'MVP', fundingGoal: 500000, founderId: 10
} as any;

const mockPaged = {
  content: [mockStartup], page: 0, totalPages: 3, totalElements: 27, size: 9, last: false
};

describe('StartupsComponent', () => {
  let fixture: ComponentFixture<StartupsComponent>;
  let component: StartupsComponent;
  let authStub: Partial<AuthService>;
  let startupStub: Partial<StartupService>;
  let investStub: Partial<InvestmentService>;
  let router: Router;

  beforeEach(async () => {
    authStub = {
      role: vi.fn().mockReturnValue('ROLE_INVESTOR') as any,
      userId: vi.fn().mockReturnValue(20) as any
    };
    startupStub = {
      getPaged: vi.fn().mockReturnValue(of({ success: true, data: mockPaged, error: null })),
      searchPaged: vi.fn().mockReturnValue(of({ success: true, data: mockPaged, error: null }))
    };
    investStub = {
      create: vi.fn().mockReturnValue(of({ success: true, data: null, error: null }))
    };

    await TestBed.configureTestingModule({
      imports: [StartupsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: StartupService, useValue: startupStub },
        { provide: InvestmentService, useValue: investStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StartupsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  // ─── ngOnInit / loadPage ──────────────────────────────────────────────────

  describe('ngOnInit() / loadPage()', () => {
    it('Normal: should call getPaged on init and populate allStartups', () => {
      expect(startupStub.getPaged).toHaveBeenCalledWith(0, 9);
      expect(component.allStartups()).toHaveLength(1);
      expect(component.allStartups()[0].name).toBe('TechCo');
    });

    it('Boundary: should set totalPages and currentPage based on response', () => {
      expect(component.totalPages()).toBe(3);
      expect(component.currentPage()).toBe(0);
      expect(component.totalElements()).toBe(27);
    });

    it('Exception: should set errorMsg and stop loading when getPaged fails', async () => {
      startupStub.getPaged = vi.fn().mockReturnValue(throwError(() => ({ error: 'Server error' })));
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [StartupsComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub },
          { provide: InvestmentService, useValue: investStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(StartupsComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toBeTruthy();
      expect(f.componentInstance.loading()).toBe(false);
    });
  });

  // ─── pagination ───────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('Normal: should call loadPage with page+1 when nextPage() is called', () => {
      component.nextPage();
      expect(startupStub.getPaged).toHaveBeenCalledWith(1, 9);
    });

    it('Boundary: should not call loadPage when goToPage is called with page >= totalPages', () => {
      const callCount = (startupStub.getPaged as any).mock.calls.length;
      component.goToPage(3); // totalPages is 3, so page 3 is out of range
      expect((startupStub.getPaged as any).mock.calls.length).toBe(callCount);
    });

    it('Exception: should not navigate to negative page (-1)', () => {
      const callCount = (startupStub.getPaged as any).mock.calls.length;
      component.prevPage(); // currentPage is 0, can't go below
      expect((startupStub.getPaged as any).mock.calls.length).toBe(callCount);
    });
  });

  // ─── search filter ────────────────────────────────────────────────────────

  describe('applyNameFilter()', () => {
    it('Normal: should filter startups by name substring', () => {
      component.searchQuery = 'tech';
      component.applyNameFilter();
      expect(component.allStartups()).toHaveLength(1);
    });

    it('Boundary: should return all startups when searchQuery is empty string', () => {
      component.searchQuery = '';
      component.applyNameFilter();
      expect(component.allStartups()).toHaveLength(1);
    });

    it('Exception: should return empty array when no startup matches query', () => {
      component.searchQuery = 'ZZZNOMATCH_XYZXYZ';
      component.applyNameFilter();
      expect(component.allStartups()).toHaveLength(0);
    });
  });

  // ─── invest modal ─────────────────────────────────────────────────────────

  describe('submitInvestment()', () => {
    beforeEach(() => component.openInvestModal(mockStartup));

    it('Normal: should call investmentService.create and show success message', () => {
      component.investAmount = 5000;
      component.submitInvestment();
      expect(investStub.create).toHaveBeenCalledWith({ startupId: 1, amount: 5000 });
    });

    it('Boundary: should reject investment when amount is exactly 999 (below ₹1000 minimum)', () => {
      component.investAmount = 999;
      component.submitInvestment();
      expect(investStub.create).not.toHaveBeenCalled();
      expect(component.investError()).toContain('Minimum investment');
    });

    it('Exception: should set investError when create fails', () => {
      investStub.create = vi.fn().mockReturnValue(throwError(() => ({ error: 'Duplicate investment' })));
      component.investAmount = 10000;
      component.submitInvestment();
      expect(component.investError()).toBe('Duplicate investment');
    });
  });

  // ─── role helpers ─────────────────────────────────────────────────────────

  describe('role helpers', () => {
    it('Normal: isInvestor should return true for ROLE_INVESTOR', () => {
      expect(component.isInvestor).toBe(true);
    });

    it('Boundary: isFounder should return false for ROLE_INVESTOR', () => {
      expect(component.isFounder).toBe(false);
    });

    it('Exception: clearFilters should reset all filter fields and reload page 0', () => {
      component.searchQuery = 'abc';
      component.selectedStage = 'MVP';
      component.clearFilters();
      expect(component.searchQuery).toBe('');
      expect(component.selectedStage).toBe('');
      expect(startupStub.getPaged).toHaveBeenCalledWith(0, 9);
    });
  });

  // ─── server-side filters (applyFilters / searchPaged) ─────────────────────

  describe('applyFilters() with server-side filters', () => {
    it('Normal: should call searchPaged when selectedStage is set', () => {
      component.selectedStage = 'MVP';
      component.applyFilters();
      expect(startupStub.searchPaged).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'MVP' }), 0, 9
      );
    });

    it('Boundary: should call searchPaged when selectedIndustry is set', () => {
      component.selectedIndustry = 'Technology';
      component.applyFilters();
      expect(startupStub.searchPaged).toHaveBeenCalledWith(
        expect.objectContaining({ industry: 'Technology' }), 0, 9
      );
    });

    it('Exception: should call searchPaged with numeric funding values', () => {
      component.minFunding = '10000';
      component.maxFunding = '500000';
      component.applyFilters();
      expect(startupStub.searchPaged).toHaveBeenCalledWith(
        expect.objectContaining({ minFunding: 10000, maxFunding: 500000 }), 0, 9
      );
    });
  });

  // ─── hasFilters getter ────────────────────────────────────────────────────

  describe('hasFilters getter', () => {
    it('Normal: should return false when no filters are set', () => {
      expect(component.hasFilters).toBe(false);
    });

    it('Boundary: should return true when searchQuery has a value', () => {
      component.searchQuery = 'test';
      expect(component.hasFilters).toBe(true);
    });

    it('Exception: should return true when any filter field is set', () => {
      component.minFunding = '1000';
      expect(component.hasFilters).toBe(true);
    });
  });

  // ─── messageFounder() ────────────────────────────────────────────────────

  describe('messageFounder()', () => {
    it('Normal: should navigate to messages with founder id', () => {
      component.messageFounder(10);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: 10 } }
      );
    });

    it('Boundary: should navigate for founderId = 0', () => {
      component.messageFounder(0);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: 0 } }
      );
    });
  });

  // ─── stageLabel() / stageClass() ─────────────────────────────────────────

  describe('stageLabel() / stageClass()', () => {
    it('Normal: stageLabel should return readable label for each stage', () => {
      expect(component.stageLabel('IDEA')).toBe('Idea');
      expect(component.stageLabel('MVP')).toBe('MVP');
      expect(component.stageLabel('EARLY_TRACTION')).toBe('Early Traction');
      expect(component.stageLabel('SCALING')).toBe('Scaling');
    });

    it('Exception: stageLabel should return the raw stage when not in map', () => {
      expect(component.stageLabel('UNKNOWN_STAGE')).toBe('UNKNOWN_STAGE');
    });

    it('Boundary: stageClass should return correct badge for each stage', () => {
      expect(component.stageClass('IDEA')).toBe('badge-gray');
      expect(component.stageClass('MVP')).toBe('badge-info');
      expect(component.stageClass('EARLY_TRACTION')).toBe('badge-warning');
      expect(component.stageClass('SCALING')).toBe('badge-success');
    });
  });

  // ─── formatCurrency() ────────────────────────────────────────────────────

  describe('formatCurrency()', () => {
    it('Normal: should format 500000 as INR currency', () => {
      const result = component.formatCurrency(500000);
      expect(result).toContain('5,00,000');
    });

    it('Boundary: should format 0 correctly', () => {
      expect(component.formatCurrency(0)).toContain('0');
    });
  });

  // ─── pageNumbers getter ───────────────────────────────────────────────────

  describe('pageNumbers getter', () => {
    it('Normal: should return array containing currentPage value', () => {
      expect(component.pageNumbers).toContain(0);
    });

    it('Boundary: should return numbers within [0, totalPages-1]', () => {
      const nums = component.pageNumbers;
      nums.forEach(n => {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(component.totalPages());
      });
    });
  });

  // ─── invest modal ─────────────────────────────────────────────────────────

  describe('invest modal extras', () => {
    it('Normal: closeInvestModal should reset investModal and investAmount', () => {
      component.openInvestModal(mockStartup);
      component.investAmount = 5000;
      component.closeInvestModal();
      expect(component.investModal()).toBeNull();
      expect(component.investAmount).toBe(0);
    });

    it('Boundary: submitInvestment should return early when investModal is null', () => {
      component.investModal.set(null);
      component.submitInvestment();
      expect(investStub.create).not.toHaveBeenCalled();
    });

    it('Normal: isFounder should return true for ROLE_FOUNDER', async () => {
      (authStub as any).role = vi.fn().mockReturnValue('ROLE_FOUNDER');
      expect(component.isFounder).toBe(true);
    });
  });

  // ─── submitInvestment() timer callback ────────────────────────────────────

  describe('submitInvestment() success timeout', () => {
    it('Normal: should close invest modal after 2.5s timeout on success', () => {
      vi.useFakeTimers();
      component.openInvestModal(mockStartup);
      component.investAmount = 5000;
      component.submitInvestment();
      expect(component.investSuccess()).toContain('submitted');
      vi.advanceTimersByTime(2500);
      expect(component.investModal()).toBeNull();
      vi.useRealTimers();
    });

    it('Exception: submitInvestment error should use fallback message when no error property', () => {
      investStub.create = vi.fn().mockReturnValue(throwError(() => ({})));
      component.openInvestModal(mockStartup);
      component.investAmount = 5000;
      component.submitInvestment();
      expect(component.investError()).toContain('Failed to submit investment.');
    });
  });

  // ─── loadPage() with null paged data ──────────────────────────────────────

  describe('loadPage() with null paged data', () => {
    it('Boundary: should call applyNameFilter and stop loading when paged data is null', async () => {
      startupStub.getPaged = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [StartupsComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub },
          { provide: InvestmentService, useValue: investStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(StartupsComponent);
      f.detectChanges();
      expect(f.componentInstance.loading()).toBe(false);
      expect(f.componentInstance.allStartups()).toHaveLength(0);
    });
  });

  // ─── applyNameFilter() by description and industry ────────────────────────

  describe('applyNameFilter() by description and industry', () => {
    it('Normal: should match startups by description substring', () => {
      component.searchQuery = 'great';
      component.applyNameFilter();
      expect(component.allStartups()).toHaveLength(1); // description: 'A great startup'
    });

    it('Boundary: should match startups by industry substring', () => {
      component.searchQuery = 'technology';
      component.applyNameFilter();
      expect(component.allStartups()).toHaveLength(1); // industry: 'Technology'
    });

    it('Exception: should return empty when no startup matches by name, description, or industry', () => {
      component.searchQuery = 'ZZZNOMATCH_XYZXYZ';
      component.applyNameFilter();
      expect(component.allStartups()).toHaveLength(0);
    });
  });

  // ─── roleIs() with plain role string ──────────────────────────────────────

  describe('roleIs() with plain role string', () => {
    it('Normal: isInvestor should return true when role is plain "INVESTOR" without prefix', () => {
      (authStub.role as any) = vi.fn().mockReturnValue('INVESTOR');
      expect(component.isInvestor).toBe(true);
    });

    it('Boundary: isFounder should return true when role is plain "FOUNDER" without prefix', () => {
      (authStub.role as any) = vi.fn().mockReturnValue('FOUNDER');
      expect(component.isFounder).toBe(true);
    });

    it('Exception: roleIs should return false for completely unrelated role', () => {
      (authStub.role as any) = vi.fn().mockReturnValue('ROLE_ADMIN');
      expect(component.isInvestor).toBe(false);
      expect(component.isFounder).toBe(false);
    });

    it('Boundary: roleIs should handle null role via ?? empty string fallback', () => {
      (authStub.role as any) = vi.fn().mockReturnValue(null);
      expect(component.isInvestor).toBe(false);
    });
  });

  // ─── loadPage() error fallback message ────────────────────────────────────

  describe('loadPage() error fallback', () => {
    it('Exception: should use fallback errorMsg when getPaged error has no error property', async () => {
      startupStub.getPaged = vi.fn().mockReturnValue(throwError(() => ({})));
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [StartupsComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub },
          { provide: InvestmentService, useValue: investStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(StartupsComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toBe('Failed to load startups.');
    });
  });

  // ─── availableIndustries accumulation ────────────────────────────────────

  describe('availableIndustries accumulation', () => {
    it('Normal: should add industries from startup content to availableIndustries', () => {
      expect(component.availableIndustries()).toContain('Technology');
    });

    it('Boundary: should sort availableIndustries alphabetically', async () => {
      const pagedWithTwo = {
        ...mockPaged,
        content: [
          { ...mockStartup, id: 1, industry: 'Ztech' },
          { ...mockStartup, id: 2, industry: 'Atech' }
        ]
      };
      startupStub.getPaged = vi.fn().mockReturnValue(
        of({ success: true, data: pagedWithTwo, error: null })
      );
      component.loadPage(0);
      const industries = component.availableIndustries();
      expect(industries.indexOf('Atech')).toBeLessThan(industries.indexOf('Ztech'));
    });
  });
});
