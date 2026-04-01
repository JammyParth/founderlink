import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { Investment } from '../../shared/models/investment.model';
import { InvestmentService } from './investment.service';

@Injectable({
  providedIn: 'root'
})
export class FounderInvestmentFacade {
  private investmentService = inject(InvestmentService);
  
  private listStateSubject = new BehaviorSubject<DataState<Investment[]>>(createInitialState());
  listState$: Observable<DataState<Investment[]>> = this.listStateSubject.asObservable();

  private mutateStateSubject = new BehaviorSubject<DataState<Investment>>(createInitialState());
  mutateState$: Observable<DataState<Investment>> = this.mutateStateSubject.asObservable();

  loadInvestmentsForStartup(startupId: number): void {
    this.listStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.investmentService.getStartupInvestments(startupId).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.listStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.listStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to load investments' });
      }
    });
  }

  updateStatus(investmentId: number, status: 'APPROVED' | 'REJECTED'): void {
    if (this.mutateStateSubject.value.loadingState === 'loading') return;
    this.mutateStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    // Optimistically update the list
    const currentList = this.listStateSubject.value.data || [];
    const index = currentList.findIndex(i => i.id === investmentId);
    if (index !== -1) {
      const newList = [...currentList];
      newList[index] = { ...newList[index], status: status as any };
      this.listStateSubject.next({ data: newList, loadingState: 'reconciling', error: null });
    }

    this.investmentService.updateStatus(investmentId, status).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.mutateStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
        
        // Confirm list state
        const confirmedList = this.listStateSubject.value.data || [];
        const confirmedIndex = confirmedList.findIndex(i => i.id === investmentId);
        if (confirmedIndex !== -1) {
          const finalNewList = [...confirmedList];
          finalNewList[confirmedIndex] = envelope.data;
          this.listStateSubject.next({ data: finalNewList, loadingState: 'loaded', error: null });
        }
      } else {
        this.mutateStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || `Failed to ${status.toLowerCase()} investment` });
        // Rollback list state on error
        this.listStateSubject.next({ data: currentList, loadingState: 'error', error: null });
      }
    });
  }
}
