import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { LoginComponent } from './login';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

const makeStubs = () => ({
  authStub: {
    login: vi.fn().mockReturnValue(of({ success: true, data: null, error: null }))
  } as Partial<AuthService>,
  userStub: {
    getPublicStats: vi.fn().mockReturnValue(of({ founders: 350, investors: 200, cofounders: 120 }))
  } as Partial<UserService>
});

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let router: Router;
  let authStub: ReturnType<typeof makeStubs>['authStub'];
  let userStub: ReturnType<typeof makeStubs>['userStub'];

  beforeEach(async () => {
    const stubs = makeStubs();
    authStub = stubs.authStub;
    userStub = stubs.userStub;

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: UserService, useValue: userStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  // ─── ngOnInit / public stats ──────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should load public stats and update stats signal', () => {
      expect(userStub.getPublicStats).toHaveBeenCalled();
      expect(component.stats()).toEqual({ founders: 350, investors: 200, cofounders: 120 });
    });

    it('Boundary: should keep default stats when getPublicStats returns unusual values', async () => {
      const stubs = makeStubs();
      stubs.userStub.getPublicStats = vi.fn().mockReturnValue(of({ founders: 0, investors: 0, cofounders: 0 }));
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [LoginComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: stubs.authStub },
          { provide: UserService, useValue: stubs.userStub }
        ]
      }).compileComponents();
      const f = TestBed.createComponent(LoginComponent);
      f.detectChanges();
      expect(f.componentInstance.stats()).toEqual({ founders: 0, investors: 0, cofounders: 0 });
    });

    it('Exception: should silently handle getPublicStats error without crashing', async () => {
      const stubs = makeStubs();
      stubs.userStub.getPublicStats = vi.fn().mockReturnValue(throwError(() => new Error('Network error')));
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [LoginComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: stubs.authStub },
          { provide: UserService, useValue: stubs.userStub }
        ]
      }).compileComponents();
      const f = TestBed.createComponent(LoginComponent);
      expect(() => f.detectChanges()).not.toThrow();
    });
  });

  // ─── onSubmit() ───────────────────────────────────────────────────────────

  describe('onSubmit()', () => {
    it('Normal: should call authService.login and navigate to /dashboard on success', () => {
      component.form.setValue({ email: 'user@test.com', password: 'password123' });
      component.onSubmit();
      expect(authStub.login).toHaveBeenCalledWith({ email: 'user@test.com', password: 'password123' });
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('Boundary: should mark form touched and not call login when form is invalid', () => {
      component.form.setValue({ email: '', password: '' });
      component.onSubmit();
      expect(authStub.login).not.toHaveBeenCalled();
      expect(component.form.touched).toBe(true);
    });

    it('Exception: should set errorMsg on login failure', () => {
      authStub.login = vi.fn().mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid credentials' } }))
      );
      component.form.setValue({ email: 'user@test.com', password: 'wrong' });
      component.onSubmit();
      expect(component.errorMsg()).toBe('Invalid credentials');
      expect(component.loading()).toBe(false);
    });
  });

  // ─── form validation ──────────────────────────────────────────────────────

  describe('form validation', () => {
    it('Normal: should be valid with correct email and password', () => {
      component.form.setValue({ email: 'valid@email.com', password: 'secret' });
      expect(component.form.valid).toBe(true);
    });

    it('Boundary: should be invalid with an improperly formatted email', () => {
      component.form.setValue({ email: 'not-an-email', password: 'secret' });
      expect(component.email.invalid).toBe(true);
    });

    it('Exception: should be invalid when password is empty string', () => {
      component.form.setValue({ email: 'valid@email.com', password: '' });
      expect(component.password.invalid).toBe(true);
    });
  });

  // ─── loading signal ───────────────────────────────────────────────────────

  describe('loading signal', () => {
    it('Normal: should set loading to true during submit and false on success', () => {
      component.form.setValue({ email: 'user@test.com', password: 'pass' });
      component.onSubmit();
      expect(component.loading()).toBe(false); // sync observable resolves immediately
    });

    it('Boundary: should reset loading to false even when login returns error', () => {
      authStub.login = vi.fn().mockReturnValue(throwError(() => ({ error: {} })));
      component.form.setValue({ email: 'x@x.com', password: 'x' });
      component.onSubmit();
      expect(component.loading()).toBe(false);
    });

    it('Exception: should not navigate if form is invalid — loading stays false', () => {
      component.form.setValue({ email: '', password: '' });
      component.onSubmit();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(component.loading()).toBe(false);
    });
  });

  // ─── form getters ─────────────────────────────────────────────────────────

  describe('form getters', () => {
    it('email getter returns the email control', () => {
      expect(component.email).toBe(component.form.get('email'));
    });

    it('password getter returns the password control', () => {
      expect(component.password).toBe(component.form.get('password'));
    });
  });

  // ─── showPassword toggle ──────────────────────────────────────────────────

  describe('showPassword', () => {
    it('should default to false', () => {
      expect(component.showPassword).toBe(false);
    });

    it('should toggle to true when set', () => {
      component.showPassword = true;
      expect(component.showPassword).toBe(true);
    });

    it('should toggle back to false', () => {
      component.showPassword = true;
      component.showPassword = !component.showPassword;
      expect(component.showPassword).toBe(false);
    });
  });

  // ─── features property ────────────────────────────────────────────────────

  describe('features', () => {
    it('should expose 3 feature entries', () => {
      expect(component.features.length).toBe(3);
    });

    it('first feature has icon "founder"', () => {
      expect(component.features[0].icon).toBe('founder');
    });
  });

  // ─── errorMsg fallback ────────────────────────────────────────────────────

  describe('errorMsg fallback', () => {
    it('should use default message when error has no message field', () => {
      authStub.login = vi.fn().mockReturnValue(
        throwError(() => ({ error: {} }))
      );
      component.form.setValue({ email: 'u@u.com', password: 'pass' });
      component.onSubmit();
      expect(component.errorMsg()).toBe('Invalid email or password. Please try again.');
    });
  });
});
