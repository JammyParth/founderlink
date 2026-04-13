import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { NotificationResponse } from '../../models';

const API = environment.apiUrl;

const mockNotification: NotificationResponse = {
  id: 1,
  userId: 42,
  type: 'INVESTMENT_APPROVED',
  message: 'Your investment has been approved',
  read: false,
  createdAt: '2025-06-01T10:00:00'
} as any;

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let authStub: Partial<AuthService>;

  beforeEach(() => {
    authStub = {
      userId: vi.fn().mockReturnValue(42) as any
    };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NotificationService,
        { provide: AuthService, useValue: authStub }
      ]
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── getMyNotifications() ─────────────────────────────────────────────────

  describe('getMyNotifications()', () => {
    it('Normal: should GET /notifications/{userId} and return array envelope', () => {
      service.getMyNotifications().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toHaveLength(1);
        expect(res.data?.[0].type).toBe('INVESTMENT_APPROVED');
      });
      const http = httpMock.expectOne(`${API}/notifications/42`);
      expect(http.request.method).toBe('GET');
      http.flush([mockNotification]);
    });

    it('Boundary: should handle user with no notifications (empty array)', () => {
      service.getMyNotifications().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/notifications/42`).flush([]);
    });

    it('Exception: should return normalised error on HTTP 401', () => {
      let errorEnv: any;
      service.getMyNotifications().subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/notifications/42`).flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.data).toBeNull();
    });
  });

  // ─── getMyUnreadNotifications() ───────────────────────────────────────────

  describe('getMyUnreadNotifications()', () => {
    it('Normal: should GET /notifications/{userId}/unread and return only unread notifications', () => {
      service.getMyUnreadNotifications().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.[0].read).toBe(false);
      });
      const http = httpMock.expectOne(`${API}/notifications/42/unread`);
      expect(http.request.method).toBe('GET');
      http.flush([mockNotification]);
    });

    it('Boundary: should return empty array when all notifications are already read', () => {
      service.getMyUnreadNotifications().subscribe(res => {
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/notifications/42/unread`).flush([]);
    });

    it('Exception: should return normalised error on HTTP 403 forbidden', () => {
      let errorEnv: any;
      service.getMyUnreadNotifications().subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/notifications/42/unread`).flush(
        { message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── markAsRead() ─────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('Normal: should PUT /notifications/{id}/read and return updated notification', () => {
      const readNotification: NotificationResponse = { ...mockNotification, read: true } as any;
      service.markAsRead(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.read).toBe(true);
      });
      const http = httpMock.expectOne(`${API}/notifications/1/read`);
      expect(http.request.method).toBe('PUT');
      http.flush(readNotification);
    });

    it('Boundary: should mark notification with id = 1 (minimum) as read', () => {
      service.markAsRead(1).subscribe(res => {
        expect(res.data?.id).toBe(1);
      });
      httpMock.expectOne(`${API}/notifications/1/read`).flush({ ...mockNotification, id: 1, read: true });
    });

    it('Exception: should return normalised error on HTTP 404 when notification does not exist', () => {
      let errorEnv: any;
      service.markAsRead(9999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/notifications/9999/read`).flush(
        { message: 'Notification not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.error).toBeTruthy();
    });
  });

  // ─── userId integration ───────────────────────────────────────────────────

  describe('AuthService userId integration', () => {
    it('Normal: should use session userId from AuthService to construct request URL', () => {
      service.getMyNotifications().subscribe();
      const req = httpMock.expectOne(`${API}/notifications/42`);
      expect(req.request.url).toContain('/42');
      req.flush([]);
    });

    it('Boundary: should use userId = 1 for admin with low user id', () => {
      (authStub.userId as any) = vi.fn().mockReturnValue(1);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [NotificationService, { provide: AuthService, useValue: authStub }]
      });
      const svc = TestBed.inject(NotificationService);
      const mock = TestBed.inject(HttpTestingController);
      svc.getMyNotifications().subscribe();
      mock.expectOne(`${API}/notifications/1`).flush([]);
      mock.verify();
    });

    it('Exception: should complete without throwing when AuthService.userId() returns null', () => {
      (authStub.userId as any) = vi.fn().mockReturnValue(null);
      expect(() => service.getMyNotifications().subscribe()).not.toThrow();
      httpMock.expectOne(`${API}/notifications/null`).flush([]);
    });
  });
});
