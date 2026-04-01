import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { Startup } from '../../shared/models/startup.model';
import { StartupService } from './startup.service';

@Injectable({
  providedIn: 'root'
})
export class StartupDetailFacade {
  private startupService = inject(StartupService);
  
  private stateSubject = new BehaviorSubject<DataState<Startup>>(createInitialState());
  state$: Observable<DataState<Startup>> = this.stateSubject.asObservable();

  loadById(id: number): void {
    this.stateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.startupService.getById(id).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.stateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.stateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to load startup details' });
      }
    });
  }

  clear(): void {
    this.stateSubject.next(createInitialState());
  }
}
