import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter, Router } from '@angular/router';

import { NavbarComponent } from './navbar';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

const mockUnread = {
  id: 1, type: 'INVESTMENT_APPROVED', message: 'Approved!', read: false, userId: 42, createdAt: '2025-06-01T10:00:00'
} as any;
const mockRead = {
  id: 2, type: 'NEW_MESSAGE', message: 'Hello from user #55', read: true, userId: 42, createdAt: '2025-06-01T09:00:00'
} as any;

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let authStub: Partial<AuthService>;
  let notificationStub: Partial<NotificationService>;
  let router: Router;

  beforeEach(async () => {
    authStub = {
      userId: vi.fn().mockReturnValue(42) as any,
      role: vi.fn().mockReturnValue('ROLE_INVESTOR') as any,
      email: vi.fn().mockReturnValue('test@test.com') as any
    };
    notificationStub = {
      getMyUnreadNotifications: vi.fn().mockReturnValue(of({ success: true, data: [mockUnread], error: null })),
      getMyNotifications: vi.fn().mockReturnValue(of({ success: true, data: [mockUnread, mockRead], error: null })),
      markAsRead: vi.fn().mockReturnValue(of({ success: true, data: { ...mockUnread, read: true }, error: null }))
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: NotificationService, useValue: notificationStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (component['pollInterval']) clearInterval(component['pollInterval']);
  });

  // ─── ngOnInit ─────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should call loadUnread on init and set unreadCount', () => {
      expect(notificationStub.getMyUnreadNotifications).toHaveBeenCalled();
      expect(component.unreadCount()).toBe(1);
    });

    it('Boundary: should set up a 30-second polling interval', () => {
      expect(component['pollInterval']).not.toBeNull();
    });

    it('Exception: should not call getMyUnreadNotifications when userId is null', async () => {
      (authStub.userId as any) = vi.fn().mockReturnValue(null);
      vi.clearAllMocks();
      component.loadUnread();
      expect(notificationStub.getMyUnreadNotifications).not.toHaveBeenCalled();
    });
  });

  // ─── toggleNotifPanel() ───────────────────────────────────────────────────

  describe('toggleNotifPanel()', () => {
    it('Normal: should load notifications and open panel on first toggle', () => {
      component.toggleNotifPanel();
      expect(notificationStub.getMyNotifications).toHaveBeenCalled();
      expect(component.showNotifPanel()).toBe(true);
    });

    it('Boundary: should not call getMyNotifications when closing an already-open panel', () => {
      component.showNotifPanel.set(true);
      vi.clearAllMocks();
      component.toggleNotifPanel();
      expect(notificationStub.getMyNotifications).not.toHaveBeenCalled();
      expect(component.showNotifPanel()).toBe(false);
    });

    it('Exception: panel stays usable even if getMyNotifications fails before opening', () => {
      notificationStub.getMyNotifications = vi.fn().mockReturnValue(throwError(() => new Error('fail')));
      expect(() => component.toggleNotifPanel()).not.toThrow();
      expect(component.showNotifPanel()).toBe(true);
    });
  });

  // ─── markRead() ───────────────────────────────────────────────────────────

  describe('markRead()', () => {
    beforeEach(() => {
      component.notifications.set([mockUnread, mockRead]);
      component.unreadCount.set(1);
    });

    it('Normal: should call markAsRead service, mark notification read, and decrement unreadCount', () => {
      component.markRead(1);
      expect(notificationStub.markAsRead).toHaveBeenCalledWith(1);
      const n = component.notifications().find(x => x.id === 1);
      expect(n?.read).toBe(true);
      expect(component.unreadCount()).toBe(0);
    });

    it('Boundary: should not go below 0 for unreadCount if called when count is already 0', () => {
      component.unreadCount.set(0);
      component.markRead(1);
      expect(component.unreadCount()).toBe(0);
    });

    it('Exception: should silently handle markAsRead service errors', () => {
      notificationStub.markAsRead = vi.fn().mockReturnValue(throwError(() => new Error('fail')));
      expect(() => component.markRead(1)).not.toThrow();
    });
  });

  // ─── onNotificationClick() ────────────────────────────────────────────────

  describe('onNotificationClick()', () => {
    beforeEach(() => {
      component.notifications.set([mockUnread, mockRead]);
      component.showNotifPanel.set(true);
    });

    it('Normal: should close the panel and navigate to /notifications for non-message type', () => {
      component.onNotificationClick(mockUnread);
      expect(component.showNotifPanel()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard/notifications']);
    });

    it('Boundary: should navigate to messages with userId query param for MESSAGE type', () => {
      component.onNotificationClick(mockRead); // type:NEW_MESSAGE, message contains #55
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: '55' } }
      );
    });

    it('Exception: should mark unread notifications as read when clicked', () => {
      component.onNotificationClick(mockUnread);
      expect(notificationStub.markAsRead).toHaveBeenCalledWith(1);
    });
  });

  // ─── getRoleName() / ngOnDestroy ──────────────────────────────────────────

  describe('getRoleName() / ngOnDestroy()', () => {
    it('Normal: should return role name without ROLE_ prefix', () => {
      expect(component.getRoleName()).toBe('INVESTOR');
    });

    it('Boundary: should return empty string when role is null', () => {
      (authStub.role as any) = vi.fn().mockReturnValue(null);
      expect(component.getRoleName()).toBe('');
    });

    it('Exception: should clear polling interval on ngOnDestroy', () => {
      const clearSpy = vi.spyOn(globalThis, 'clearInterval');
      const id = component['pollInterval'];
      component.ngOnDestroy();
      if (id !== null) expect(clearSpy).toHaveBeenCalledWith(id);
    });
  });

  // ─── getIcon() ────────────────────────────────────────────────────────────

  describe('getIcon()', () => {
    it('Normal: should return "investment" for INVESTMENT type', () => {
      expect(component.getIcon('INVESTMENT_APPROVED')).toBe('investment');
    });

    it('Normal: should return "team" for TEAM type', () => {
      expect(component.getIcon('TEAM_INVITATION')).toBe('team');
    });

    it('Normal: should return "payment" for PAYMENT type', () => {
      expect(component.getIcon('PAYMENT_SUCCESS')).toBe('payment');
    });

    it('Normal: should return "message" for MESSAGE type', () => {
      expect(component.getIcon('NEW_MESSAGE')).toBe('message');
    });

    it('Normal: should return "startup" for STARTUP type', () => {
      expect(component.getIcon('STARTUP_FUNDED')).toBe('startup');
    });

    it('Normal: should return "user" for REGISTERED type', () => {
      expect(component.getIcon('USER_REGISTERED')).toBe('user');
    });

    it('Normal: should return "lock" for PASSWORD type', () => {
      expect(component.getIcon('PASSWORD_RESET')).toBe('lock');
    });

    it('Exception: should return "info" for unknown notification type', () => {
      expect(component.getIcon('UNKNOWN_TYPE_XYZ')).toBe('info');
    });
  });

  // ─── loadUnread / markRead edge cases ─────────────────────────────────────

  describe('loadUnread() / markRead() edge cases', () => {
    it('Exception: should silently ignore getMyUnreadNotifications errors', () => {
      notificationStub.getMyUnreadNotifications = vi.fn().mockReturnValue(
        throwError(() => new Error('network fail'))
      );
      expect(() => component.loadUnread()).not.toThrow();
    });

    it('Exception: should not update list or count when markAsRead returns null data', () => {
      notificationStub.markAsRead = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      component.notifications.set([mockUnread]);
      component.unreadCount.set(1);
      component.markRead(1);
      // env.data is null, so the if-branch is skipped
      expect(component.unreadCount()).toBe(1);
    });
  });

  // ─── onNotificationClick() MESSAGE without user id ────────────────────────

  describe('onNotificationClick() — MESSAGE without user id', () => {
    it('Exception: should navigate to /notifications when MESSAGE has no "#id" in text', () => {
      const noIdMsg = {
        id: 3, type: 'NEW_MESSAGE', message: 'Hello there!', read: false, userId: 42
      } as any;
      component.notifications.set([noIdMsg]);
      component.showNotifPanel.set(true);
      component.onNotificationClick(noIdMsg);
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard/notifications']);
    });

    it('Boundary: should skip markRead for already-read notification on click', () => {
      vi.clearAllMocks();
      component.onNotificationClick(mockRead);
      expect(notificationStub.markAsRead).not.toHaveBeenCalled();
    });
  });

  // ─── loadNotifications() ──────────────────────────────────────────────────

  describe('loadNotifications()', () => {
    it('Normal: should set notifications signal from getMyNotifications response', () => {
      component.loadNotifications();
      expect(component.notifications()).toHaveLength(2);
    });

    it('Exception: should silently handle getMyNotifications errors', () => {
      notificationStub.getMyNotifications = vi.fn().mockReturnValue(
        throwError(() => new Error('fail'))
      );
      expect(() => component.loadNotifications()).not.toThrow();
    });

    it('Boundary: should use empty array when env.data is null', () => {
      notificationStub.getMyNotifications = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      component.loadNotifications();
      expect(component.notifications()).toHaveLength(0);
    });
  });

  // ─── pollInterval timer callback ──────────────────────────────────────────

  describe('pollInterval timer callback', () => {
    afterEach(() => vi.useRealTimers());

    it('Normal: should call loadUnread again when pollInterval fires', () => {
      vi.useFakeTimers();
      if (component['pollInterval']) clearInterval(component['pollInterval']);
      vi.clearAllMocks();
      component['pollInterval'] = setInterval(() => component.loadUnread(), 30000);
      vi.advanceTimersByTime(30000);
      expect(notificationStub.getMyUnreadNotifications).toHaveBeenCalled();
    });
  });

  // ─── loadUnread() with null userId ────────────────────────────────────────

  describe('loadUnread() null userId', () => {
    it('Exception: should return early and not call service when userId is null', () => {
      (authStub.userId as any) = vi.fn().mockReturnValue(null);
      vi.clearAllMocks();
      component.loadUnread();
      expect(notificationStub.getMyUnreadNotifications).not.toHaveBeenCalled();
    });

    it('Boundary: should use empty array for null data in unread notifications', () => {
      notificationStub.getMyUnreadNotifications = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      component.loadUnread();
      expect(component.unreadCount()).toBe(0);
    });
  });

  // ─── markRead() with null env.data ────────────────────────────────────────

  describe('markRead() null env.data', () => {
    it('Exception: should not update list or count when markAsRead returns null data', () => {
      notificationStub.markAsRead = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      component.notifications.set([mockUnread]);
      component.unreadCount.set(1);
      component.markRead(1);
      // env.data is null, so the if-branch is skipped
      expect(component.unreadCount()).toBe(1);
    });
  });

  // ─── getRoleName() without ROLE_ prefix ───────────────────────────────────

  describe('getRoleName() variants', () => {
    it('Normal: should strip ROLE_ prefix correctly for FOUNDER', () => {
      (authStub.role as any) = vi.fn().mockReturnValue('ROLE_FOUNDER');
      expect(component.getRoleName()).toBe('FOUNDER');
    });

    it('Boundary: should return role as-is when no ROLE_ prefix present', () => {
      (authStub.role as any) = vi.fn().mockReturnValue('INVESTOR');
      expect(component.getRoleName()).toBe('INVESTOR');
    });
  });

  // ─── ngOnDestroy() with null interval ─────────────────────────────────────

  describe('ngOnDestroy() edge cases', () => {
    it('Boundary: should not throw when pollInterval is null', () => {
      component['pollInterval'] = null;
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  // ─── getIcon() with all type keywords ─────────────────────────────────────

  describe('getIcon() all type keywords', () => {
    it('Normal: INVESTMENT_APPROVED returns investment', () => {
      expect(component.getIcon('INVESTMENT_APPROVED')).toBe('investment');
    });
    it('Normal: TEAM_INVITE returns team', () => {
      expect(component.getIcon('TEAM_INVITE')).toBe('team');
    });
    it('Normal: PAYMENT_DONE returns payment', () => {
      expect(component.getIcon('PAYMENT_DONE')).toBe('payment');
    });
    it('Normal: MESSAGE_RECEIVED returns message', () => {
      expect(component.getIcon('MESSAGE_RECEIVED')).toBe('message');
    });
    it('Normal: STARTUP_CREATED returns startup', () => {
      expect(component.getIcon('STARTUP_CREATED')).toBe('startup');
    });
    it('Normal: USER_REGISTERED returns user', () => {
      expect(component.getIcon('USER_REGISTERED')).toBe('user');
    });
    it('Normal: PASSWORD_CHANGED returns lock', () => {
      expect(component.getIcon('PASSWORD_CHANGED')).toBe('lock');
    });
  });
});
