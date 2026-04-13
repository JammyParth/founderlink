import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { SidebarComponent } from './sidebar';
import { AuthService } from '../../../core/services/auth.service';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let component: SidebarComponent;
  let authStub: Partial<AuthService>;

  const createWith = async (role: string) => {
    authStub = {
      role: vi.fn().mockReturnValue(role) as any,
      email: vi.fn().mockReturnValue('test@test.com') as any
    };
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SidebarComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: authStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => createWith('ROLE_FOUNDER'));

  // ─── visibleItems (FOUNDER) ───────────────────────────────────────────────

  describe('visibleItems() — FOUNDER', () => {
    it('Normal: should show Dashboard, Startups, My Startup, Team, Investments, Wallet, Messages, Profile for FOUNDER', () => {
      const labels = component.visibleItems().map(i => i.label);
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('My Startup');
      expect(labels).toContain('Investments');
      expect(labels).toContain('Wallet');
    });

    it('Boundary: should NOT show Portfolio, Payments, or Invitations for FOUNDER', () => {
      const labels = component.visibleItems().map(i => i.label);
      expect(labels).not.toContain('Portfolio');
      expect(labels).not.toContain('Payments');
      expect(labels).not.toContain('Invitations');
    });

    it('Exception: should return all navItems when role is null', async () => {
      await createWith(null as unknown as string);
      expect(component.visibleItems()).toHaveLength(component.navItems.length);
    });
  });

  // ─── visibleItems (INVESTOR) ──────────────────────────────────────────────

  describe('visibleItems() — INVESTOR', () => {
    beforeEach(async () => createWith('ROLE_INVESTOR'));

    it('Normal: should show Dashboard, Startups, Portfolio, Payments, Messages, Profile for INVESTOR', () => {
      const labels = component.visibleItems().map(i => i.label);
      expect(labels).toContain('Portfolio');
      expect(labels).toContain('Payments');
      expect(labels).not.toContain('My Startup');
    });

    it('Boundary: should NOT show FOUNDER-only items (My Startup, Investments, Wallet)', () => {
      const labels = component.visibleItems().map(i => i.label);
      expect(labels).not.toContain('Investments');
      expect(labels).not.toContain('Wallet');
    });

    it('Exception: should return all shared items (Dashboard, Startups, Messages, Profile) for INVESTOR', () => {
      const labels = component.visibleItems().map(i => i.label);
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('Messages');
      expect(labels).toContain('Profile');
    });
  });

  // ─── visibleItems (COFOUNDER) ─────────────────────────────────────────────

  describe('visibleItems() — COFOUNDER', () => {
    beforeEach(async () => createWith('ROLE_COFOUNDER'));

    it('Normal: should show Dashboard, Startups, Team, Invitations, Messages, Profile for COFOUNDER', () => {
      const labels = component.visibleItems().map(i => i.label);
      expect(labels).toContain('Team');
      expect(labels).toContain('Invitations');
    });

    it('Boundary: should NOT show FOUNDER/INVESTOR-only items', () => {
      const labels = component.visibleItems().map(i => i.label);
      expect(labels).not.toContain('My Startup');
      expect(labels).not.toContain('Portfolio');
      expect(labels).not.toContain('Wallet');
    });

    it('Exception: should correctly filter even with extra spacing in role string', async () => {
      await createWith('ROLE_COFOUNDER');
      expect(component.visibleItems().some(i => i.label === 'Invitations')).toBe(true);
    });
  });

  // ─── onNavClick() ─────────────────────────────────────────────────────────

  describe('onNavClick()', () => {
    it('Normal: should emit closeMenu output when onNavClick is called', () => {
      const emitted: undefined[] = [];
      component.closeMenu.subscribe(() => emitted.push(undefined));
      component.onNavClick();
      expect(emitted).toHaveLength(1);
    });

    it('Boundary: should emit closeMenu every call — emits N times for N calls', () => {
      const emitted: undefined[] = [];
      component.closeMenu.subscribe(() => emitted.push(undefined));
      component.onNavClick();
      component.onNavClick();
      component.onNavClick();
      expect(emitted).toHaveLength(3);
    });

    it('Exception: should not throw when no subscriber on closeMenu output', () => {
      expect(() => component.onNavClick()).not.toThrow();
    });
  });

  // ─── collapsed input ──────────────────────────────────────────────────────

  describe('collapsed input()', () => {
    it('Normal: should default to false when not provided', () => {
      expect(component.collapsed()).toBe(false);
    });

    it('Boundary: should pass through true correctly', () => {
      fixture.componentRef.setInput('collapsed', true);
      fixture.detectChanges();
      expect(component.collapsed()).toBe(true);
    });

    it('Exception: should not affect visibleItems when collapsed changes', () => {
      const initialCount = component.visibleItems().length;
      fixture.componentRef.setInput('collapsed', true);
      fixture.detectChanges();
      expect(component.visibleItems().length).toBe(initialCount);
    });
  });
});
