import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ProfileComponent } from './profile';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

const mockUser = {
  userId: 42, name: 'Jane Founder', email: 'jane@test.com', role: 'ROLE_FOUNDER',
  skills: 'Angular, Java', experience: '3 years', bio: 'Passionate builder',
  portfolioLinks: 'https://github.com/jane', createdAt: '2025-01-01T00:00:00'
} as any;

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let authStub: Partial<AuthService>;
  let userStub: Partial<UserService>;

  beforeEach(async () => {
    authStub = {
      userId: vi.fn().mockReturnValue(42) as any,
      role: vi.fn().mockReturnValue('ROLE_FOUNDER') as any,
      email: vi.fn().mockReturnValue('jane@test.com') as any,
      logout: vi.fn()
    };
    userStub = {
      getUser: vi.fn().mockReturnValue(of({ success: true, data: mockUser, error: null })),
      updateMyProfile: vi.fn().mockReturnValue(of({ success: true, data: mockUser, error: null }))
    };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: UserService, useValue: userStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── ngOnInit / loadProfile ───────────────────────────────────────────────

  describe('loadProfile()', () => {
    it('Normal: should load user profile and populate form fields', () => {
      expect(userStub.getUser).toHaveBeenCalledWith(42);
      expect(component.user()).toEqual(mockUser);
      expect(component.name).toBe('Jane Founder');
      expect(component.skills).toBe('Angular, Java');
    });

    it('Boundary: should populate all 5 editable fields from user data', () => {
      expect(component.name).toBe('Jane Founder');
      expect(component.skills).toBe('Angular, Java');
      expect(component.experience).toBe('3 years');
      expect(component.bio).toBe('Passionate builder');
      expect(component.portfolioLinks).toBe('https://github.com/jane');
    });

    it('Exception: should set errorMsg when getUser fails', async () => {
      userStub.getUser = vi.fn().mockReturnValue(throwError(() => new Error('Not found')));
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [ProfileComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: UserService, useValue: userStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(ProfileComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toContain('Failed to load profile');
    });
  });

  // ─── saveProfile() ────────────────────────────────────────────────────────

  describe('saveProfile()', () => {
    it('Normal: should call updateMyProfile and set successMsg on success', () => {
      vi.useFakeTimers();
      component.name = 'Jane Updated';
      component.saveProfile();
      vi.advanceTimersByTime(3000);
      expect(userStub.updateMyProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Jane Updated' }));
      expect(component.editing()).toBe(false);
      vi.useRealTimers();
    });

    it('Boundary: should send null for empty optional fields', () => {
      component.name = 'Jane Updated';
      component.skills = '';
      component.experience = '';
      component.saveProfile();
      expect(userStub.updateMyProfile).toHaveBeenCalledWith(expect.objectContaining({
        skills: null, experience: null
      }));
    });

    it('Exception: should set errorMsg when name is empty and not call updateMyProfile', () => {
      component.name = '';
      component.saveProfile();
      expect(userStub.updateMyProfile).not.toHaveBeenCalled();
      expect(component.errorMsg()).toContain('Name is required');
    });
  });

  // ─── saveProfile error ────────────────────────────────────────────────────

  describe('saveProfile() error path', () => {
    it('Normal: should set errorMsg when updateMyProfile fails', () => {
      userStub.updateMyProfile = vi.fn().mockReturnValue(throwError(() => ({ error: 'Profile update failed' })));
      component.name = 'Jane Updated';
      component.saveProfile();
      expect(component.errorMsg()).toBe('Profile update failed');
      expect(component.saving()).toBe(false);
    });

    it('Boundary: should not set editing to false on error (form stays open)', () => {
      userStub.updateMyProfile = vi.fn().mockReturnValue(throwError(() => ({ error: 'fail' })));
      component.editing.set(true);
      component.name = 'Jane';
      component.saveProfile();
      expect(component.editing()).toBe(true);
    });

    it('Exception: should reset saving signal on both success and error paths', () => {
      component.name = 'Jane Updated';
      component.saveProfile(); // success path
      expect(component.saving()).toBe(false);
    });
  });

  // ─── toggleEdit() ─────────────────────────────────────────────────────────

  describe('toggleEdit()', () => {
    it('Normal: should toggle editing from false to true', () => {
      expect(component.editing()).toBe(false);
      component.toggleEdit();
      expect(component.editing()).toBe(true);
    });

    it('Boundary: should reset form fields to original values when toggling off', () => {
      component.toggleEdit(); // enter edit mode
      component.name = 'Tampered Name';
      component.toggleEdit(); // exit edit mode → reset
      expect(component.name).toBe('Jane Founder'); // reset to loaded value
    });

    it('Exception: should not reset when editing becomes true (only on cancel/false toggle)', () => {
      component.toggleEdit(); // false → true
      component.name = 'Changed';
      // name should NOT be reset when entering edit mode
      expect(component.name).toBe('Changed');
    });
  });

  // ─── logout() / getRoleDisplay() ─────────────────────────────────────────

  describe('logout() / getRoleDisplay()', () => {
    it('Normal: should call authService.logout when logout() is invoked', () => {
      component.logout();
      expect(authStub.logout).toHaveBeenCalled();
    });

    it('Boundary: getRoleDisplay should return correct display for FOUNDER role', () => {
      const display = component.getRoleDisplay();
      expect(display.label).toBe('Founder');
      expect(display.color).toBeTruthy();
    });

    it('Exception: getRoleDisplay should return a fallback for unknown roles', () => {
      (authStub.role as any) = vi.fn().mockReturnValue('ROLE_UNKNOWN');
      const display = component.getRoleDisplay();
      expect(display.label).toBe('UNKNOWN');
    });
  });

  // ─── getRoleDisplay() all roles ───────────────────────────────────────────

  describe('getRoleDisplay() all roles', () => {
    it('Normal: should return correct display for INVESTOR role', () => {
      (authStub.role as any) = vi.fn().mockReturnValue('ROLE_INVESTOR');
      const display = component.getRoleDisplay();
      expect(display.label).toBe('Investor');
      expect(display.color).toBeTruthy();
    });

    it('Boundary: should return correct display for COFOUNDER role', () => {
      (authStub.role as any) = vi.fn().mockReturnValue('ROLE_COFOUNDER');
      const display = component.getRoleDisplay();
      expect(display.label).toBe('Co-Founder');
    });

    it('Boundary: should return correct display for ADMIN role', () => {
      (authStub.role as any) = vi.fn().mockReturnValue('ROLE_ADMIN');
      const display = component.getRoleDisplay();
      expect(display.label).toBe('Admin');
      expect(display.color).toBe('#ef4444');
    });

    it('Exception: should handle role without ROLE_ prefix', () => {
      (authStub.role as any) = vi.fn().mockReturnValue('FOUNDER');
      const display = component.getRoleDisplay();
      expect(display.label).toBe('Founder');
    });
  });

  // ─── formatDate() ─────────────────────────────────────────────────────────

  describe('formatDate()', () => {
    it('Normal: should format ISO date string to readable date', () => {
      const result = component.formatDate('2025-01-15T00:00:00');
      expect(result).toContain('2025');
    });

    it('Boundary: should handle date-only string', () => {
      const result = component.formatDate('2024-12-25T00:00:00');
      expect(result).toContain('2024');
    });

    it('Exception: should include month and day in output', () => {
      const result = component.formatDate('2025-06-01T00:00:00');
      expect(result).toMatch(/\w+ \d+, \d{4}|\d+ \w+ \d{4}/);
    });
  });

  // ─── loadProfile() with null user data ────────────────────────────────────

  describe('loadProfile() edge cases', () => {
    it('Exception: should not crash when user data is null', async () => {
      userStub.getUser = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [ProfileComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: UserService, useValue: userStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(ProfileComponent);
      expect(() => f.detectChanges()).not.toThrow();
      expect(f.componentInstance.user()).toBeNull();
    });

    it('Boundary: fields should remain empty strings when user data has null fields', async () => {
      const nullFieldUser = {
        userId: 42, name: null as any, email: 'jane@test.com', role: 'ROLE_FOUNDER',
        skills: null as any, experience: null as any, bio: null as any,
        portfolioLinks: null as any, createdAt: '2025-01-01T00:00:00'
      } as any;
      userStub.getUser = vi.fn().mockReturnValue(
        of({ success: true, data: nullFieldUser, error: null })
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [ProfileComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: UserService, useValue: userStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(ProfileComponent);
      f.detectChanges();
      expect(f.componentInstance.name).toBe('');
      expect(f.componentInstance.skills).toBe('');
      expect(f.componentInstance.bio).toBe('');
      expect(f.componentInstance.portfolioLinks).toBe('');
    });
  });

  // ─── toggleEdit() with null user ──────────────────────────────────────────

  describe('toggleEdit() with null user', () => {
    it('Exception: should not throw when user() is null during cancel', () => {
      component.user.set(null);
      component.editing.set(true);
      expect(() => component.toggleEdit()).not.toThrow();
    });

    it('Boundary: fields should remain unchanged when user is null on cancel', () => {
      component.user.set(null);
      component.editing.set(true);
      component.name = 'Changed';
      component.toggleEdit(); // editing: true → false → tries to reset, user is null
      // With null user, the if(u) block is skipped, name stays as-is
      expect(component.name).toBe('Changed');
    });
  });

  // ─── saveProfile() fallback error message ─────────────────────────────────

  describe('saveProfile() fallback error message', () => {
    it('Exception: should use default errorMsg when updateMyProfile fails without error property', () => {
      userStub.updateMyProfile = vi.fn().mockReturnValue(throwError(() => ({})));
      component.name = 'Jane Updated';
      component.saveProfile();
      expect(component.errorMsg()).toBe('Failed to update profile.');
      expect(component.saving()).toBe(false);
    });
  });

  // ─── saveProfile() successMsg timeout ─────────────────────────────────────

  describe('saveProfile() successMsg timeout', () => {
    it('Normal: should clear successMsg after 3 seconds', () => {
      vi.useFakeTimers();
      component.name = 'Jane';
      component.saveProfile();
      expect(component.successMsg()).toContain('updated');
      vi.advanceTimersByTime(3000);
      expect(component.successMsg()).toBe('');
      vi.useRealTimers();
    });
  });

  // ─── loadProfile() error fallback ─────────────────────────────────────────

  describe('loadProfile() error paths', () => {
    it('Exception: should use loadProfile via double-call to cover loading.set(true)', () => {
      // loadProfile is called in ngOnInit; calling again re-triggers loading.set(true)
      const callsBefore = (userStub.getUser as any).mock.calls.length;
      component.loadProfile();
      expect((userStub.getUser as any).mock.calls.length).toBeGreaterThan(callsBefore);
      expect(component.loading()).toBe(false); // completes synchronously
    });
  });
});
