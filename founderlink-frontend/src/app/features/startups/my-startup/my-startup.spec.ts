import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { MyStartupComponent } from './my-startup';
import { AuthService } from '../../../core/services/auth.service';
import { StartupService } from '../../../core/services/startup.service';

const mockStartup = {
  id: 1, name: 'MyStartup', description: 'Desc', industry: 'Tech',
  problemStatement: 'Problem', solution: 'Solution', fundingGoal: 50000,
  stage: 'MVP', founderId: 10
} as any;

describe('MyStartupComponent', () => {
  let fixture: ComponentFixture<MyStartupComponent>;
  let component: MyStartupComponent;
  let authStub: Partial<AuthService>;
  let startupStub: Partial<StartupService>;

  beforeEach(async () => {
    authStub = {
      userId: vi.fn().mockReturnValue(10) as any
    };
    startupStub = {
      getMyStartups: vi.fn().mockReturnValue(of({ success: true, data: [mockStartup], error: null })),
      create: vi.fn().mockReturnValue(of({ success: true, data: mockStartup, error: null })),
      update: vi.fn().mockReturnValue(of({ success: true, data: mockStartup, error: null })),
      delete: vi.fn().mockReturnValue(of({ success: true, data: null, error: null }))
    };

    await TestBed.configureTestingModule({
      imports: [MyStartupComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: StartupService, useValue: startupStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(MyStartupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── ngOnInit / loadStartups ──────────────────────────────────────────────

  describe('loadStartups()', () => {
    it('Normal: should load startups and populate startups signal', () => {
      expect(startupStub.getMyStartups).toHaveBeenCalled();
      expect(component.startups()).toHaveLength(1);
      expect(component.startups()[0].name).toBe('MyStartup');
    });

    it('Boundary: should show empty list when user has no startups', async () => {
      startupStub.getMyStartups = vi.fn().mockReturnValue(of({ success: true, data: [], error: null }));
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [MyStartupComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(MyStartupComponent);
      f.detectChanges();
      expect(f.componentInstance.startups()).toHaveLength(0);
    });

    it('Exception: should set errorMsg and stop loading on getMyStartups error', async () => {
      startupStub.getMyStartups = vi.fn().mockReturnValue(
        throwError(() => ({ error: 'Forbidden' }))
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [MyStartupComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(MyStartupComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toBe('Forbidden');
      expect(f.componentInstance.loading()).toBe(false);
    });
  });

  // ─── openCreate / openEdit ───────────────────────────────────────────────

  describe('openCreate() / openEdit()', () => {
    it('Normal: openCreate should show form with editingId = null', () => {
      component.openCreate();
      expect(component.showForm()).toBe(true);
      expect(component.editingId()).toBeNull();
    });

    it('Boundary: openEdit should patch form with startup data and set editingId', () => {
      component.openEdit(mockStartup);
      expect(component.showForm()).toBe(true);
      expect(component.editingId()).toBe(1);
      expect(component.form.get('name')?.value).toBe('MyStartup');
    });

    it('Exception: cancelForm should hide form and reset editingId', () => {
      component.openCreate();
      component.cancelForm();
      expect(component.showForm()).toBe(false);
      expect(component.editingId()).toBeNull();
    });
  });

  // ─── onSubmit() (create) ──────────────────────────────────────────────────

  describe('onSubmit() — create', () => {
    beforeEach(() => {
      component.openCreate();
      component.form.setValue({
        name: 'New Startup', description: 'Desc', industry: 'Fintech',
        problemStatement: 'Prob', solution: 'Sol', fundingGoal: 10000, stage: 'IDEA'
      });
    });

    it('Normal: should call startupService.create and reload startups', () => {
      vi.useFakeTimers();
      component.onSubmit();
      vi.advanceTimersByTime(3000);
      expect(startupStub.create).toHaveBeenCalled();
      expect(startupStub.getMyStartups).toHaveBeenCalledTimes(2); // once on init, once after create
      vi.useRealTimers();
    });

    it('Boundary: should reject form when fundingGoal is 999 (below minimum of 1000)', () => {
      component.form.patchValue({ fundingGoal: 999 });
      component.onSubmit();
      expect(startupStub.create).not.toHaveBeenCalled();
    });

    it('Exception: should set errorMsg when create fails', () => {
      startupStub.create = vi.fn().mockReturnValue(throwError(() => ({ error: 'Already exists' })));
      component.onSubmit();
      expect(component.errorMsg()).toBe('Already exists');
    });
  });

  // ─── onSubmit() (update) ──────────────────────────────────────────────────

  describe('onSubmit() — update', () => {
    beforeEach(() => {
      component.openEdit(mockStartup);
      component.form.setValue({
        name: 'Updated Name', description: 'New Desc', industry: 'Fintech',
        problemStatement: 'New Prob', solution: 'New Sol', fundingGoal: 20000, stage: 'SCALING'
      });
    });

    it('Normal: should call startupService.update with correct id on edit submit', () => {
      component.onSubmit();
      expect(startupStub.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Updated Name' }));
    });

    it('Boundary: should close form and reset editingId after successful update', () => {
      component.onSubmit();
      expect(component.showForm()).toBe(false);
      expect(component.editingId()).toBeNull();
    });

    it('Exception: should set errorMsg when update fails', () => {
      startupStub.update = vi.fn().mockReturnValue(throwError(() => ({ error: 'Update conflict' })));
      component.onSubmit();
      expect(component.errorMsg()).toBe('Update conflict');
    });
  });

  // ─── deleteStartup() ──────────────────────────────────────────────────────

  describe('deleteStartup()', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    });

    it('Normal: should confirm and remove startup from list', () => {
      component.deleteStartup(1);
      expect(startupStub.delete).toHaveBeenCalledWith(1);
      expect(component.startups().find(s => s.id === 1)).toBeUndefined();
    });

    it('Boundary: should not delete when user cancels the confirm dialog', () => {
      vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
      component.deleteStartup(1);
      expect(startupStub.delete).not.toHaveBeenCalled();
    });

    it('Exception: should set errorMsg when delete fails', () => {
      startupStub.delete = vi.fn().mockReturnValue(throwError(() => ({ error: 'Cannot delete' })));
      component.deleteStartup(1);
      expect(component.errorMsg()).toBe('Cannot delete');
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

    it('Exception: stageLabel should return raw stage string when not in map', () => {
      expect(component.stageLabel('UNKNOWN')).toBe('UNKNOWN');
    });

    it('Boundary: stageClass should return correct badge for each stage', () => {
      expect(component.stageClass('IDEA')).toBe('badge-gray');
      expect(component.stageClass('MVP')).toBe('badge-info');
      expect(component.stageClass('EARLY_TRACTION')).toBe('badge-warning');
      expect(component.stageClass('SCALING')).toBe('badge-success');
    });

    it('Exception: stageClass should return badge-success for unrecognized stage', () => {
      expect(component.stageClass('UNKNOWN')).toBe('badge-success');
    });
  });

  // ─── formatCurrency() ────────────────────────────────────────────────────

  describe('formatCurrency()', () => {
    it('Normal: should format 50000 as INR currency', () => {
      const result = component.formatCurrency(50000);
      expect(result).toContain('50,000');
    });

    it('Boundary: should format 0 without error', () => {
      expect(component.formatCurrency(0)).toContain('0');
    });

    it('Exception: should format large numbers with correct separators', () => {
      const result = component.formatCurrency(1000000);
      expect(result).toContain('10,00,000');
    });
  });

  // ─── f getter ────────────────────────────────────────────────────────────

  describe('f getter', () => {
    it('Normal: f should return form controls object', () => {
      expect(component.f).toEqual(component.form.controls);
    });

    it('Boundary: f.name should be the name form control', () => {
      expect(component.f['name']).toBe(component.form.get('name'));
    });

    it('Exception: f controls should reflect form validity', () => {
      component.form.reset();
      expect(component.f['name'].invalid).toBe(true);
    });
  });

  // ─── deleteStartup() default error message ───────────────────────────────

  describe('deleteStartup() fallback error', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    });

    afterEach(() => vi.restoreAllMocks());

    it('Exception: should use fallback error message when error has no error field', () => {
      startupStub.delete = vi.fn().mockReturnValue(throwError(() => ({})));
      component.deleteStartup(1);
      expect(component.errorMsg()).toBe('Failed to delete startup.');
    });
  });

  // ─── onSubmit() error fallback ────────────────────────────────────────────

  describe('onSubmit() fallback error', () => {
    beforeEach(() => {
      component.openCreate();
      component.form.setValue({
        name: 'New Startup', description: 'Desc', industry: 'Fintech',
        problemStatement: 'Prob', solution: 'Sol', fundingGoal: 10000, stage: 'IDEA'
      });
    });

    it('Exception: should use fallback error message when create fails with no error field', () => {
      startupStub.create = vi.fn().mockReturnValue(throwError(() => ({})));
      component.onSubmit();
      expect(component.errorMsg()).toBe('Something went wrong.');
    });
  });
  // ─── deleteStartup() successMsg timeout ──────────────────────────────────

  describe('deleteStartup() successMsg timeout', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('Normal: should clear successMsg after 3s timeout on delete success', () => {
      vi.useFakeTimers();
      component.deleteStartup(1);
      expect(component.successMsg()).toContain('deleted');
      expect(component.deleting()).toBeNull();
      vi.advanceTimersByTime(3000);
      expect(component.successMsg()).toBe('');
    });
  });

  // ─── onSubmit() update successMsg timeout ────────────────────────────────

  describe('onSubmit() update successMsg timeout', () => {
    beforeEach(() => {
      component.openEdit(mockStartup);
      component.form.setValue({
        name: 'Updated Name', description: 'Desc', industry: 'Fintech',
        problemStatement: 'Prob', solution: 'Sol', fundingGoal: 20000, stage: 'SCALING'
      });
    });

    afterEach(() => vi.useRealTimers());

    it('Normal: should clear successMsg after 3s timeout on update success', () => {
      vi.useFakeTimers();
      component.onSubmit();
      expect(component.successMsg()).toContain('updated');
      vi.advanceTimersByTime(3000);
      expect(component.successMsg()).toBe('');
    });
  });

  // ─── loadStartups() with null data ────────────────────────────────────────

  describe('loadStartups() null data', () => {
    it('Boundary: should set empty startups array when data is null', async () => {
      startupStub.getMyStartups = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [MyStartupComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(MyStartupComponent);
      f.detectChanges();
      expect(f.componentInstance.startups()).toHaveLength(0);
      expect(f.componentInstance.loading()).toBe(false);
    });
  });

  // ─── loadStartups() error fallback message ────────────────────────────────

  describe('loadStartups() error fallback', () => {
    it('Exception: should use default errorMsg when getMyStartups error has no error property', async () => {
      startupStub.getMyStartups = vi.fn().mockReturnValue(throwError(() => ({})));
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [MyStartupComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(MyStartupComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toBe('Failed to load startups.');
    });
  });

  // ─── deleteStartup() fallback error message ───────────────────────────────

  describe('deleteStartup() fallback error', () => {
    beforeEach(() => {
      vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    });

    afterEach(() => vi.restoreAllMocks());

    it('Exception: should use fallback error message when error has no error field', () => {
      startupStub.delete = vi.fn().mockReturnValue(throwError(() => ({})));
      component.deleteStartup(1);
      expect(component.errorMsg()).toBe('Failed to delete startup.');
    });
  });

  // ─── onSubmit() markAllAsTouched when form invalid ────────────────────────

  describe('onSubmit() invalid form branches', () => {
    it('Exception: markAllAsTouched should be called when name is empty', () => {
      component.openCreate();
      // name is '' by default after reset → form invalid
      // explicitly set invalid state
      component.form.patchValue({ name: '', description: '', fundingGoal: null });
      const spy = vi.spyOn(component.form, 'markAllAsTouched');
      component.onSubmit();
      expect(spy).toHaveBeenCalled();
      expect(startupStub.create).not.toHaveBeenCalled();
    });
  });

  // ─── openCreate / openEdit error/success reset ────────────────────────────

  describe('openCreate() / openEdit() clear messages', () => {
    it('Normal: openCreate should clear existing error and success messages', () => {
      component.errorMsg.set('old error');
      component.successMsg.set('old success');
      component.openCreate();
      expect(component.errorMsg()).toBe('');
      expect(component.successMsg()).toBe('');
    });

    it('Boundary: openEdit should clear messages and set form with existing data', () => {
      component.errorMsg.set('previous error');
      component.openEdit(mockStartup);
      expect(component.errorMsg()).toBe('');
      expect(component.form.get('name')?.value).toBe('MyStartup');
      expect(component.editingId()).toBe(1);
    });
  });});
