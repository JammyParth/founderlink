import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { ForgotPasswordComponent } from './forgot-password';
import { AuthService } from '../../../core/services/auth.service';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let authStub: Partial<AuthService>;

  beforeEach(async () => {
    authStub = {
      forgotPassword: vi.fn().mockReturnValue(of({ success: true, data: null, error: null })),
      resetPassword: vi.fn().mockReturnValue(of({ success: true, data: null, error: null }))
    };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent, RouterTestingModule.withRoutes([])],
      providers: [{ provide: AuthService, useValue: authStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('Normal: should start on the request step', () => {
      expect(component.step()).toBe('request');
    });

    it('Boundary: should have an invalid request form initially (email empty)', () => {
      expect(component.requestForm.valid).toBe(false);
    });

    it('Exception: should not have any error messages on mount', () => {
      expect(component.errorMsg()).toBe('');
      expect(component.successMsg()).toBe('');
    });
  });

  // ─── sendPin() ────────────────────────────────────────────────────────────

  describe('sendPin()', () => {
    it('Normal: should call forgotPassword, store submitted email, and move to reset step', () => {
      component.requestForm.setValue({ email: 'user@test.com' });
      component.sendPin();
      expect(authStub.forgotPassword).toHaveBeenCalledWith({ email: 'user@test.com' });
      expect(component.step()).toBe('reset');
      expect(component.submittedEmail()).toBe('user@test.com');
    });

    it('Boundary: should pre-fill reset form email with the submitted email', () => {
      component.requestForm.setValue({ email: 'test@boundary.com' });
      component.sendPin();
      expect(component.resetForm.get('email')?.value).toBe('test@boundary.com');
    });

    it('Exception: should set errorMsg and stay on request step when forgotPassword fails', () => {
      authStub.forgotPassword = vi.fn().mockReturnValue(
        throwError(() => ({ error: { message: 'Email not registered' } }))
      );
      component.requestForm.setValue({ email: 'ghost@nowhere.com' });
      component.sendPin();
      expect(component.step()).toBe('request');
      expect(component.errorMsg()).toBe('Email not registered');
    });
  });

  // ─── sendPin() form validation ────────────────────────────────────────────

  describe('sendPin() form validation', () => {
    it('Normal: should not call forgotPassword when email is invalid', () => {
      component.requestForm.setValue({ email: 'not-an-email' });
      component.sendPin();
      expect(authStub.forgotPassword).not.toHaveBeenCalled();
    });

    it('Boundary: should mark form touched when invalid', () => {
      component.requestForm.setValue({ email: '' });
      component.sendPin();
      expect(component.requestForm.touched).toBe(true);
    });

    it('Exception: should remain on request step when form is invalid', () => {
      component.requestForm.setValue({ email: '' });
      component.sendPin();
      expect(component.step()).toBe('request');
    });
  });

  // ─── resetPassword() ──────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    beforeEach(() => {
      // Manually advance to reset step
      component.requestForm.setValue({ email: 'user@test.com' });
      component.sendPin();
    });

    it('Normal: should call authService.resetPassword and set successMsg', () => {
      component.resetForm.setValue({ email: 'user@test.com', pin: '123456', newPassword: 'newpass1' });
      component.resetPassword();
      expect(authStub.resetPassword).toHaveBeenCalledWith({
        email: 'user@test.com', pin: '123456', newPassword: 'newpass1'
      });
      expect(component.successMsg()).toContain('Password reset successfully');
    });

    it('Boundary: should require pin to be exactly 6 digits (min and max length)', () => {
      component.resetForm.setValue({ email: 'user@test.com', pin: '12345', newPassword: 'newpass1' });
      component.resetPassword();
      expect(authStub.resetPassword).not.toHaveBeenCalled();
    });

    it('Exception: should set errorMsg when resetPassword call fails (wrong PIN)', () => {
      authStub.resetPassword = vi.fn().mockReturnValue(
        throwError(() => ({ error: { message: 'Invalid or expired PIN' } }))
      );
      component.resetForm.setValue({ email: 'user@test.com', pin: '000000', newPassword: 'newpass1' });
      component.resetPassword();
      expect(component.errorMsg()).toBe('Invalid or expired PIN');
      expect(component.successMsg()).toBe('');
    });
  });

  // ─── loading signal ───────────────────────────────────────────────────────

  describe('loading signal', () => {
    it('Normal: should reset to false after successful sendPin', () => {
      component.requestForm.setValue({ email: 'user@test.com' });
      component.sendPin();
      expect(component.loading()).toBe(false);
    });

    it('Boundary: should reset to false after successful resetPassword', () => {
      component.requestForm.setValue({ email: 'user@test.com' });
      component.sendPin();
      component.resetForm.setValue({ email: 'user@test.com', pin: '123456', newPassword: 'new1234' });
      component.resetPassword();
      expect(component.loading()).toBe(false);
    });

    it('Exception: should reset loading to false even after forgotPassword error', () => {
      authStub.forgotPassword = vi.fn().mockReturnValue(throwError(() => ({ error: {} })));
      component.requestForm.setValue({ email: 'x@x.com' });
      component.sendPin();
      expect(component.loading()).toBe(false);
    });
  });

  // ─── form getters ─────────────────────────────────────────────────────────

  describe('form getters', () => {
    it('Normal: resEmail should return reset form email control', () => {
      expect(component.resEmail).toBe(component.resetForm.get('email'));
    });

    it('Boundary: pin should return reset form pin control', () => {
      expect(component.pin).toBe(component.resetForm.get('pin'));
    });

    it('Exception: newPassword should return reset form newPassword control', () => {
      expect(component.newPassword).toBe(component.resetForm.get('newPassword'));
    });
  });

  // ─── step transitions & fallback messages ─────────────────────────────────

  describe('step transitions & fallback messages', () => {
    it('Normal: should render reset step after successful sendPin and detectChanges', () => {
      component.requestForm.setValue({ email: 'user@test.com' });
      component.sendPin();
      fixture.detectChanges();
      expect(component.step()).toBe('reset');
    });

    it('Boundary: should display successMsg after successful resetPassword', () => {
      component.requestForm.setValue({ email: 'user@test.com' });
      component.sendPin();
      component.resetForm.setValue({ email: 'user@test.com', pin: '123456', newPassword: 'newpass1' });
      component.resetPassword();
      fixture.detectChanges();
      expect(component.successMsg()).toContain('Password reset successfully');
    });

    it('Exception: should use fallback error when forgotPassword returns no message', () => {
      authStub.forgotPassword = vi.fn().mockReturnValue(
        throwError(() => ({ error: {} }))
      );
      component.requestForm.setValue({ email: 'x@x.com' });
      component.sendPin();
      expect(component.errorMsg()).toBe('Email not found.');
    });

    it('Exception: should use fallback error when resetPassword returns no message', () => {
      component.requestForm.setValue({ email: 'user@test.com' });
      component.sendPin();
      authStub.resetPassword = vi.fn().mockReturnValue(
        throwError(() => ({ error: {} }))
      );
      component.resetForm.setValue({ email: 'user@test.com', pin: '111111', newPassword: 'newpass1' });
      component.resetPassword();
      expect(component.errorMsg()).toBe('Invalid or expired PIN.');
    });

    it('Boundary: resetPassword should not call service when resetForm is invalid', () => {
      component.requestForm.setValue({ email: 'user@test.com' });
      component.sendPin();
      component.resetForm.setValue({ email: '', pin: '', newPassword: '' });
      component.resetPassword();
      expect(authStub.resetPassword).not.toHaveBeenCalled();
      expect(component.resetForm.touched).toBe(true);
    });
  });
});
