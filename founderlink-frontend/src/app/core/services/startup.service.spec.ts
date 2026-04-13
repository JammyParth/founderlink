import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StartupService } from './startup.service';
import { environment } from '../../../environments/environment';
import { StartupRequest, StartupResponse } from '../../models';

const API = environment.apiUrl;

const mockStartup: StartupResponse = {
  id: 1,
  name: 'TechLaunch',
  description: 'Innovative SaaS platform',
  industry: 'Technology',
  problemStatement: 'Slow enterprise software',
  solution: 'Cloud-native microservices',
  fundingGoal: 500000,
  stage: 'MVP',
  founderId: 10,
  createdAt: '2025-01-01T00:00:00'
};

const mockRequest: StartupRequest = {
  name: 'TechLaunch',
  description: 'Innovative SaaS platform',
  industry: 'Technology',
  problemStatement: 'Slow enterprise software',
  solution: 'Cloud-native microservices',
  fundingGoal: 500000,
  stage: 'MVP'
};

describe('StartupService', () => {
  let service: StartupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StartupService]
    });
    service = TestBed.inject(StartupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── getAll() ─────────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('Normal: should GET /startup and return wrapped startup list', () => {
      service.getAll().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toHaveLength(1);
        expect(res.data?.[0].name).toBe('TechLaunch');
      });
      httpMock.expectOne(`${API}/startup`).flush({ message: 'ok', data: [mockStartup] });
    });

    it('Boundary: should handle an empty startup list', () => {
      service.getAll().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/startup`).flush({ message: 'ok', data: [] });
    });

    it('Exception: should return normalised error on HTTP 500', () => {
      let errorEnv: any;
      service.getAll().subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/startup`).flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.error).toBeTruthy();
    });
  });

  // ─── getPaged() ───────────────────────────────────────────────────────────

  describe('getPaged()', () => {
    it('Normal: should GET /startup?page=0&size=9 and return paged response', () => {
      const paged = { content: [mockStartup], page: 0, size: 9, totalElements: 1, totalPages: 1, last: true };
      service.getPaged(0).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.content).toHaveLength(1);
        expect(res.data?.totalPages).toBe(1);
      });
      const http = httpMock.expectOne(r => r.url === `${API}/startup` && r.params.get('page') === '0' && r.params.get('size') === '9');
      http.flush({ message: 'ok', data: paged });
    });

    it('Boundary: should request page 0 with custom size of 1', () => {
      const paged = { content: [mockStartup], page: 0, size: 1, totalElements: 100, totalPages: 100, last: false };
      service.getPaged(0, 1).subscribe(res => {
        expect(res.data?.size).toBe(1);
        expect(res.data?.totalPages).toBe(100);
      });
      const http = httpMock.expectOne(r => r.params.get('size') === '1');
      http.flush({ message: 'ok', data: paged });
    });

    it('Exception: should propagate error on 403 forbidden', () => {
      let errorEnv: any;
      service.getPaged(0).subscribe({ error: e => (errorEnv = e) });
      const http = httpMock.expectOne(r => r.url === `${API}/startup`);
      http.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── search() ─────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('Normal: should GET /startup/search with provided filters', () => {
      service.search({ industry: 'Technology', stage: 'MVP' }).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.[0].industry).toBe('Technology');
      });
      const http = httpMock.expectOne(r => r.url === `${API}/startup/search` &&
        r.params.get('industry') === 'Technology' && r.params.get('stage') === 'MVP');
      http.flush({ message: 'ok', data: [mockStartup] });
    });

    it('Boundary: should search with only minFunding=0 and maxFunding=0', () => {
      service.search({ minFunding: 0, maxFunding: 0 }).subscribe(res => {
        expect(res.success).toBe(true);
      });
      const http = httpMock.expectOne(r => r.url === `${API}/startup/search` &&
        r.params.get('minFunding') === '0' && r.params.get('maxFunding') === '0');
      http.flush({ message: 'ok', data: [] });
    });

    it('Exception: should return normalised error on HTTP 400 invalid filter', () => {
      let errorEnv: any;
      service.search({ minFunding: -1 }).subscribe({ error: e => (errorEnv = e) });
      const http = httpMock.expectOne(r => r.url === `${API}/startup/search`);
      http.flush({ message: 'Invalid filter' }, { status: 400, statusText: 'Bad Request' });
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── searchPaged() ────────────────────────────────────────────────────────

  describe('searchPaged()', () => {
    it('Normal: should include both filter params and pagination params', () => {
      const paged = { content: [mockStartup], page: 0, size: 9, totalElements: 1, totalPages: 1, last: true };
      service.searchPaged({ stage: 'IDEA' }, 0).subscribe(res => {
        expect(res.data?.content).toHaveLength(1);
      });
      const http = httpMock.expectOne(r =>
        r.url === `${API}/startup/search` &&
        r.params.get('stage') === 'IDEA' &&
        r.params.get('page') === '0'
      );
      http.flush({ message: 'ok', data: paged });
    });

    it('Boundary: should handle last page correctly (last=true)', () => {
      const lastPage = { content: [], page: 5, size: 9, totalElements: 45, totalPages: 5, last: true };
      service.searchPaged({}, 5).subscribe(res => {
        expect(res.data?.last).toBe(true);
      });
      const http = httpMock.expectOne(r => r.params.get('page') === '5');
      http.flush({ message: 'ok', data: lastPage });
    });

    it('Exception: should normalise error when search service is unavailable', () => {
      let errorEnv: any;
      service.searchPaged({}, 0).subscribe({ error: e => (errorEnv = e) });
      const http = httpMock.expectOne(r => r.url === `${API}/startup/search`);
      http.flush({}, { status: 503, statusText: 'Service Unavailable' });
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getDetails() ─────────────────────────────────────────────────────────

  describe('getDetails()', () => {
    it('Normal: should GET /startup/details/{id} and return startup envelope', () => {
      service.getDetails(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.id).toBe(1);
      });
      const http = httpMock.expectOne(`${API}/startup/details/1`);
      expect(http.request.method).toBe('GET');
      http.flush({ message: 'ok', data: mockStartup });
    });

    it('Boundary: should request details for startup with highest possible id (Number.MAX_SAFE_INTEGER)', () => {
      const bigId = Number.MAX_SAFE_INTEGER;
      service.getDetails(bigId).subscribe();
      const http = httpMock.expectOne(`${API}/startup/details/${bigId}`);
      http.flush({ message: 'ok', data: { ...mockStartup, id: bigId } });
    });

    it('Exception: should return normalised error on HTTP 404', () => {
      let errorEnv: any;
      service.getDetails(9999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/startup/details/9999`).flush(
        { message: 'Startup not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.error).toContain('not found');
    });
  });

  // ─── getMyStartups() ──────────────────────────────────────────────────────

  describe('getMyStartups()', () => {
    it('Normal: should GET /startup/founder and return founder startups', () => {
      service.getMyStartups().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.[0].founderId).toBe(10);
      });
      httpMock.expectOne(`${API}/startup/founder`).flush({ message: 'ok', data: [mockStartup] });
    });

    it('Boundary: should return empty list for founder with no startups', () => {
      service.getMyStartups().subscribe(res => {
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/startup/founder`).flush({ message: 'ok', data: [] });
    });

    it('Exception: should return normalised error on HTTP 401 (unauthenticated)', () => {
      let errorEnv: any;
      service.getMyStartups().subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/startup/founder`).flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('Normal: should POST /startup and return created startup envelope', () => {
      service.create(mockRequest).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.name).toBe('TechLaunch');
      });
      const http = httpMock.expectOne(`${API}/startup`);
      expect(http.request.method).toBe('POST');
      expect(http.request.body).toEqual(mockRequest);
      http.flush({ message: 'Created', data: mockStartup });
    });

    it('Boundary: should create startup with the minimum funding goal of 1', () => {
      const minReq: StartupRequest = { ...mockRequest, fundingGoal: 1 };
      service.create(minReq).subscribe(res => {
        expect(res.data?.fundingGoal).toBe(1);
      });
      const http = httpMock.expectOne(`${API}/startup`);
      http.flush({ message: 'Created', data: { ...mockStartup, fundingGoal: 1 } });
    });

    it('Exception: should return normalised error on HTTP 400 validation failure', () => {
      let errorEnv: any;
      service.create({ ...mockRequest, name: '' }).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/startup`).flush({ message: 'Name is required' }, { status: 400, statusText: 'Bad Request' });
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── update() ─────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('Normal: should PUT /startup/{id} and return updated startup', () => {
      const updated = { ...mockStartup, name: 'Renamed Startup' };
      service.update(1, { ...mockRequest, name: 'Renamed Startup' }).subscribe(res => {
        expect(res.data?.name).toBe('Renamed Startup');
      });
      const http = httpMock.expectOne(`${API}/startup/1`);
      expect(http.request.method).toBe('PUT');
      http.flush({ message: 'Updated', data: updated });
    });

    it('Boundary: should update startup stage to SCALING (final stage)', () => {
      service.update(1, { ...mockRequest, stage: 'SCALING' }).subscribe(res => {
        expect(res.data?.stage).toBe('SCALING');
      });
      const http = httpMock.expectOne(`${API}/startup/1`);
      http.flush({ message: 'Updated', data: { ...mockStartup, stage: 'SCALING' } });
    });

    it('Exception: should return normalised error on HTTP 403 (not the owner)', () => {
      let errorEnv: any;
      service.update(1, mockRequest).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/startup/1`).flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── delete() ─────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('Normal: should DELETE /startup/{id} and return null envelope', () => {
      service.delete(1).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toBeNull();
      });
      const http = httpMock.expectOne(`${API}/startup/1`);
      expect(http.request.method).toBe('DELETE');
      http.flush({ message: 'Deleted', data: null });
    });

    it('Boundary: should soft-delete startup and not throw even when data is null in response', () => {
      service.delete(1).subscribe(res => {
        expect(res.error).toBeNull();
      });
      httpMock.expectOne(`${API}/startup/1`).flush({ message: 'Deleted', data: null });
    });

    it('Exception: should return normalised error on HTTP 404 (already deleted)', () => {
      let errorEnv: any;
      service.delete(999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/startup/999`).flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
      expect(errorEnv.success).toBe(false);
    });
  });
});
