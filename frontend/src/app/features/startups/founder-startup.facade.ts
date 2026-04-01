import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { Startup } from '../../shared/models/startup.model';
import { StartupCreateDto } from '../../shared/models/startup.dto';
import { StartupService } from './startup.service';

@Injectable({
  providedIn: 'root'
})
export class FounderStartupFacade {
  private startupService = inject(StartupService);
  
  // Public event bus to notify other facades of data invalidation
  public startupDeleted$ = new Subject<number>();
  public startupMutated$ = new Subject<void>();
  
  private listStateSubject = new BehaviorSubject<DataState<Startup[]>>(createInitialState());
  listState$: Observable<DataState<Startup[]>> = this.listStateSubject.asObservable();

  private mutateStateSubject = new BehaviorSubject<DataState<Startup>>(createInitialState());
  mutateState$: Observable<DataState<Startup>> = this.mutateStateSubject.asObservable();

  loadMyStartups(): void {
    this.listStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.startupService.getFounderStartups().subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.listStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.listStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to load your startups' });
      }
    });
  }

  create(data: StartupCreateDto): void {
    this.mutateStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.startupService.create(data).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.mutateStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
        this.startupMutated$.next();
        this.loadMyStartups(); // Refresh list
      } else {
        this.mutateStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to create startup' });
      }
    });
  }

  update(id: number, data: StartupCreateDto): void {
    this.mutateStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.startupService.update(id, data).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.mutateStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
        this.startupMutated$.next();
        this.loadMyStartups(); // Refresh list
      } else {
        this.mutateStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to update startup' });
      }
    });
  }

  delete(id: number): void {
    // Optimistically remove from list and mark reconciling
    const currentList = this.listStateSubject.value.data || [];
    this.listStateSubject.next({
      data: currentList.filter(s => s.id !== id),
      loadingState: 'reconciling',
      error: null
    });

    this.startupService.delete(id).subscribe(envelope => {
      if (envelope.success) {
        // Confirm loaded state without refetching immediately
        this.listStateSubject.next({ ...this.listStateSubject.value, loadingState: 'loaded' });
        this.startupDeleted$.next(id);
      } else {
        // Rollback and show error
        this.listStateSubject.next({ data: currentList, loadingState: 'error', error: envelope.error || 'Failed to delete startup' });
      }
    });
  }

  clearMutateState(): void {
    this.mutateStateSubject.next(createInitialState());
  }
}
