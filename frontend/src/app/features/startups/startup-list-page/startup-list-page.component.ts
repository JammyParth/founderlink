import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SessionFacade } from '../../../core/auth/session.facade';
import { StartupDiscoveryFacade } from '../startup-discovery.facade';
import { StartupFilterBarComponent } from '../components/startup-filter-bar.component';

@Component({
  selector: 'app-startup-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink, StartupFilterBarComponent],
  template: `
    <div class="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white">
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div class="max-w-3xl">
          <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">FounderLink</p>
          <h1 class="mt-4 text-4xl sm:text-5xl font-bold tracking-tight">Discover startups before you log in.</h1>
          <p class="mt-5 text-lg text-slate-300">
            Browse active fundraising opportunities, review each startup, and sign in when you are ready to connect or invest.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a routerLink="/startups" class="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold px-5 py-3 rounded-lg">
              Explore all startups
            </a>
            <a routerLink="/auth/login" class="border border-white/20 hover:border-white/40 hover:bg-white/5 px-5 py-3 rounded-lg font-medium">
              Login to connect
            </a>
          </div>
        </div>
      </section>
    </div>

    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 class="text-3xl font-bold text-gray-900">Startup marketplace</h2>
          <p class="mt-2 text-gray-600">Anonymous visitors can browse listings. Messaging and investing stay behind authentication.</p>
        </div>
        <a routerLink="/startups" class="text-sm font-semibold text-blue-600 hover:text-blue-800">Open full discovery page</a>
      </div>

      <app-startup-filter-bar (filterChanged)="onSearch($event)"></app-startup-filter-bar>

      <ng-container *ngIf="facade.isSearchActive$ | async as isSearchActive">
        <ng-container *ngIf="(isSearchActive ? facade.searchState$ : facade.listState$) | async as state">
          <div *ngIf="state.loadingState === 'loading'" class="flex justify-center items-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>

          <div *ngIf="state.loadingState === 'error'" class="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
            <p>{{ state.error }}</p>
            <button (click)="loadAll()" class="mt-2 text-sm underline hover:text-red-900">Try again</button>
          </div>

          <div *ngIf="state.loadingState === 'loaded' || state.loadingState === 'reconciling'">
            <div *ngIf="state.data?.length === 0" class="text-center py-20 bg-white rounded-lg border border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">{{ isSearchActive ? 'No search results found' : 'No startups found' }}</h3>
              <p class="mt-2 text-sm text-gray-500">Try adjusting your filters or check back later.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <article *ngFor="let startup of state.data" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div class="p-6 flex-1">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h3 class="text-xl font-bold text-gray-900">{{ startup.name }}</h3>
                      <p class="mt-1 text-sm text-gray-500">{{ startup.industry }}</p>
                    </div>
                    <span class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                      {{ startup.stage }}
                    </span>
                  </div>

                  <p class="mt-4 text-sm leading-6 text-gray-700 line-clamp-4">{{ startup.description }}</p>

                  <div class="mt-6 grid grid-cols-2 gap-4 text-sm">
                    <div class="rounded-xl bg-slate-50 p-4">
                      <div class="text-gray-500">Funding goal</div>
                      <div class="mt-1 font-semibold text-gray-900">{{ startup.fundingGoal | currency:'USD':'symbol':'1.0-0' }}</div>
                    </div>
                    <div class="rounded-xl bg-slate-50 p-4">
                      <div class="text-gray-500">Access</div>
                      <div class="mt-1 font-semibold text-gray-900">Public profile</div>
                    </div>
                  </div>
                </div>

                <div class="border-t border-gray-200 bg-gray-50 p-6 flex flex-wrap gap-3">
                  <a [routerLink]="['/startups', startup.id]" class="flex-1 min-w-[140px] text-center bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-lg">
                    View Startup
                  </a>
                  <a
                    *ngIf="(sessionFacade.session$ | async)?.status !== 'authenticated'"
                    routerLink="/auth/login"
                    [queryParams]="{ returnUrl: '/startups/' + startup.id }"
                    class="flex-1 min-w-[180px] text-center border border-blue-200 text-blue-700 hover:bg-blue-50 font-medium py-2.5 px-4 rounded-lg"
                  >
                    Login to connect/message
                  </a>
                </div>
              </article>
            </div>
          </div>
        </ng-container>
      </ng-container>
    </section>
  `
})
export class StartupListPageComponent implements OnInit {
  readonly facade = inject(StartupDiscoveryFacade);
  readonly sessionFacade = inject(SessionFacade);

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.facade.loadAll();
  }

  onSearch(filters: Record<string, unknown>): void {
    if (Object.keys(filters).length === 0) {
      this.loadAll();
      return;
    }

    this.facade.search(filters);
  }
}
