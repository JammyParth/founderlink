import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';

import { RegisterComponent } from './register';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let router: Router;
  let authStub: Partial<AuthService>;
  let userStub: Partial<UserService>;

  const buildModule = async (queryParams: Record<string, string> = {}) => {
    authStub = {
      register: vi.fn().mockReturnValue(of({ success: true, data: null, error: null }))
    };
    userStub = {
      getPublicStats: vi.fn().mockReturnValue(of({ founders: 350, investors: 200, cofounders: 120 }))
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: UserService, useValue: userStub },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of(queryParams) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await buildModule();
  });

  // ─── ngOnInit ─────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should load public stats on init', () => {
      expect(userStub.getPublicStats).toHaveBeenCalled();
      expect(component.stats()).toEqual({ founders: 350, investors: 200, cofounders: 120 });
    });

    it('Boundary: should lock role and patch form when role query param is provided', async () => {
      await TestBed.resetTestingModule();
      await buildModule({ role: 'FOUNDER' });
      expect(component.role.value).toBe('FOUNDER');
      expect(component.isRoleLocked).toBe(true);
    });

    it('Exception: should ignore invalid role query param that is not in allowed list', async () => {
      await TestBed.resetTestingModule();
      await buildModule({ role: 'HACKER' });
      expect(component.role.value).toBe('');
      expect(component.isRoleLocked).toBe(false);
    });
  });

  // ─── onSubmit() ───────────────────────────────────────────────────────────

  describe('onSubmit()', () => {
    it('Normal: should call authService.register and show success message then navigate', () => {
      vi.useFakeTimers();
      component.form.setValue({ name: 'Jane Doe', email: 'jane@test.com', password: 'secret1', role: 'FOUNDER' });
      component.onSubmit();
      expect(authStub.register).toHaveBeenCalled();
      expect(component.successMsg()).toContain('Account created');
      vi.advanceTimersByTime(1800);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
      vi.useRealTimers();
    });

    it('Boundary: should not submit when name is exactly 1 character (minLength=2)', () => {
      component.form.setValue({ name: 'A', email: 'j@t.com', password: 'pass123', role: 'INVESTOR' });
      component.onSubmit();
      expect(authStub.register).not.toHaveBeenCalled();
    });

    it('Exception: should set errorMsg on registration failure', () => {
      authStub.register = vi.fn().mockReturnValue(
        throwError(() => ({ error: { message: 'Email already exists' } }))
      );
      component.form.setValue({ name: 'Jane', email: 'x@x.com', password: 'pass12', role: 'INVESTOR' });
      component.onSubmit();
      expect(component.errorMsg()).toBe('Email already exists');
      expect(component.loading()).toBe(false);
    });
  });

  // ─── form validation ──────────────────────────────────────────────────────

  describe('form validation', () => {
    it('Normal: should be valid with all correct fields', () => {
      component.form.setValue({ name: 'Valid Name', email: 'email@valid.com', password: 'pass123', role: 'COFOUNDER' });
      expect(component.form.valid).toBe(true);
    });

    it('Boundary: should be invalid when password has exactly 5 characters (minLength=6)', () => {
      component.form.setValue({ name: 'Test', email: 't@t.com', password: '12345', role: 'FOUNDER' });
      expect(component.password.invalid).toBe(true);
    });

    it('Exception: should mark form touched when invalid onSubmit', () => {
      component.form.setValue({ name: '', email: '', password: '', role: '' });
      component.onSubmit();
      expect(component.form.touched).toBe(true);
    });
  });

  // ─── selectedRole computed property ───────────────────────────────────────

  describe('selectedRole getter', () => {
    it('Normal: should return "Founder" when role is FOUNDER', () => {
      component.role.setValue('FOUNDER');
      expect(component.selectedRole).toBe('Founder');
    });

    it('Boundary: should return "Co-Founder" for COFOUNDER role', () => {
      component.role.setValue('COFOUNDER');
      expect(component.selectedRole).toBe('Co-Founder');
    });

    it('Exception: should return empty string when no role selected', () => {
      component.role.setValue('');
      expect(component.selectedRole).toBe('');
    });
  });

  // ─── selectedRole – INVESTOR branch ───────────────────────────────────────

  describe('selectedRole INVESTOR', () => {
    it('should return "Investor" when role is INVESTOR', () => {
      component.role.setValue('INVESTOR');
      expect(component.selectedRole).toBe('Investor');
    });
  });

  // ─── form getters ─────────────────────────────────────────────────────────

  describe('form getters', () => {
    it('name getter returns the name control', () => {
      expect(component.name).toBe(component.form.get('name'));
    });

    it('email getter returns the email control', () => {
      expect(component.email).toBe(component.form.get('email'));
    });

    it('password getter returns the password control', () => {
      expect(component.password).toBe(component.form.get('password'));
    });

    it('role getter returns the role control', () => {
      expect(component.role).toBe(component.form.get('role'));
    });
  });

  // ─── showPassword toggle ──────────────────────────────────────────────────

  describe('showPassword', () => {
    it('should default to false', () => {
      expect(component.showPassword).toBe(false);
    });

    it('should toggle to true when set directly', () => {
      component.showPassword = true;
      expect(component.showPassword).toBe(true);
    });
  });

  // ─── rolePreviews / roles readonly properties ────────────────────────────

  describe('readonly properties', () => {
    it('rolePreviews should have 3 entries', () => {
      expect(component.rolePreviews.length).toBe(3);
    });

    it('rolePreviews first entry has role "Founder"', () => {
      expect(component.rolePreviews[0].role).toBe('Founder');
    });

    it('roles should have 3 entries', () => {
      expect(component.roles.length).toBe(3);
    });

    it('roles first entry has value "FOUNDER"', () => {
      expect(component.roles[0].value).toBe('FOUNDER');
    });
  });

  // ─── errorMsg fallback ────────────────────────────────────────────────────

  describe('errorMsg fallback', () => {
    it('uses default message when error has no message field', () => {
      authStub.register = vi.fn().mockReturnValue(
        throwError(() => ({ error: {} }))
      );
      component.form.setValue({ name: 'Test', email: 'x@x.com', password: 'pass12', role: 'INVESTOR' });
      component.onSubmit();
      expect(component.errorMsg()).toBe('Registration failed. Please try again.');
    });
  });
});
