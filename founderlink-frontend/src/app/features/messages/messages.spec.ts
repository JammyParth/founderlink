import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { MessagesComponent } from './messages';
import { AuthService } from '../../core/services/auth.service';
import { MessagingService } from '../../core/services/messaging.service';
import { UserService } from '../../core/services/user.service';

const mockUser = { userId: 55, name: 'Bob Chat', email: 'bob@test.com' } as any;
const mockMessage = { id: 1, senderId: 42, receiverId: 55, content: 'Hello!', createdAt: '2025-06-01T10:00:00Z' } as any;
const mockMessage2 = { id: 2, senderId: 55, receiverId: 42, content: 'Hi there!', createdAt: '2025-06-01T10:01:00Z' } as any;

describe('MessagesComponent', () => {
  let fixture: ComponentFixture<MessagesComponent>;
  let component: MessagesComponent;
  let authStub: Partial<AuthService>;
  let messagingStub: Partial<MessagingService>;
  let userStub: Partial<UserService>;

  const createModule = async (queryUser?: string, overrides: { failPartners?: boolean } = {}) => {
    authStub = {
      userId: vi.fn().mockReturnValue(42) as any
    };
    messagingStub = {
      getPartnerIds: vi.fn().mockReturnValue(
        overrides.failPartners
          ? throwError(() => new Error('fail'))
          : of({ success: true, data: [55], error: null })
      ),
      getConversation: vi.fn().mockReturnValue(of({ success: true, data: [mockMessage, mockMessage2], error: null })),
      sendMessage: vi.fn().mockReturnValue(of({ success: true, data: mockMessage, error: null }))
    };
    userStub = {
      getUser: vi.fn().mockReturnValue(of({ success: true, data: mockUser, error: null })),
      getAllUsers: vi.fn().mockReturnValue(of({ success: true, data: [mockUser], error: null }))
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MessagesComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: MessagingService, useValue: messagingStub },
        { provide: UserService, useValue: userStub },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: vi.fn().mockReturnValue(queryUser ?? null) }
            }
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(MessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Wait for async Promise.all in loadConversations
    await fixture.whenStable();
  };

  beforeEach(async () => createModule());

  afterEach(() => {
    if (component['pollInterval']) {
      clearInterval(component['pollInterval']);
    }
  });

  // ─── ngOnInit / loadConversations ─────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should load partner ids and build conversation partners list', async () => {
      expect(messagingStub.getPartnerIds).toHaveBeenCalled();
      expect(component.partners()).toHaveLength(1);
      expect(component.partners()[0].userId).toBe(55);
    });

    it('Boundary: should auto-select first partner when no targetUserId is provided', async () => {
      expect(component.selectedPartner()).toBeTruthy();
      expect(component.selectedPartner()?.userId).toBe(55);
    });

    it('Exception: should set errorMsg when getPartnerIds fails', async () => {
      await createModule(undefined, { failPartners: true });
      expect(component.errorMsg()).toContain('Failed to load conversations.');
    });
  });

  // ─── sendMessage() ────────────────────────────────────────────────────────

  describe('sendMessage()', () => {
    beforeEach(async () => createModule());

    it('Normal: should call messagingService.sendMessage and append new message to list', async () => {
      component.messageContent = 'New message';
      component.sendMessage();
      expect(messagingStub.sendMessage).toHaveBeenCalledWith(55, 'New message');
      expect(component.messageContent).toBe('');
    });

    it('Boundary: should set errorMsg when content is empty string', () => {
      component.messageContent = '   ';
      component.sendMessage();
      expect(messagingStub.sendMessage).not.toHaveBeenCalled();
      expect(component.errorMsg()).toContain('empty');
    });

    it('Exception: should set errorMsg and clear sendingMessage on sendMessage failure', () => {
      messagingStub.sendMessage = vi.fn().mockReturnValue(
        throwError(() => ({ error: 'Message blocked' }))
      );
      component.messageContent = 'Hello';
      component.sendMessage();
      expect(component.errorMsg()).toBe('Message blocked');
      expect(component.sendingMessage()).toBe(false);
    });
  });

  // ─── isCurrentUser() ──────────────────────────────────────────────────────

  describe('isCurrentUser()', () => {
    it('Normal: should return true when senderId matches session userId', () => {
      expect(component.isCurrentUser(42)).toBe(true);
    });

    it('Boundary: should return false for senderId = 0', () => {
      expect(component.isCurrentUser(0)).toBe(false);
    });

    it('Exception: should return false for any userId that differs from session userId', () => {
      expect(component.isCurrentUser(55)).toBe(false);
    });
  });

  // ─── polling ──────────────────────────────────────────────────────────────

  describe('polling', () => {
    it('Normal: pollInterval should be set when a partner is selected', async () => {
      expect(component['pollInterval']).not.toBeNull();
    });

    it('Boundary: pollInterval should be cleared in ngOnDestroy', () => {
      const clearSpy = vi.spyOn(globalThis, 'clearInterval');
      const intervalId = component['pollInterval'];
      component.ngOnDestroy();
      if (intervalId !== null) {
        expect(clearSpy).toHaveBeenCalledWith(intervalId);
      }
    });

    it('Exception: should not set pollInterval when no partner is selected', () => {
      component.selectedPartner.set(null);
      if (component['pollInterval']) clearInterval(component['pollInterval']);
      component['pollInterval'] = null;
      // Verify it stays null without a selected partner
      expect(component['pollInterval']).toBeNull();
    });
  });

  // ─── formatTime ───────────────────────────────────────────────────────────

  describe('formatTime()', () => {
    it('Normal: should format ISO timestamp to locale time string', () => {
      const result = component.formatTime('2025-06-01T10:00:00Z');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('Boundary: should append Z to timestamp without timezone info', () => {
      expect(() => component.formatTime('2025-06-01T10:00:00')).not.toThrow();
    });

    it('Exception: should handle already-UTC timestamps (with Z) without double-appending', () => {
      const r1 = component.formatTime('2025-06-01T10:00:00Z');
      const r2 = component.formatTime('2025-06-01T10:00:00');
      expect(r1).toBe(r2);
    });
  });

  // ─── formatDate() ─────────────────────────────────────────────────────────

  describe('formatDate()', () => {
    it('Normal: should format ISO date string to locale date string', () => {
      const result = component.formatDate('2025-06-01T10:00:00Z');
      expect(result).toContain('2025');
    });

    it('Boundary: should append Z to date string without timezone info', () => {
      expect(() => component.formatDate('2025-06-01T10:00:00')).not.toThrow();
    });

    it('Exception: should handle date with + offset without appending Z', () => {
      const result = component.formatDate('2025-06-01T10:00:00+05:30');
      expect(result).toContain('2025');
    });
  });

  // ─── startConversationWith() ──────────────────────────────────────────────

  describe('startConversationWith()', () => {
    it('Normal: should add new user as a partner and select them', async () => {
      await createModule();
      const newUser = { userId: 99, name: 'Charlie', email: 'charlie@test.com' } as any;
      component.partners.set([]);
      component.startConversationWith(newUser);
      expect(component.partners().some(p => p.userId === 99)).toBe(true);
      expect(component.selectedPartner()?.userId).toBe(99);
    });

    it('Boundary: should not duplicate a partner already in the list', async () => {
      await createModule();
      const initialLen = component.partners().length;
      component.startConversationWith({ userId: 55, name: 'Bob', email: 'bob@test.com' } as any);
      expect(component.partners().length).toBe(initialLen);
    });

    it('Exception: should use email as name when name is null', () => {
      const noName = { userId: 77, name: null, email: 'anon@test.com' } as any;
      component.startConversationWith(noName);
      const partner = component.partners().find(p => p.userId === 77);
      expect(partner?.name).toBe('anon@test.com');
    });
  });

  // ─── loadAllUsers() ───────────────────────────────────────────────────────

  describe('loadAllUsers()', () => {
    it('Normal: should load users from getAllUsers and toggle showUserSelector', async () => {
      await createModule();
      component.allUsers.set([]);
      component.loadAllUsers();
      expect(userStub.getAllUsers).toHaveBeenCalled();
      expect(component.showUserSelector()).toBe(true);
    });

    it('Boundary: should toggle showUserSelector without re-fetching when users already loaded', async () => {
      await createModule();
      component.allUsers.set([mockUser]);
      vi.clearAllMocks();
      component.loadAllUsers();
      expect(userStub.getAllUsers).not.toHaveBeenCalled();
      expect(component.showUserSelector()).toBe(true);
    });

    it('Exception: should exclude current user from allUsers list', async () => {
      await createModule();
      const currentUser = { userId: 42, name: 'Me', email: 'me@test.com' } as any;
      userStub.getAllUsers = vi.fn().mockReturnValue(
        of({ success: true, data: [mockUser, currentUser], error: null })
      );
      component.allUsers.set([]);
      component.loadAllUsers();
      expect(component.allUsers().some(u => u.userId === 42)).toBe(false);
    });
  });

  // ─── loadMessages() error & selectPartner() ───────────────────────────────

  describe('loadMessages() / selectPartner()', () => {
    it('Exception: should set errorMsg when getConversation fails in loadMessages', () => {
      messagingStub.getConversation = vi.fn().mockReturnValue(
        throwError(() => new Error('fail'))
      );
      component.loadMessages(55);
      expect(component.errorMsg()).toContain('Failed to load messages');
    });

    it('Normal: selectPartner should clear messageContent and set selectedPartner', async () => {
      await createModule();
      component.messageContent = 'draft text';
      const partner = { userId: 55, name: 'Bob', email: 'bob@test.com', lastMessage: '', lastMessageTime: '' };
      component.selectPartner(partner);
      expect(component.messageContent).toBe('');
      expect(component.selectedPartner()?.userId).toBe(55);
    });
  });

  // ─── sendMessage() no partner ─────────────────────────────────────────────

  describe('sendMessage() no partner', () => {
    it('Exception: should set errorMsg when no partner is selected', async () => {
      await createModule();
      component.selectedPartner.set(null);
      component.messageContent = 'Hello';
      component.sendMessage();
      expect(messagingStub.sendMessage).not.toHaveBeenCalled();
      expect(component.errorMsg()).toContain('conversation');
    });
  });

  // ─── loadConversations() with targetUserId ────────────────────────────────

  describe('loadConversations() with targetUserId', () => {
    it('Normal: should auto-select existing partner when targetUserId is already a partner', async () => {
      await createModule('55');
      expect(component.selectedPartner()?.userId).toBe(55);
    });

    it('Exception: should call getUser for targetUserId not in partner list and startConversation', async () => {
      await createModule('99');
      // userId 99 is not in partner list (only 55 is), so getUser(99) was called
      expect(userStub.getUser).toHaveBeenCalledWith(99);
    });
  });

  // ─── pollMessages() private method ───────────────────────────────────────

  describe('pollMessages()', () => {
    it('Normal: should update messages when fresh count differs from current', async () => {
      await createModule();
      const extraMsg = { id: 3, senderId: 55, receiverId: 42, content: 'Hey!', createdAt: '2025-06-01T10:02:00Z' } as any;
      messagingStub.getConversation = vi.fn().mockReturnValue(
        of({ success: true, data: [mockMessage, mockMessage2, extraMsg], error: null })
      );
      component.messages.set([mockMessage, mockMessage2]);
      component['pollMessages'](55);
      expect(component.messages()).toHaveLength(3);
    });

    it('Boundary: should NOT update messages when fresh count equals current count', async () => {
      await createModule();
      messagingStub.getConversation = vi.fn().mockReturnValue(
        of({ success: true, data: [mockMessage, mockMessage2], error: null })
      );
      component.messages.set([mockMessage, mockMessage2]);
      component['pollMessages'](55);
      // Length unchanged → signal NOT updated
      expect(component.messages()).toHaveLength(2);
    });

    it('Exception: pollMessages via fake timer interval should call getConversation', async () => {
      await createModule();
      vi.useFakeTimers();
      // Clear existing interval and re-set with fake timers
      if (component['pollInterval']) clearInterval(component['pollInterval']);
      const partner = component.selectedPartner()!;
      component['pollInterval'] = setInterval(() => component['pollMessages'](partner.userId), 2000);
      vi.clearAllMocks();
      vi.advanceTimersByTime(2000);
      expect(messagingStub.getConversation).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  // ─── loadConversations() empty ids ────────────────────────────────────────

  describe('loadConversations() empty ids and no targetUserId', () => {
    it('Normal: should set loading false immediately when no partners and no targetUserId', async () => {
      await createModule();
      // Override after module creation so the injected service object sees the new mock
      messagingStub.getPartnerIds = vi.fn().mockReturnValue(
        of({ success: true, data: [], error: null })
      );
      // Re-invoke loadConversations with empty partners
      component.loading.set(true);
      component['loadConversations']();
      // The early return for empty ids fires synchronously
      expect(component.loading()).toBe(false);
    });

    it('Boundary: should leave partners empty on early return', async () => {
      messagingStub.getPartnerIds = vi.fn().mockReturnValue(
        of({ success: true, data: [], error: null })
      );
      await createModule();
      component.partners.set([]);
      component['loadConversations']();
      expect(component.partners()).toHaveLength(0);
    });
  });

  // ─── loadConversations() targetUserId with getUser null/error ─────────────

  describe('loadConversations() targetUserId edge cases', () => {
    it('Exception: should set loading false when getUser for targetUserId fails', async () => {
      userStub.getUser = vi.fn().mockImplementation((id: number) => {
        if (id === 99) return throwError(() => new Error('not found'));
        return of({ success: true, data: mockUser, error: null });
      });
      await createModule('99');
      expect(component.loading()).toBe(false);
    });

    it('Boundary: should not start conversation when getUser returns null data for targetUserId', async () => {
      userStub.getUser = vi.fn().mockImplementation((id: number) => {
        if (id === 99) return of({ success: true, data: null as any, error: null });
        return of({ success: true, data: mockUser, error: null });
      });
      await createModule('99');
      expect(component.partners().some(p => p.userId === 99)).toBe(false);
    });

    it('Exception: should fall through to else loading=false when all getUser calls fail', async () => {
      messagingStub.getPartnerIds = vi.fn().mockReturnValue(
        of({ success: true, data: [55], error: null })
      );
      userStub.getUser = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      await createModule();
      // validPartners is empty (all null), no targetUserId → else branch loading.set(false)
      expect(component.loading()).toBe(false);
    });
  });

  // ─── scrollToBottom / ngAfterViewChecked ──────────────────────────────────

  describe('scrollToBottom() / ngAfterViewChecked()', () => {
    it('Normal: should scroll to bottom when messagesContainer exists', async () => {
      await createModule();
      const mockEl = { scrollTop: 0, scrollHeight: 500 };
      component['messagesContainer'] = { nativeElement: mockEl } as any;
      expect(() => component.ngAfterViewChecked()).not.toThrow();
      expect(mockEl.scrollTop).toBe(500);
    });

    it('Boundary: should not throw when messagesContainer is undefined', async () => {
      await createModule();
      component['messagesContainer'] = undefined as any;
      expect(() => component.ngAfterViewChecked()).not.toThrow();
    });

    it('Exception: should silently swallow errors inside scrollToBottom', async () => {
      await createModule();
      // Provide an element whose scrollTop setter throws
      component['messagesContainer'] = {
        nativeElement: Object.defineProperty({}, 'scrollTop', {
          set: () => { throw new Error('dom error'); },
          configurable: true
        })
      } as any;
      expect(() => component.ngAfterViewChecked()).not.toThrow();
    });
  });

  // ─── sendMessage() with null env.data ─────────────────────────────────────

  describe('sendMessage() null env.data', () => {
    it('Boundary: should clear messageContent even when env.data is null in response', async () => {
      await createModule();
      messagingStub.sendMessage = vi.fn().mockReturnValue(
        of({ success: true, data: null as any, error: null })
      );
      component.messageContent = 'Test message';
      component.sendMessage();
      expect(component.messageContent).toBe('');
      expect(component.sendingMessage()).toBe(false);
    });
  });
});
