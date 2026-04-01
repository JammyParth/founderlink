import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { Startup } from '../../shared/models/startup.model';
import { StartupService } from './startup.service';
import { FounderStartupFacade } from './founder-startup.facade';

@Injectable({
  providedIn: 'root'
})
export class StartupDiscoveryFacade implements OnDestroy {
  private startupService = inject(StartupService);
  private founderFacade = inject(FounderStartupFacade);
  
  private listStateSubject = new BehaviorSubject<DataState<Startup[]>>(createInitialState());
  listState$: Observable<DataState<Startup[]>> = this.listStateSubject.asObservable();

  private searchStateSubject = new BehaviorSubject<DataState<Startup[]>>(createInitialState());
  searchState$: Observable<DataState<Startup[]>> = this.searchStateSubject.asObservable();

  private isSearchActiveSubject = new BehaviorSubject<boolean>(false);
  isSearchActive$: Observable<boolean> = this.isSearchActiveSubject.asObservable();

  private subs = new Subscription();

  constructor() {
    this.subs.add(
      this.founderFacade.startupDeleted$.subscribe(id => this.removeStartupFromList(id))
    );
    this.subs.add(
      this.founderFacade.startupMutated$.subscribe(() => {
        // If they created/edited, refresh list state to be fresh
        this.loadAll();
      })
    );
  }

  loadAll(): void {
    this.isSearchActiveSubject.next(false);
    this.listStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.startupService.getAll().subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.listStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.listStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to load startups' });
      }
    });
  }

  search(filters: { industry?: string, stage?: string, minFunding?: number, maxFunding?: number }): void {
    this.isSearchActiveSubject.next(true);
    this.searchStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.startupService.search(filters).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.searchStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.searchStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Search failed' });
      }
    });
  }

  // Used to immediately remove a deleted startup from the list
  private removeStartupFromList(id: number): void {
    const currentListState = this.listStateSubject.value;
    if (currentListState.data) {
      this.listStateSubject.next({
        ...currentListState,
        data: currentListState.data.filter(s => s.id !== id)
      });
    }

    const currentSearchState = this.searchStateSubject.value;
    if (currentSearchState.data) {
      this.searchStateSubject.next({
        ...currentSearchState,
        data: currentSearchState.data.filter(s => s.id !== id)
      });
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
