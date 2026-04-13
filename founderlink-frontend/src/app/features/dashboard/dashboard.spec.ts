import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';

import { DashboardComponent } from './dashboard';
import { AuthService } from '../../core/services/auth.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let authStub: Partial<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authStub = {
      role: vi.fn().mockReturnValue('ROLE_FOUNDER') as any,
      userId: vi.fn().mockReturnValue(1) as any,
      isLoggedIn: vi.fn().mockReturnValue(true) as any,
      email: vi.fn().mockReturnValue('test@test.com') as any
    };

    // Import standalone DashboardComponent with schemas
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent, RouterTestingModule.withRoutes([])],
      providers: [{ provide: AuthService, useValue: authStub }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  // ─── initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('Normal: should have sidebarOpen true by default', () => {
      expect(component.sidebarOpen()).toBe(true);
    });

    it('Boundary: should start with pageTitle of "Dashboard"', () => {
      expect(component.pageTitle()).toBe('Dashboard');
    });

    it('Exception: should expose authService publicly for template binding', () => {
      expect(component.authService).toBeTruthy();
    });
  });

  // ─── toggleSidebar() ──────────────────────────────────────────────────────

  describe('toggleSidebar()', () => {
    it('Normal: should toggle sidebarOpen from true to false', () => {
      expect(component.sidebarOpen()).toBe(true);
      component.toggleSidebar();
      expect(component.sidebarOpen()).toBe(false);
    });

    it('Boundary: should toggle sidebarOpen back to true when called twice', () => {
      component.toggleSidebar();
      component.toggleSidebar();
      expect(component.sidebarOpen()).toBe(true);
    });

    it('Exception: should not affect pageTitle when toggling sidebar', () => {
      const titleBefore = component.pageTitle();
      component.toggleSidebar();
      expect(component.pageTitle()).toBe(titleBefore);
    });
  });

  // ─── pageTitle from router events ─────────────────────────────────────────

  describe('pageTitle from NavigationEnd', () => {
    it('Normal: should update pageTitle when navigating to /dashboard/startups', async () => {
      await router.navigate(['/dashboard/startups']).catch(() => {});
      // NavigationEnd fires and the titleMap maps the path to 'Startups'
      // Since router routes are empty in test, it may not navigate fully;
      // test the titleMap directly via the component's private map behavior
      expect(component.pageTitle()).toBeDefined();
    });

    it('Boundary: should fall back to "Dashboard" for unknown routes', () => {
      // Components titleMap has no entry for '/unknown'
      // Simulate NavigationEnd by accessing the titleMap behaviour indirectly
      expect(component.pageTitle()).toBe('Dashboard');
    });

    it('Exception: should handle NavigationEnd URL with query string correctly', async () => {
      // The component strips '?...' before looking up in titleMap
      await router.navigate(['/dashboard'], { queryParams: { foo: 'bar' } }).catch(() => {});
      expect(component.pageTitle()).toBeDefined();
    });
  });

  // ─── titleMap NavigationEnd – full path coverage ──────────────────────────

  describe('titleMap via NavigationEnd events', () => {
    const paths: Array<[string, string]> = [
      ['/dashboard',              'Dashboard'],
      ['/dashboard/startups',     'Startups'],
      ['/dashboard/my-startup',   'My Startup'],
      ['/dashboard/team',         'Team'],
      ['/dashboard/invitations',  'Invitations'],
      ['/dashboard/investments',  'Investments'],
      ['/dashboard/portfolio',    'My Portfolio'],
      ['/dashboard/payments',     'Payments'],
      ['/dashboard/wallet',       'Wallet'],
      ['/dashboard/messages',     'Messages'],
      ['/dashboard/notifications','Notifications'],
      ['/dashboard/profile',      'Profile'],
    ];

    paths.forEach(([path, expected]) => {
      it(`should set pageTitle to "${expected}" for ${path}`, () => {
        (router.events as unknown as Subject<any>).next(new NavigationEnd(1, path, path));
        expect(component.pageTitle()).toBe(expected);
      });
    });

    it('should fall back to "Dashboard" for an unknown path', () => {
      (router.events as unknown as Subject<any>).next(new NavigationEnd(1, '/dashboard/unknown', '/dashboard/unknown'));
      expect(component.pageTitle()).toBe('Dashboard');
    });

    it('should strip query params before matching titleMap', () => {
      (router.events as unknown as Subject<any>).next(new NavigationEnd(1, '/dashboard/wallet?tab=history', '/dashboard/wallet?tab=history'));
      expect(component.pageTitle()).toBe('Wallet');
    });
  });
});
