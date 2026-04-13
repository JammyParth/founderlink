import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InvestmentService } from './investment.service';
import { environment } from '../../../environments/environment';
import { InvestmentRequest, InvestmentResponse, InvestmentStatusUpdate } from '../../models';

const API = environment.apiUrl;

const mockInvestment: InvestmentResponse = {
  id: 100,
  startupId: 1,
  investorId: 20,
  amount: 25000,
  status: 'PENDING',
  createdAt: '2025-06-01T10:00:00'
};

describe('InvestmentService', () => {
  let service: InvestmentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InvestmentService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(InvestmentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    const req: InvestmentRequest = { startupId: 1, amount: 25000 };

    it('Normal: should POST /investments and return investment envelope', () => {
      service.create(req).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.status).toBe('PENDING');
        expect(res.data?.amount).toBe(25000);
      });
      const http = httpMock.expectOne(`${API}/investments`);
      expect(http.request.method).toBe('POST');
      expect(http.request.body).toEqual(req);
      http.flush({ message: 'Investment created', data: mockInvestment });
    });

    it('Boundary: should create investment with minimum amount of 1', () => {
      const minReq: InvestmentRequest = { startupId: 1, amount: 1 };
      service.create(minReq).subscribe(res => {
        expect(res.data?.amount).toBe(1);
      });
      const http = httpMock.expectOne(`${API}/investments`);
      http.flush({ message: 'ok', data: { ...mockInvestment, amount: 1 } });
    });

    it('Exception: should return normalised error on HTTP 400 when amount is invalid', () => {
      let errorEnv: any;
      service.create({ startupId: 1, amount: -500 }).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/investments`).flush(
        { message: 'Amount must be positive' },
        { status: 400, statusText: 'Bad Request' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.error).toBeTruthy();
    });
  });

  // ─── getMyPortfolio() ─────────────────────────────────────────────────────

  describe('getMyPortfolio()', () => {
    it('Normal: should GET /investments/investor and return investor portfolio', () => {
      service.getMyPortfolio().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.[0].investorId).toBe(20);
      });
      const http = httpMock.expectOne(`${API}/investments/investor`);
      expect(http.request.method).toBe('GET');
      http.flush({ message: 'ok', data: [mockInvestment] });
    });

    it('Boundary: should return empty portfolio for new investor', () => {
      service.getMyPortfolio().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/investments/investor`).flush({ message: 'ok', data: [] });
    });

    it('Exception: should normalise error on HTTP 401 (unauthenticated)', () => {
      let errorEnv: any;
      service.getMyPortfolio().subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/investments/investor`).flush(
        { message: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getStartupInvestments() ──────────────────────────────────────────────

  describe('getStartupInvestments()', () => {
    it('Normal: should GET /investments/startup/{id} and return startup investment list', () => {
      service.getStartupInvestments(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.[0].startupId).toBe(1);
      });
      const http = httpMock.expectOne(`${API}/investments/startup/1`);
      expect(http.request.method).toBe('GET');
      http.flush({ message: 'ok', data: [mockInvestment] });
    });

    it('Boundary: should handle startup with no investments (empty list)', () => {
      service.getStartupInvestments(2).subscribe(res => {
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/investments/startup/2`).flush({ message: 'ok', data: [] });
    });

    it('Exception: should return normalised error on HTTP 404 when startup does not exist', () => {
      let errorEnv: any;
      service.getStartupInvestments(9999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/investments/startup/9999`).flush(
        { message: 'Startup not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getById() ────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('Normal: should GET /investments/{id} and return single investment envelope', () => {
      service.getById(100).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.id).toBe(100);
        expect(res.data?.status).toBe('PENDING');
      });
      const http = httpMock.expectOne(`${API}/investments/100`);
      expect(http.request.method).toBe('GET');
      http.flush({ message: 'ok', data: mockInvestment });
    });

    it('Boundary: should fetch investment with id = 1 (minimum id)', () => {
      service.getById(1).subscribe(res => {
        expect(res.data?.id).toBe(1);
      });
      httpMock.expectOne(`${API}/investments/1`).flush({ message: 'ok', data: { ...mockInvestment, id: 1 } });
    });

    it('Exception: should return normalised error on HTTP 404', () => {
      let errorEnv: any;
      service.getById(9999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/investments/9999`).flush(
        { message: 'Investment not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.error).toContain('not found');
    });
  });

  // ─── updateStatus() ───────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('Normal: should PUT /investments/{id}/status and return updated investment', () => {
      const update: InvestmentStatusUpdate = { status: 'APPROVED' };
      const approved = { ...mockInvestment, status: 'APPROVED' as const };
      service.updateStatus(100, update).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.status).toBe('APPROVED');
      });
      const http = httpMock.expectOne(`${API}/investments/100/status`);
      expect(http.request.method).toBe('PUT');
      expect(http.request.body).toEqual(update);
      http.flush({ message: 'Updated', data: approved });
    });

    it('Boundary: should correctly set status to REJECTED', () => {
      const update: InvestmentStatusUpdate = { status: 'REJECTED' };
      service.updateStatus(100, update).subscribe(res => {
        expect(res.data?.status).toBe('REJECTED');
      });
      httpMock.expectOne(`${API}/investments/100/status`).flush({
        message: 'Updated',
        data: { ...mockInvestment, status: 'REJECTED' }
      });
    });

    it('Exception: should return normalised error on HTTP 403 when non-founder updates status', () => {
      let errorEnv: any;
      service.updateStatus(100, { status: 'APPROVED' }).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/investments/100/status`).flush(
        { message: 'Access denied' },
        { status: 403, statusText: 'Forbidden' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });
});
