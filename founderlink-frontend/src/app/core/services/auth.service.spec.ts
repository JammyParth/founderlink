import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest } from '../../models';

const API = environment.apiUrl;

const mockAuthResponse: AuthResponse = {
  token: 'test-jwt-token',
  email: 'user@test.com',
  role: 'INVESTOR',
  userId: 42
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    routerSpy = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ─── register() ───────────────────────────────────────────────────────────

  describe('register()', () => {
    const req: RegisterRequest = { name: 'Alice', email: 'alice@test.com', password: 'Pass@1234', role: 'INVESTOR' };

    it('Normal: should POST to /auth/register and return server response', () => {
      service.register(req).subscribe(res => {
        expect(res).toEqual({ message: 'Registered successfully' });
      });
      const http = httpMock.expectOne(`${API}/auth/register`);
      expect(http.request.method).toBe('POST');
      expect(http.request.body).toEqual(req);
      http.flush({ message: 'Registered successfully' });
    });

    it('Boundary: should register user with minimum-length valid fields', () => {
      const minReq: RegisterRequest = { name: 'A', email: 'a@b.co', password: 'P@1', role: 'FOUNDER' };
      service.register(minReq).subscribe(res => {
        expect(res).toBeTruthy();
      });
      const http = httpMock.expectOne(`${API}/auth/register`);
      expect(http.request.body).toEqual(minReq);
      http.flush({ message: 'ok' });
    });

    it('Exception: should propagate HTTP 409 when email already exists', () => {
      let errorReceived = false;
      service.register(req).subscribe({
        error: err => {
          errorReceived = true;
          expect(err.status).toBe(409);
        }
      });
      httpMock.expectOne(`${API}/auth/register`).flush(
        { message: 'Email already exists' },
        { status: 409, statusText: 'Conflict' }
      );
      expect(errorReceived).toBe(true);
    });
  });

  // ─── login() ──────────────────────────────────────────────────────────────

  describe('login()', () => {
    const req: LoginRequest = { email: 'user@test.com', password: 'Pass@1234' };

    it('Normal: should POST /auth/login, update signals and store session in localStorage', () => {
      service.login(req).subscribe(res => {
        expect(res.token).toBe('test-jwt-token');
        expect(service.isLoggedIn()).toBe(true);
        expect(service.userId()).toBe(42);
        expect(service.role()).toBe('INVESTOR');
        expect(service.email()).toBe('user@test.com');
        expect(localStorage.getItem('token')).toBe('test-jwt-token');
        expect(localStorage.getItem('userId')).toBe('42');
      });
      const http = httpMock.expectOne(`${API}/auth/login`);
      expect(http.request.method).toBe('POST');
      expect(http.request.withCredentials).toBe(true);
      http.flush(mockAuthResponse);
    });

    it('Boundary: should correctly set ADMIN role signal', () => {
      const adminRes: AuthResponse = { token: 'admin-token', email: 'admin@test.com', role: 'ADMIN', userId: 1 };
      service.login(req).subscribe(() => {
        expect(service.role()).toBe('ADMIN');
        expect(service.userId()).toBe(1);
      });
      httpMock.expectOne(`${API}/auth/login`).flush(adminRes);
    });

    it('Exception: should not store session when HTTP 401 is returned', () => {
      let errorEmitted = false;
      service.login(req).subscribe({
        error: () => {
          errorEmitted = true;
          expect(service.isLoggedIn()).toBe(false);
          expect(localStorage.getItem('token')).toBeNull();
        }
      });
      httpMock.expectOne(`${API}/auth/login`).flush(
        { message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' }
      );
      expect(errorEmitted).toBe(true);
    });
  });

  // ─── refresh() ────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('Normal: should POST /auth/refresh and update session with new token', () => {
      const refreshed: AuthResponse = { ...mockAuthResponse, token: 'new-access-token' };
      service.refresh().subscribe(res => {
        expect(res.token).toBe('new-access-token');
        expect(service.token()).toBe('new-access-token');
        expect(localStorage.getItem('token')).toBe('new-access-token');
      });
      const http = httpMock.expectOne(`${API}/auth/refresh`);
      expect(http.request.method).toBe('POST');
      expect(http.request.withCredentials).toBe(true);
      http.flush(refreshed);
    });

    it('Boundary: should overwrite existing stale token in localStorage', () => {
      localStorage.setItem('token', 'old-expired-token');
      const renewed: AuthResponse = { ...mockAuthResponse, token: 'renewed-token' };
      service.refresh().subscribe(() => {
        expect(localStorage.getItem('token')).toBe('renewed-token');
        expect(localStorage.getItem('token')).not.toBe('old-expired-token');
      });
      httpMock.expectOne(`${API}/auth/refresh`).flush(renewed);
    });

    it('Exception: should propagate HTTP 401 when refresh token has expired', () => {
      let errorCaught = false;
      service.refresh().subscribe({
        error: err => {
          errorCaught = true;
          expect(err.status).toBe(401);
        }
      });
      httpMock.expectOne(`${API}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });
      expect(errorCaught).toBe(true);
    });
  });

  // ─── logout() ─────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('Normal: should POST /auth/logout, clear session and navigate to login', () => {
      localStorage.setItem('token', 'some-token');
      localStorage.setItem('userId', '42');
      service.logout();
      httpMock.expectOne(`${API}/auth/logout`).flush({});
      expect(service.isLoggedIn()).toBe(false);
      expect(localStorage.getItem('token')).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('Boundary: should behave correctly even when called on an already logged-out session', () => {
      service.logout();
      httpMock.expectOne(`${API}/auth/logout`).flush({});
      expect(service.isLoggedIn()).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('Exception: should still clear session and navigate even if server returns 500', () => {
      localStorage.setItem('token', 'some-token');
      service.logout();
      httpMock.expectOne(`${API}/auth/logout`).flush({}, { status: 500, statusText: 'Server Error' });
      expect(service.isLoggedIn()).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  // ─── forgotPassword() ─────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    const req: ForgotPasswordRequest = { email: 'user@test.com' };

    it('Normal: should POST /auth/forgot-password and return success response', () => {
      service.forgotPassword(req).subscribe(res => {
        expect(res).toEqual({ message: 'Reset PIN sent' });
      });
      const http = httpMock.expectOne(`${API}/auth/forgot-password`);
      expect(http.request.method).toBe('POST');
      expect(http.request.body).toEqual(req);
      http.flush({ message: 'Reset PIN sent' });
    });

    it('Boundary: should send email containing special characters (plus addressing)', () => {
      const specialReq: ForgotPasswordRequest = { email: 'user+tag@sub.domain.com' };
      service.forgotPassword(specialReq).subscribe();
      const http = httpMock.expectOne(`${API}/auth/forgot-password`);
      expect(http.request.body.email).toBe('user+tag@sub.domain.com');
      http.flush({});
    });

    it('Exception: should propagate HTTP 404 when email is not registered', () => {
      let errorReceived = false;
      service.forgotPassword({ email: 'notregistered@test.com' }).subscribe({
        error: err => {
          errorReceived = true;
          expect(err.status).toBe(404);
        }
      });
      httpMock.expectOne(`${API}/auth/forgot-password`).flush(
        { message: 'User not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorReceived).toBe(true);
    });
  });

  // ─── resetPassword() ──────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    const req: ResetPasswordRequest = { email: 'user@test.com', pin: '123456', newPassword: 'NewPass@1' };

    it('Normal: should POST /auth/reset-password with all required fields', () => {
      service.resetPassword(req).subscribe(res => {
        expect(res).toEqual({ message: 'Password reset successful' });
      });
      const http = httpMock.expectOne(`${API}/auth/reset-password`);
      expect(http.request.method).toBe('POST');
      expect(http.request.body).toEqual(req);
      http.flush({ message: 'Password reset successful' });
    });

    it('Boundary: should transmit a PIN of exactly 6 numeric characters (000000)', () => {
      const edgeReq: ResetPasswordRequest = { ...req, pin: '000000' };
      service.resetPassword(edgeReq).subscribe();
      const http = httpMock.expectOne(`${API}/auth/reset-password`);
      expect(http.request.body.pin).toBe('000000');
      expect(http.request.body.pin.length).toBe(6);
      http.flush({});
    });

    it('Exception: should propagate HTTP 400 when PIN is expired or invalid', () => {
      let errorCaught = false;
      service.resetPassword(req).subscribe({
        error: err => {
          errorCaught = true;
          expect(err.status).toBe(400);
        }
      });
      httpMock.expectOne(`${API}/auth/reset-password`).flush(
        { message: 'PIN has expired' },
        { status: 400, statusText: 'Bad Request' }
      );
      expect(errorCaught).toBe(true);
    });
  });

  // ─── clearSession() ───────────────────────────────────────────────────────

  describe('clearSession()', () => {
    it('Normal: should clear localStorage, reset all signals and navigate to login', () => {
      localStorage.setItem('token', 'tok');
      localStorage.setItem('userId', '5');
      localStorage.setItem('role', 'FOUNDER');
      localStorage.setItem('email', 'f@test.com');
      service.clearSession();
      expect(localStorage.getItem('token')).toBeNull();
      expect(service.token()).toBeNull();
      expect(service.userId()).toBeNull();
      expect(service.role()).toBeNull();
      expect(service.email()).toBeNull();
      expect(service.isLoggedIn()).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('Boundary: should not throw when called on an already empty session', () => {
      expect(() => service.clearSession()).not.toThrow();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('Exception: clearSession() can be called multiple times without side effects', () => {
      service.clearSession();
      service.clearSession();
      expect(routerSpy.navigate).toHaveBeenCalledTimes(2);
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  // ─── isLoggedIn computed signal ───────────────────────────────────────────

  describe('isLoggedIn (computed)', () => {
    it('Normal: should return true after a successful login', () => {
      expect(service.isLoggedIn()).toBe(false);
      service.login({ email: 'user@test.com', password: 'pass' }).subscribe();
      httpMock.expectOne(`${API}/auth/login`).flush(mockAuthResponse);
      expect(service.isLoggedIn()).toBe(true);
    });

    it('Boundary: should reflect token from localStorage on service initialisation', () => {
      localStorage.setItem('token', 'pre-existing-token');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [AuthService, { provide: Router, useValue: routerSpy }, provideHttpClient(), provideHttpClientTesting()]
      });
      const newService = TestBed.inject(AuthService);
      expect(newService.isLoggedIn()).toBe(true);
    });

    it('Exception: should return false when token is null in localStorage', () => {
      localStorage.removeItem('token');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [AuthService, { provide: Router, useValue: routerSpy }, provideHttpClient(), provideHttpClientTesting()]
      });
      const freshService = TestBed.inject(AuthService);
      expect(freshService.isLoggedIn()).toBe(false);
    });
  });
});
