import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MessagingService } from './messaging.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { MessageResponse } from '../../models';

const API = environment.apiUrl;

const mockMessage: MessageResponse = {
  id: 1,
  senderId: 42,
  receiverId: 55,
  content: 'Hello there!',
  createdAt: '2025-06-01T10:00:00'
} as any;

describe('MessagingService', () => {
  let service: MessagingService;
  let httpMock: HttpTestingController;
  let authStub: Partial<AuthService>;

  beforeEach(async () => {
    authStub = {
      userId: vi.fn().mockReturnValue(42) as any
    };
    await TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MessagingService,
        { provide: AuthService, useValue: authStub }
      ]
    });
    service = TestBed.inject(MessagingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── sendMessage() ────────────────────────────────────────────────────────

  describe('sendMessage()', () => {
    it('Normal: should POST /messages with senderId from session and return message envelope', () => {
      service.sendMessage(55, 'Hello there!').subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.senderId).toBe(42);
        expect(res.data?.content).toBe('Hello there!');
      });
      const http = httpMock.expectOne(`${API}/messages`);
      expect(http.request.method).toBe('POST');
      expect(http.request.body.senderId).toBe(42);
      expect(http.request.body.receiverId).toBe(55);
      expect(http.request.body.content).toBe('Hello there!');
      http.flush(mockMessage);
    });

    it('Boundary: should send message with content of exactly 1 character', () => {
      service.sendMessage(55, 'H').subscribe(res => {
        expect(res.data?.content).toBe('H');
      });
      const http = httpMock.expectOne(`${API}/messages`);
      expect(http.request.body.content.length).toBe(1);
      http.flush({ ...mockMessage, content: 'H' });
    });

    it('Exception: should return normalised error on HTTP 400 when content is empty', () => {
      let errorEnv: any;
      service.sendMessage(55, '').subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/messages`).flush(
        { message: 'Message content cannot be empty' },
        { status: 400, statusText: 'Bad Request' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getConversation() ────────────────────────────────────────────────────

  describe('getConversation()', () => {
    it('Normal: should GET /messages/conversation/{userId}/{partnerId} and return message list', () => {
      service.getConversation(55).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toHaveLength(1);
        expect(res.data?.[0].content).toBe('Hello there!');
      });
      const http = httpMock.expectOne(`${API}/messages/conversation/42/55`);
      expect(http.request.method).toBe('GET');
      http.flush([mockMessage]);
    });

    it('Boundary: should return empty conversation array for first contact', () => {
      service.getConversation(99).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/messages/conversation/42/99`).flush([]);
    });

    it('Exception: should return normalised error on HTTP 404 when partner does not exist', () => {
      let errorEnv: any;
      service.getConversation(9999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/messages/conversation/42/9999`).flush(
        { message: 'User not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getPartnerIds() ──────────────────────────────────────────────────────

  describe('getPartnerIds()', () => {
    it('Normal: should GET /messages/partners/{userId} and return array of partner ids', () => {
      service.getPartnerIds().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toContain(55);
      });
      const http = httpMock.expectOne(`${API}/messages/partners/42`);
      expect(http.request.method).toBe('GET');
      http.flush([55, 60, 70]);
    });

    it('Boundary: should return empty array for user who has never sent or received a message', () => {
      service.getPartnerIds().subscribe(res => {
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/messages/partners/42`).flush([]);
    });

    it('Exception: should return normalised error on HTTP 401', () => {
      let errorEnv: any;
      service.getPartnerIds().subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/messages/partners/42`).flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getById() ────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('Normal: should GET /messages/{id} and return single message envelope', () => {
      service.getById(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.id).toBe(1);
        expect(res.data?.content).toBe('Hello there!');
      });
      const http = httpMock.expectOne(`${API}/messages/1`);
      expect(http.request.method).toBe('GET');
      http.flush(mockMessage);
    });

    it('Boundary: should request message with minimum id = 1', () => {
      service.getById(1).subscribe(res => {
        expect(res.data?.id).toBe(1);
      });
      httpMock.expectOne(`${API}/messages/1`).flush({ ...mockMessage, id: 1 });
    });

    it('Exception: should return normalised error on HTTP 403 (not sender or receiver)', () => {
      let errorEnv: any;
      service.getById(999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/messages/999`).flush(
        { message: 'Access denied' },
        { status: 403, statusText: 'Forbidden' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── senderId derivation (security) ──────────────────────────────────────

  describe('senderId security', () => {
    it('Normal: senderId in POST body must always equal session userId, not the receiverId', () => {
      service.sendMessage(99, 'test').subscribe();
      const http = httpMock.expectOne(`${API}/messages`);
      expect(http.request.body.senderId).toBe(42);
      expect(http.request.body.senderId).not.toBe(99);
      http.flush(mockMessage);
    });

    it('Boundary: senderId should remain 42 even when receiverId equals senderId (self-message)', () => {
      service.sendMessage(42, 'Self message').subscribe();
      const http = httpMock.expectOne(`${API}/messages`);
      expect(http.request.body.senderId).toBe(42);
      expect(http.request.body.receiverId).toBe(42);
      http.flush(mockMessage);
    });

    it('Exception: should complete without throwing when AuthService.userId() is null (unauthenticated)', () => {
      (authStub.userId as any) = vi.fn().mockReturnValue(null);
      expect(() => service.sendMessage(55, 'test').subscribe()).not.toThrow();
      httpMock.expectOne(`${API}/messages`).flush(mockMessage);
    });
  });
});
