import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { StartupDetailComponent } from './startup-detail';
import { AuthService } from '../../../core/services/auth.service';
import { StartupService } from '../../../core/services/startup.service';

const mockStartup = {
  id: 5, name: 'DetailCo', description: 'Detailed description',
  industry: 'HealthTech', stage: 'EARLY_TRACTION', fundingGoal: 750000, founderId: 10
} as any;

describe('StartupDetailComponent', () => {
  let fixture: ComponentFixture<StartupDetailComponent>;
  let component: StartupDetailComponent;
  let authStub: Partial<AuthService>;
  let startupStub: Partial<StartupService>;
  let router: Router;

  const createModule = async (paramId = '5', isLoggedIn = false, failDetails = false) => {
    authStub = {
      isLoggedIn: vi.fn().mockReturnValue(isLoggedIn) as any
    };
    startupStub = {
      getDetails: failDetails
        ? vi.fn().mockReturnValue(throwError(() => new Error('Not found')))
        : vi.fn().mockReturnValue(of({ success: true, data: mockStartup, error: null }))
    };

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [StartupDetailComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: StartupService, useValue: startupStub },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: vi.fn().mockReturnValue(paramId) } } }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StartupDetailComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  };

  beforeEach(async () => createModule());

  // ─── ngOnInit ─────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should load startup details using route param id', () => {
      expect(startupStub.getDetails).toHaveBeenCalledWith(5);
      expect(component.startup()).toEqual(mockStartup);
      expect(component.loading()).toBe(false);
    });

    it('Boundary: should load startup with id = 1 (minimum valid id)', async () => {
      await createModule('1');
      expect(startupStub.getDetails).toHaveBeenCalledWith(1);
    });

    it('Exception: should set error message when getDetails fails', async () => {
      await createModule('9999', false, true);
      expect(component.error()).toBe('Startup not found.');
      expect(component.loading()).toBe(false);
    });
  });

  // ─── invest() ─────────────────────────────────────────────────────────────

  describe('invest()', () => {
    it('Normal: should navigate to /dashboard/startups when user is logged in', async () => {
      await createModule('5', true);
      component.invest();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard/startups']);
    });

    it('Boundary: should navigate to /auth/login when user is not logged in', () => {
      component.invest();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('Exception: should not throw even when navigate fails (returns rejected promise)', async () => {
      await createModule('5', true);
      vi.spyOn(router, 'navigate').mockRejectedValue(new Error('Navigation error'));
      expect(() => component.invest()).not.toThrow();
    });
  });

  // ─── goBack() ─────────────────────────────────────────────────────────────

  describe('goBack()', () => {
    it('Normal: should navigate to /dashboard/startups when logged in', async () => {
      await createModule('5', true);
      component.goBack();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard/startups']);
    });

    it('Boundary: should navigate to / (landing) when not logged in', () => {
      component.goBack();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('Exception: should call navigate exactly once per goBack() call', async () => {
      await createModule('5', false);
      component.goBack();
      expect(router.navigate).toHaveBeenCalledTimes(1);
    });
  });

  // ─── stageLabel / formatCurrency ──────────────────────────────────────────

  describe('helper methods', () => {
    it('Normal: stageLabel should return "MVP" for MVP stage', () => {
      expect(component.stageLabel('MVP' as any)).toBe('MVP');
    });

    it('Boundary: stageLabel should return "Idea Stage" for IDEA', () => {
      expect(component.stageLabel('IDEA' as any)).toBe('Idea Stage');
    });

    it('Exception: formatCurrency should handle 0 gracefully', () => {
      expect(component.formatCurrency(0)).toBe('₹0');
    });
  });

  // ─── stageLabel – full branch coverage ────────────────────────────────────

  describe('stageLabel()', () => {
    it('EARLY_TRACTION maps to "Early Traction"', () => {
      expect(component.stageLabel('EARLY_TRACTION' as any)).toBe('Early Traction');
    });

    it('SCALING maps to "Scaling"', () => {
      expect(component.stageLabel('SCALING' as any)).toBe('Scaling');
    });

    it('unknown stage falls through to raw value', () => {
      expect(component.stageLabel('UNKNOWN_STAGE' as any)).toBe('UNKNOWN_STAGE');
    });
  });

  // ─── stageClass – full branch coverage ────────────────────────────────────

  describe('stageClass()', () => {
    it('IDEA returns "stage-idea"', () => {
      expect(component.stageClass('IDEA' as any)).toBe('stage-idea');
    });

    it('MVP returns "stage-mvp"', () => {
      expect(component.stageClass('MVP' as any)).toBe('stage-mvp');
    });

    it('EARLY_TRACTION returns "stage-traction"', () => {
      expect(component.stageClass('EARLY_TRACTION' as any)).toBe('stage-traction');
    });

    it('SCALING returns "stage-scaling"', () => {
      expect(component.stageClass('SCALING' as any)).toBe('stage-scaling');
    });
  });

  // ─── formatCurrency – large value branches ────────────────────────────────

  describe('formatCurrency()', () => {
    it('amount >= 10_000_000 formats as Crore', () => {
      expect(component.formatCurrency(20_000_000)).toBe('₹2.00Cr');
    });

    it('amount >= 100_000 formats as Lakh', () => {
      expect(component.formatCurrency(500_000)).toBe('₹5.00L');
    });

    it('small amount formats with en-IN locale', () => {
      expect(component.formatCurrency(5000)).toBe('₹5,000');
    });
  });
});
