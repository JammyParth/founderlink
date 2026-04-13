import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WalletService } from './wallet.service';
import { environment } from '../../../environments/environment';
import { WalletResponse } from '../../models';

const API = environment.apiUrl;

const mockWallet: WalletResponse = {
  id: 6001,
  startupId: 1,
  balance: 75000,
  createdAt: '2025-06-01T00:00:00',
  updatedAt: '2025-06-15T00:00:00',
  transactions: []
} as any;

describe('WalletService', () => {
  let service: WalletService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WalletService]
    });
    service = TestBed.inject(WalletService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── getWallet() ──────────────────────────────────────────────────────────

  describe('getWallet()', () => {
    it('Normal: should GET /wallets/{startupId} and return wallet envelope', () => {
      service.getWallet(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.startupId).toBe(1);
        expect(res.data?.balance).toBe(75000);
      });
      const http = httpMock.expectOne(`${API}/wallets/1`);
      expect(http.request.method).toBe('GET');
      http.flush({ message: 'ok', data: mockWallet });
    });

    it('Boundary: should retrieve wallet for startup with id = 1 (minimum)', () => {
      service.getWallet(1).subscribe(res => {
        expect(res.data?.id).toBe(6001);
      });
      httpMock.expectOne(`${API}/wallets/1`).flush({ message: 'ok', data: mockWallet });
    });

    it('Exception: should return normalised error on HTTP 404 when wallet not yet created', () => {
      let errorEnv: any;
      service.getWallet(9999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/wallets/9999`).flush(
        { message: 'Wallet not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.error).toBeTruthy();
    });
  });

  // ─── createWallet() ───────────────────────────────────────────────────────

  describe('createWallet()', () => {
    it('Normal: should POST /wallets/{startupId} and return new wallet envelope', () => {
      const newWallet: WalletResponse = { ...mockWallet, balance: 0 } as any;
      service.createWallet(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.startupId).toBe(1);
        expect(res.data?.balance).toBe(0);
      });
      const http = httpMock.expectOne(`${API}/wallets/1`);
      expect(http.request.method).toBe('POST');
      http.flush({ message: 'Wallet created', data: newWallet });
    });

    it('Boundary: should be idempotent — return existing wallet no error when called twice', () => {
      service.createWallet(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.balance).toBe(75000); // existing wallet returned
      });
      httpMock.expectOne(`${API}/wallets/1`).flush({ message: 'Wallet already exists', data: mockWallet });
    });

    it('Exception: should return normalised error on HTTP 403 (non-founder creating wallet)', () => {
      let errorEnv: any;
      service.createWallet(1).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/wallets/1`).flush(
        { message: 'Only the startup founder can create a wallet' },
        { status: 403, statusText: 'Forbidden' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.data).toBeNull();
    });
  });

  // ─── balance edge cases ───────────────────────────────────────────────────

  describe('wallet balance edge cases', () => {
    it('Normal: should correctly parse a large balance value', () => {
      const richWallet = { ...mockWallet, balance: 9999999.99 };
      service.getWallet(1).subscribe(res => {
        expect(res.data?.balance).toBe(9999999.99);
      });
      httpMock.expectOne(`${API}/wallets/1`).flush({ message: 'ok', data: richWallet });
    });

    it('Boundary: should handle wallet with exact zero balance', () => {
      const zeroWallet = { ...mockWallet, balance: 0 };
      service.getWallet(2).subscribe(res => {
        expect(res.data?.balance).toBe(0);
      });
      httpMock.expectOne(`${API}/wallets/2`).flush({ message: 'ok', data: zeroWallet });
    });

    it('Exception: should return normalised error on HTTP 500 when wallet service is unavailable', () => {
      let errorEnv: any;
      service.getWallet(1).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/wallets/1`).flush({}, { status: 500, statusText: 'Internal Server Error' });
      expect(errorEnv.success).toBe(false);
    });
  });
});
