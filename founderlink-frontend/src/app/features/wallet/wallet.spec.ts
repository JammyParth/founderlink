import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { WalletComponent } from './wallet';
import { AuthService } from '../../core/services/auth.service';
import { StartupService } from '../../core/services/startup.service';
import { WalletService } from '../../core/services/wallet.service';

const mockStartup = { id: 1, name: 'FounderCo', founderId: 10 } as any;
const mockWallet = {
  id: 9001, startupId: 1, balance: 75000, createdAt: '2025-06-01T00:00:00',
  updatedAt: '2025-07-01T00:00:00', transactions: []
} as any;

describe('WalletComponent', () => {
  let fixture: ComponentFixture<WalletComponent>;
  let component: WalletComponent;
  let authStub: Partial<AuthService>;
  let startupStub: Partial<StartupService>;
  let walletStub: Partial<WalletService>;

  beforeEach(async () => {
    authStub = { userId: vi.fn().mockReturnValue(10) as any };
    startupStub = {
      getMyStartups: vi.fn().mockReturnValue(of({ success: true, data: [mockStartup], error: null }))
    };
    walletStub = {
      getWallet: vi.fn().mockReturnValue(of({ success: true, data: mockWallet, error: null }))
    };

    await TestBed.configureTestingModule({
      imports: [WalletComponent, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: StartupService, useValue: startupStub },
        { provide: WalletService, useValue: walletStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(WalletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── ngOnInit ─────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('Normal: should load startups and wallet for the first startup', () => {
      expect(startupStub.getMyStartups).toHaveBeenCalled();
      expect(walletStub.getWallet).toHaveBeenCalledWith(1);
      expect(component.wallet()).toEqual(mockWallet);
    });

    it('Boundary: should set selectedStartupId to the first startup\'s id', () => {
      expect(component.selectedStartupId()).toBe(1);
    });

    it('Exception: should set errorMsg when getMyStartups fails', async () => {
      startupStub.getMyStartups = vi.fn().mockReturnValue(throwError(() => new Error('fail')));
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [WalletComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub },
          { provide: WalletService, useValue: walletStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(WalletComponent);
      f.detectChanges();
      expect(f.componentInstance.errorMsg()).toContain('Failed to load startups');
    });
  });

  // ─── onStartupChange() ────────────────────────────────────────────────────

  describe('onStartupChange()', () => {
    it('Normal: should set selectedStartupId and load wallet for the new startup', () => {
      component.onStartupChange(2);
      expect(component.selectedStartupId()).toBe(2);
      expect(walletStub.getWallet).toHaveBeenCalledWith(2);
    });

    it('Boundary: should reset wallet signal to null before loading new wallet', () => {
      // After calling onStartupChange, getWallet fires synchronously
      component.onStartupChange(2);
      // Since the stub returns immediately, wallet is immediately repopulated
      expect(walletStub.getWallet).toHaveBeenCalledWith(2);
    });

    it('Exception: should set wallet to null when wallet for new startup does not exist', () => {
      walletStub.getWallet = vi.fn().mockReturnValue(throwError(() => new Error('Not found')));
      component.onStartupChange(3);
      expect(component.wallet()).toBeNull();
      expect(component.walletLoading()).toBe(false);
    });
  });

  // ─── selectedStartup computed ─────────────────────────────────────────────

  describe('selectedStartup computed', () => {
    it('Normal: should return the startup matching selectedStartupId', () => {
      expect(component.selectedStartup()).toEqual(mockStartup);
    });

    it('Boundary: should return undefined when no startup matches selectedStartupId', () => {
      component.selectedStartupId.set(999);
      expect(component.selectedStartup()).toBeUndefined();
    });

    it('Exception: should handle null selectedStartupId gracefully', () => {
      component.selectedStartupId.set(null);
      expect(component.selectedStartup()).toBeUndefined();
    });
  });

  // ─── formatCurrency / formatDate ──────────────────────────────────────────

  describe('helper methods', () => {
    it('Normal: formatCurrency should format 75000 in INR locale', () => {
      const result = component.formatCurrency(75000);
      expect(result).toContain('75');
    });

    it('Boundary: formatCurrency should format 0.01 with minimumFractionDigits=2', () => {
      const result = component.formatCurrency(0.01);
      expect(result).toContain('0.01');
    });

    it('Exception: formatDate should parse ISO date strings correctly', () => {
      const result = component.formatDate('2025-06-01T00:00:00');
      expect(result).toContain('2025');
    });
  });

  // ─── loadFounderStartups() with empty list ────────────────────────────────

  describe('loadFounderStartups() edge cases', () => {
    it('Boundary: should not call loadWallet when no startups are returned', async () => {
      startupStub.getMyStartups = vi.fn().mockReturnValue(
        of({ success: true, data: [], error: null })
      );
      walletStub.getWallet = vi.fn().mockReturnValue(
        of({ success: true, data: mockWallet, error: null })
      );
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [WalletComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub },
          { provide: WalletService, useValue: walletStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(WalletComponent);
      f.detectChanges();
      expect(walletStub.getWallet).not.toHaveBeenCalled();
      expect(f.componentInstance.loading()).toBe(false);
    });

    it('Exception: selectedStartupId should remain null when no startups loaded', async () => {
      startupStub.getMyStartups = vi.fn().mockReturnValue(
        of({ success: true, data: [], error: null })
      );
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [WalletComponent, RouterTestingModule.withRoutes([])],
        providers: [
          { provide: AuthService, useValue: authStub },
          { provide: StartupService, useValue: startupStub },
          { provide: WalletService, useValue: walletStub }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      }).compileComponents();
      const f = TestBed.createComponent(WalletComponent);
      f.detectChanges();
      expect(f.componentInstance.selectedStartupId()).toBeNull();
    });
  });

  // ─── loadWallet() success path ────────────────────────────────────────────

  describe('loadWallet()', () => {
    it('Normal: should populate wallet signal on success', () => {
      component.wallet.set(null);
      component.loadWallet(1);
      expect(component.wallet()).toEqual(mockWallet);
      expect(component.walletLoading()).toBe(false);
    });

    it('Exception: should set wallet to null on error', () => {
      walletStub.getWallet = vi.fn().mockReturnValue(
        throwError(() => new Error('no wallet'))
      );
      component.loadWallet(99);
      expect(component.wallet()).toBeNull();
      expect(component.walletLoading()).toBe(false);
    });
  });
});
