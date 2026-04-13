import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';

import { LandingComponent } from './landing';
import { AuthService } from '../../core/services/auth.service';
import { StartupService } from '../../core/services/startup.service';
import { UserService } from '../../core/services/user.service';

const mockStartup = { id: 1, name: 'StartupA', fundingGoal: 200000, stage: 'MVP' } as any;
const mockPaged = { content: [mockStartup], page: 0, totalPages: 1, totalElements: 1, size: 9, last: true };

describe('LandingComponent', () => {
  let fixture: ComponentFixture<LandingComponent>;
  let component: LandingComponent;
  let authStub: Partial<AuthService>;
  let startupStub: Partial<StartupService>;
  let userStub: Partial<UserService>;
  let router: Router;

  beforeEach(async () => {
    authStub = {
      isLoggedIn: vi.fn().mockReturnValue(false) as any
    };
    startupStub = {
      getPaged: vi.fn().mockReturnValue(of({ success: true, data: mockPaged, error: null }))
    };
    userStub = {
      getPublicStats: vi.fn().mockReturnValue(of({ founders: 350, investors: 200, cofounders: 120 }))
    };

    await TestBed.configureTestingModule({
      imports: [LandingComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: StartupService, useValue: startupStub },
        { provide: UserService, useValue: userStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  // ─── ngOnInit ─────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should load startups and stats on init', () => {
      expect(startupStub.getPaged).toHaveBeenCalledWith(0, 9);
      expect(userStub.getPublicStats).toHaveBeenCalled();
      expect(component.startups()).toHaveLength(1);
    });

    it('Boundary: should handle empty startup page gracefully', async () => {
      startupStub.getPaged = vi.fn().mockReturnValue(
        of({ success: true, data: { ...mockPaged, content: [], totalElements: 0 }, error: null })
      );
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [LandingComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub },
          { provide: UserService, useValue: userStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(LandingComponent);
      f.detectChanges();
      expect(f.componentInstance.startups()).toEqual([]);
    });

    it('Exception: should set loading false even when getPaged throws', async () => {
      startupStub.getPaged = vi.fn().mockReturnValue(throwError(() => new Error('Network fail')));
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [LandingComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub },
          { provide: UserService, useValue: userStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(LandingComponent);
      f.detectChanges();
      expect(f.componentInstance.loading()).toBe(false);
    });
  });

  // ─── totalFunding computed ────────────────────────────────────────────────

  describe('totalFunding computed', () => {
    it('Normal: should sum all startup fundingGoal values', () => {
      expect(component.totalFunding()).toBe(200000);
    });

    it('Boundary: should return 0 when startups list is empty', () => {
      component.startups.set([]);
      expect(component.totalFunding()).toBe(0);
    });

    it('Exception: should treat undefined fundingGoal as 0 in sum', () => {
      component.startups.set([{ id: 2, name: 'X', fundingGoal: undefined } as any]);
      expect(component.totalFunding()).toBe(0);
    });
  });

  // ─── openDetail / goToDashboard ───────────────────────────────────────────

  describe('navigation', () => {
    it('Normal: openDetail should navigate to /startup/:id', () => {
      component.openDetail(mockStartup);
      expect(router.navigate).toHaveBeenCalledWith(['/startup', 1]);
    });

    it('Boundary: goToDashboard should navigate to /dashboard', () => {
      component.goToDashboard();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('Exception: openDetail with a startup that has id=0 should still call navigate', () => {
      component.openDetail({ ...mockStartup, id: 0 });
      expect(router.navigate).toHaveBeenCalledWith(['/startup', 0]);
    });
  });

  // ─── helper methods ───────────────────────────────────────────────────────

  describe('formatCurrency()', () => {
    it('Normal: should format amounts >= 1 crore as Cr suffix', () => {
      expect(component.formatCurrency(10000000)).toContain('Cr');
    });

    it('Boundary: should format amounts >= 1 lakh as L suffix', () => {
      expect(component.formatCurrency(100000)).toContain('L');
    });

    it('Exception: should return ₹0 for zero amount', () => {
      expect(component.formatCurrency(0)).toBe('₹0');
    });
  });

  // ─── stageLabel() / stageClass() ─────────────────────────────────────────

  describe('stageLabel() / stageClass()', () => {
    it('Normal: stageLabel should return "Idea" for IDEA', () => {
      expect(component.stageLabel('IDEA' as any)).toBe('Idea');
    });

    it('Normal: stageLabel should return "MVP" for MVP', () => {
      expect(component.stageLabel('MVP' as any)).toBe('MVP');
    });

    it('Normal: stageLabel should return "Early Traction" for EARLY_TRACTION', () => {
      expect(component.stageLabel('EARLY_TRACTION' as any)).toBe('Early Traction');
    });

    it('Normal: stageLabel should return "Scaling" for SCALING', () => {
      expect(component.stageLabel('SCALING' as any)).toBe('Scaling');
    });

    it('Exception: stageLabel should return raw stage for unknown stages', () => {
      expect(component.stageLabel('UNKNOWN' as any)).toBe('UNKNOWN');
    });

    it('Boundary: stageClass should return "stage-idea" for IDEA', () => {
      expect(component.stageClass('IDEA' as any)).toBe('stage-idea');
    });

    it('Boundary: stageClass should return "stage-mvp" for MVP', () => {
      expect(component.stageClass('MVP' as any)).toBe('stage-mvp');
    });

    it('Boundary: stageClass should return "stage-traction" for EARLY_TRACTION', () => {
      expect(component.stageClass('EARLY_TRACTION' as any)).toBe('stage-traction');
    });

    it('Boundary: stageClass should return "stage-scaling" for SCALING', () => {
      expect(component.stageClass('SCALING' as any)).toBe('stage-scaling');
    });
  });

  // ─── loadStats() error path ───────────────────────────────────────────────

  describe('loadStats() error', () => {
    it('Exception: should not crash when getPublicStats fails', () => {
      userStub.getPublicStats = vi.fn().mockReturnValue(throwError(() => new Error('fail')));
      expect(() => component.loadStats()).not.toThrow();
    });
  });

  // ─── filteredStartups getter ──────────────────────────────────────────────

  describe('filteredStartups', () => {
    it('Normal: should return all startups', () => {
      expect(component.filteredStartups).toHaveLength(1);
    });

    it('Boundary: should return empty array when startups is empty', () => {
      component.startups.set([]);
      expect(component.filteredStartups).toHaveLength(0);
    });
  });

  // ─── formatCurrency large values ─────────────────────────────────────────

  describe('formatCurrency() additional cases', () => {
    it('Boundary: should format small amounts using toLocaleString', () => {
      const result = component.formatCurrency(50000);
      expect(result).toContain('₹');
    });
  });
});
