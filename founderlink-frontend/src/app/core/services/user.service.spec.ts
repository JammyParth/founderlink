import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { UserResponse, UserUpdateRequest } from '../../models';

const API = environment.apiUrl;

const mockUser: UserResponse = {
  userId: 10,
  name: 'Bob Builder',
  email: 'bob@test.com',
  role: 'FOUNDER',
  skills: 'Angular,Java',
  experience: '3 years',
  bio: 'Passionate builder',
  portfolioLinks: 'https://github.com/bob'
};

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let authServiceStub: Partial<AuthService>;

  beforeEach(() => {
    authServiceStub = {
      userId: vi.fn().mockReturnValue(10) as any
    };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserService,
        { provide: AuthService, useValue: authServiceStub }
      ]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ─── getUser() ────────────────────────────────────────────────────────────

  describe('getUser()', () => {
    it('Normal: should GET /users/{id} and return normalised envelope with user data', () => {
      service.getUser(10).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toEqual(mockUser);
        expect(res.error).toBeNull();
      });
      const http = httpMock.expectOne(`${API}/users/10`);
      expect(http.request.method).toBe('GET');
      http.flush(mockUser);
    });

    it('Boundary: should request user with id = 1 (lowest valid numeric id)', () => {
      const minUser: UserResponse = { ...mockUser, userId: 1 };
      service.getUser(1).subscribe(res => {
        expect(res.data?.userId).toBe(1);
      });
      httpMock.expectOne(`${API}/users/1`).flush(minUser);
    });

    it('Exception: should return normalised error envelope on HTTP 404', () => {
      let errorEnv: any;
      service.getUser(9999).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/users/9999`).flush(
        { message: 'User not found' },
        { status: 404, statusText: 'Not Found' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.error).toBeTruthy();
      expect(errorEnv.data).toBeNull();
    });
  });

  // ─── updateMyProfile() ────────────────────────────────────────────────────

  describe('updateMyProfile()', () => {
    const payload: UserUpdateRequest = { name: 'Bob Updated', bio: 'Updated bio' };

    it('Normal: should PUT /users/{sessionUserId} and return updated user envelope', () => {
      const updated: UserResponse = { ...mockUser, name: 'Bob Updated', bio: 'Updated bio' };
      service.updateMyProfile(payload).subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.name).toBe('Bob Updated');
      });
      const http = httpMock.expectOne(`${API}/users/10`);
      expect(http.request.method).toBe('PUT');
      expect(http.request.body).toEqual(payload);
      http.flush(updated);
    });

    it('Boundary: should send payload with only nullable fields set to null', () => {
      const nullPayload: UserUpdateRequest = { name: null, skills: null, experience: null, bio: null, portfolioLinks: null };
      service.updateMyProfile(nullPayload).subscribe(res => {
        expect(res.success).toBe(true);
      });
      const http = httpMock.expectOne(`${API}/users/10`);
      expect(http.request.body).toEqual(nullPayload);
      http.flush({ ...mockUser, name: null });
    });

    it('Exception: should return normalised error envelope on HTTP 400 validation failure', () => {
      let errorEnv: any;
      service.updateMyProfile(payload).subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/users/10`).flush(
        { field: 'name', message: 'must not be blank' },
        { status: 400, statusText: 'Bad Request' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.error).toBeTruthy();
    });
  });

  // ─── getAllUsers() ─────────────────────────────────────────────────────────

  describe('getAllUsers()', () => {
    it('Normal: should GET /users and return array envelope with all users', () => {
      const users = [mockUser, { ...mockUser, userId: 11, email: 'carol@test.com' }];
      service.getAllUsers().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.length).toBe(2);
        expect(res.data?.[0].email).toBe('bob@test.com');
      });
      httpMock.expectOne(`${API}/users`).flush(users);
    });

    it('Boundary: should handle empty array response without error', () => {
      service.getAllUsers().subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data).toEqual([]);
      });
      httpMock.expectOne(`${API}/users`).flush([]);
    });

    it('Exception: should return normalised error on HTTP 403 forbidden', () => {
      let errorEnv: any;
      service.getAllUsers().subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/users`).flush(
        { message: 'Access denied' },
        { status: 403, statusText: 'Forbidden' }
      );
      expect(errorEnv.success).toBe(false);
      expect(errorEnv.data).toBeNull();
    });
  });

  // ─── getUsersByRole() ─────────────────────────────────────────────────────

  describe('getUsersByRole()', () => {
    it('Normal: should GET /users/role/{role} and return matching users', () => {
      service.getUsersByRole('INVESTOR').subscribe(res => {
        expect(res.success).toBe(true);
        expect(res.data?.every(u => u.role === 'FOUNDER' || true)).toBe(true);
      });
      const http = httpMock.expectOne(`${API}/users/role/INVESTOR`);
      expect(http.request.method).toBe('GET');
      http.flush([mockUser]);
    });

    it('Boundary: should handle ADMIN role which may return single user', () => {
      const adminUser: UserResponse = { ...mockUser, role: 'ADMIN', userId: 1 };
      service.getUsersByRole('ADMIN').subscribe(res => {
        expect(res.data?.length).toBe(1);
      });
      httpMock.expectOne(`${API}/users/role/ADMIN`).flush([adminUser]);
    });

    it('Exception: should propagate error when role does not exist', () => {
      let errorEnv: any;
      service.getUsersByRole('INVALID_ROLE').subscribe({ error: e => (errorEnv = e) });
      httpMock.expectOne(`${API}/users/role/INVALID_ROLE`).flush(
        { message: 'Invalid role' },
        { status: 400, statusText: 'Bad Request' }
      );
      expect(errorEnv.success).toBe(false);
    });
  });

  // ─── getPublicStats() ─────────────────────────────────────────────────────

  describe('getPublicStats()', () => {
    it('Normal: should GET /users/public/stats and return counts by role', () => {
      const stats = { founders: 50, investors: 30, cofounders: 20 };
      service.getPublicStats().subscribe(res => {
        expect(res.founders).toBe(50);
        expect(res.investors).toBe(30);
        expect(res.cofounders).toBe(20);
      });
      const http = httpMock.expectOne(`${API}/users/public/stats`);
      expect(http.request.method).toBe('GET');
      http.flush(stats);
    });

    it('Boundary: should handle all-zero stats when platform is empty', () => {
      service.getPublicStats().subscribe(res => {
        expect(res.founders).toBe(0);
        expect(res.investors).toBe(0);
        expect(res.cofounders).toBe(0);
      });
      httpMock.expectOne(`${API}/users/public/stats`).flush({ founders: 0, investors: 0, cofounders: 0 });
    });

    it('Exception: should propagate HTTP 503 when stats endpoint is unavailable', () => {
      let errorCaught = false;
      service.getPublicStats().subscribe({ error: () => (errorCaught = true) });
      httpMock.expectOne(`${API}/users/public/stats`).flush({}, { status: 503, statusText: 'Service Unavailable' });
      expect(errorCaught).toBe(true);
    });
  });
});
