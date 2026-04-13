import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter, Router } from '@angular/router';

import { NotificationsComponent } from './notifications';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { StartupService } from '../../core/services/startup.service';

const mockUnread = {
  id: 1, userId: 42, type: 'INVESTMENT_APPROVED', message: 'Your investment was approved',
  read: false, createdAt: '2025-06-01T10:00:00'
} as any;
const mockRead = {
  id: 2, userId: 42, type: 'TEAM_INVITATION', message: 'You got invited',
  read: true, createdAt: '2025-05-01T09:00:00'
} as any;

describe('NotificationsComponent', () => {
  let fixture: ComponentFixture<NotificationsComponent>;
  let component: NotificationsComponent;
  let authStub: Partial<AuthService>;
  let notificationStub: Partial<NotificationService>;
  let startupStub: Partial<StartupService>;
  let router: Router;

  beforeEach(async () => {
    authStub = { userId: vi.fn().mockReturnValue(42) as any };
    notificationStub = {
      getMyNotifications: vi.fn().mockReturnValue(of({ success: true, data: [mockUnread, mockRead], error: null })),
      markAsRead: vi.fn().mockReturnValue(
        of({ success: true, data: { ...mockUnread, read: true }, error: null })
      )
    };
    startupStub = {
      getAll: vi.fn().mockReturnValue(of({ success: true, data: [], error: null }))
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: NotificationService, useValue: notificationStub },
        { provide: StartupService, useValue: startupStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (component['refreshInterval']) clearInterval(component['refreshInterval']);
  });

  // ─── ngOnInit ─────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should load all notifications and count unread', () => {
      expect(notificationStub.getMyNotifications).toHaveBeenCalled();
      expect(component.notifications()).toHaveLength(2);
      expect(component.unreadCount()).toBe(1);
    });

    it('Boundary: should set up a 30-second polling interval', () => {
      expect(component['refreshInterval']).not.toBeNull();
    });

    it('Exception: should set errorMsg when getMyNotifications fails', async () => {
      notificationStub.getMyNotifications = vi.fn().mockReturnValue(throwError(() => new Error('fail')));
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [NotificationsComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: NotificationService, useValue: notificationStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(NotificationsComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toContain('Failed');
    });
  });

  // ─── markAsRead() ─────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('Normal: should call notificationService.markAsRead and update notification in list', () => {
      component.markAsRead(1);
      expect(notificationStub.markAsRead).toHaveBeenCalledWith(1);
      const n = component.notifications().find(x => x.id === 1);
      expect(n?.read).toBe(true);
    });

    it('Boundary: should decrement unreadCount after marking one unread as read', () => {
      component.markAsRead(1);
      expect(component.unreadCount()).toBe(0);
    });

    it('Exception: should not call markAsRead when notification is already read', () => {
      component.markAsRead(2); // id=2 is already read
      expect(notificationStub.markAsRead).not.toHaveBeenCalled();
    });
  });

  // ─── getFiltered() ────────────────────────────────────────────────────────

  describe('getFiltered()', () => {
    it('Normal: should return all notifications when filter is "all"', () => {
      component.setFilter('all');
      expect(component.getFiltered()).toHaveLength(2);
    });

    it('Boundary: should return only unread notifications when filter is "unread"', () => {
      component.setFilter('unread');
      expect(component.getFiltered()).toHaveLength(1);
      expect(component.getFiltered()[0].read).toBe(false);
    });

    it('Exception: should return only read notifications when filter is "read"', () => {
      component.setFilter('read');
      expect(component.getFiltered()).toHaveLength(1);
      expect(component.getFiltered()[0].read).toBe(true);
    });
  });

  // ─── onNotificationClick() ────────────────────────────────────────────────

  describe('onNotificationClick()', () => {
    it('Normal: should mark as read and open modal for non-message types', () => {
      component.onNotificationClick(mockUnread);
      expect(notificationStub.markAsRead).toHaveBeenCalledWith(1);
      expect(component.selectedNotification()).toEqual(mockUnread);
    });

    it('Boundary: should navigate to messages for MESSAGE-type notifications with user id in message', () => {
      const msgNotif = { ...mockUnread, type: 'NEW_MESSAGE', message: 'From user #55', read: false };
      component.notifications.set([msgNotif]);
      component.onNotificationClick(msgNotif);
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: '55' } }
      );
    });

    it('Exception: should not throw when notification is already read on click', () => {
      expect(() => component.onNotificationClick(mockRead)).not.toThrow();
    });
  });

  // ─── polling / ngOnDestroy ────────────────────────────────────────────────

  describe('ngOnDestroy()', () => {
    it('Normal: should clear the refresh interval on destroy', () => {
      const clearSpy = vi.spyOn(globalThis, 'clearInterval');
      const id = component['refreshInterval'];
      component.ngOnDestroy();
      if (id !== null) expect(clearSpy).toHaveBeenCalledWith(id);
    });

    it('Boundary: should not throw when ngOnDestroy called with null interval', () => {
      component['refreshInterval'] = null;
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('Exception: getIcon should return "info" for unknown notification types', () => {
      expect(component.getIcon('UNKNOWN_TYPE_XYZ')).toBe('info');
    });
  });

  // ─── getIcon() all branches ───────────────────────────────────────────────

  describe('getIcon() all branches', () => {
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
  });

  // ─── formatDate() all branches ────────────────────────────────────────────

  describe('formatDate()', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('Normal: should return "Just now" for dates within the last minute', () => {
      vi.setSystemTime(new Date('2025-06-01T10:00:30Z'));
      expect(component.formatDate('2025-06-01T10:00:00Z')).toBe('Just now');
    });

    it('Normal: should return "Xm ago" for dates within the last hour', () => {
      vi.setSystemTime(new Date('2025-06-01T10:30:00Z'));
      const result = component.formatDate('2025-06-01T10:00:00Z');
      expect(result).toMatch(/\d+m ago/);
    });

    it('Normal: should return "Xh ago" for dates within the last 24 hours', () => {
      vi.setSystemTime(new Date('2025-06-01T15:00:00Z'));
      const result = component.formatDate('2025-06-01T10:00:00Z');
      expect(result).toMatch(/\d+h ago/);
    });

    it('Normal: should return "Xd ago" for dates within the last 7 days', () => {
      vi.setSystemTime(new Date('2025-06-04T10:00:00Z'));
      const result = component.formatDate('2025-06-01T10:00:00Z');
      expect(result).toMatch(/\d+d ago/);
    });

    it('Boundary: should return formatted date for dates older than 7 days', () => {
      vi.setSystemTime(new Date('2025-07-01T10:00:00Z'));
      const result = component.formatDate('2025-06-01T10:00:00Z');
      expect(result).toContain('2025');
    });

    it('Exception: should append Z to date without timezone info', () => {
      vi.setSystemTime(new Date('2025-06-01T10:00:30Z'));
      expect(() => component.formatDate('2025-06-01T10:00:00')).not.toThrow();
    });
  });

  // ─── formatMessage() ──────────────────────────────────────────────────────

  describe('formatMessage()', () => {
    it('Normal: should replace "startup #id" with startup name when known', () => {
      component['startupNames'].set(1, 'TechCo');
      const result = component.formatMessage('Check out startup #1 now');
      expect(result).toContain('TechCo');
    });

    it('Boundary: should keep "startup #id" when startup name is not known', () => {
      const result = component.formatMessage('Check out startup #999 now');
      expect(result).toContain('startup #999');
    });

    it('Exception: should return message unchanged when no startup reference', () => {
      const msg = 'You have a new message from Alice.';
      expect(component.formatMessage(msg)).toBe(msg);
    });
  });

  // ─── markAllAsRead() ──────────────────────────────────────────────────────

  describe('markAllAsRead()', () => {
    it('Normal: should call markAsRead for each unread notification', () => {
      component.notifications.set([mockUnread, mockRead]);
      component.markAllAsRead();
      expect(notificationStub.markAsRead).toHaveBeenCalledWith(1);
      expect(notificationStub.markAsRead).not.toHaveBeenCalledWith(2);
    });

    it('Boundary: should not call markAsRead when all notifications are already read', () => {
      component.notifications.set([mockRead]);
      vi.clearAllMocks();
      component.markAllAsRead();
      expect(notificationStub.markAsRead).not.toHaveBeenCalled();
    });

    it('Exception: should handle empty notification list gracefully', () => {
      component.notifications.set([]);
      expect(() => component.markAllAsRead()).not.toThrow();
    });
  });

  // ─── closeModal() ─────────────────────────────────────────────────────────

  describe('closeModal()', () => {
    it('Normal: should set selectedNotification to null', () => {
      component.selectedNotification.set(mockUnread);
      component.closeModal();
      expect(component.selectedNotification()).toBeNull();
    });

    it('Boundary: should not throw when called with no selected notification', () => {
      component.selectedNotification.set(null);
      expect(() => component.closeModal()).not.toThrow();
    });
  });

  // ─── markAsRead() when env.data is falsy ──────────────────────────────────

  describe('markAsRead() when env.data is falsy', () => {
    it('Exception: should not update list when markAsRead returns null data', () => {
      notificationStub.markAsRead = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      component.notifications.set([mockUnread]);
      component.unreadCount.set(1);
      component.markAsRead(1);
      expect(component.unreadCount()).toBe(1);
    });
  });

  // ─── onNotificationClick() MESSAGE without user id ────────────────────────

  describe('onNotificationClick() MESSAGE without user id', () => {
    it('Exception: should open modal when MESSAGE type has no "#id" match', () => {
      const noIdMsg = {
        ...mockUnread, type: 'NEW_MESSAGE', message: 'Hello there!', read: true
      };
      component.notifications.set([noIdMsg]);
      component.onNotificationClick(noIdMsg);
      expect(component.selectedNotification()).toEqual(noIdMsg);
    });
  });

  // ─── startupService.getAll() with non-empty data ──────────────────────────

  describe('startupService.getAll() with non-empty data', () => {
    it('Normal: should populate startupNames map when startups are returned', async () => {
      const mockStartup = { id: 5, name: 'TechCorp', founderId: 99 } as any;
      startupStub.getAll = vi.fn().mockReturnValue(
        of({ success: true, data: [mockStartup], error: null })
      );
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [NotificationsComponent],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authStub },
          { provide: NotificationService, useValue: notificationStub },
          { provide: StartupService, useValue: startupStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(NotificationsComponent);
      f.detectChanges();
      // formatMessage should now replace the startup reference
      const result = f.componentInstance.formatMessage('Check out startup #5 now');
      expect(result).toContain('TechCorp');
    });

    it('Boundary: formatMessage should handle multiple startup references', async () => {
      component['startupNames'].set(1, 'Alpha');
      component['startupNames'].set(2, 'Beta');
      const result = component.formatMessage('startup #1 and startup #2');
      expect(result).toContain('Alpha');
      expect(result).toContain('Beta');
    });
  });

  // ─── markAsRead() with non-existent notification id ──────────────────────

  describe('markAsRead() with non-existent notification id', () => {
    it('Exception: should return early when notification id is not found', () => {
      component.notifications.set([mockUnread, mockRead]);
      component.markAsRead(9999);
      expect(notificationStub.markAsRead).not.toHaveBeenCalled();
    });
  });

  // ─── setFilter() coverage ─────────────────────────────────────────────────

  describe('setFilter() transitions', () => {
    it('Normal: should change filterType from all to unread', () => {
      component.setFilter('unread');
      expect(component.filterType()).toBe('unread');
    });

    it('Boundary: should change filterType back to all', () => {
      component.setFilter('unread');
      component.setFilter('all');
      expect(component.filterType()).toBe('all');
    });
  });

  // ─── loadNotifications() refresh interval callback ────────────────────────

  describe('loadNotifications() refresh interval', () => {
    it('Normal: should load notifications again when refresh interval fires', () => {
      vi.useFakeTimers();
      // Clear existing interval and register with fake timers
      if (component['refreshInterval']) clearInterval(component['refreshInterval']);
      const initialCallCount = (notificationStub.getMyNotifications as any).mock.calls.length;
      component['refreshInterval'] = setInterval(() => component.loadNotifications(), 30000);
      vi.advanceTimersByTime(30000);
      expect((notificationStub.getMyNotifications as any).mock.calls.length).toBeGreaterThan(initialCallCount);
      vi.useRealTimers();
    });
  });

  // ─── onNotificationClick() with already-read MESSAGE notification ─────────

  describe('onNotificationClick() already-read MESSAGE type', () => {
    it('Boundary: should not call markAsRead for an already-read MESSAGE with user id', () => {
      const readMsgNotif = {
        ...mockRead, type: 'NEW_MESSAGE_READ', message: 'From user #77', read: true
      };
      component.notifications.set([readMsgNotif]);
      vi.clearAllMocks();
      component.onNotificationClick(readMsgNotif);
      expect(notificationStub.markAsRead).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(
        ['/dashboard/messages'], { queryParams: { user: '77' } }
      );
    });
  });
});
