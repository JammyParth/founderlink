import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataState, createInitialState } from '../../shared/models/data-state.model';
import { Investment } from '../../shared/models/investment.model';
import { InvestmentCreateDto } from '../../shared/models/investment.dto';
import { InvestmentService } from './investment.service';

@Injectable({
  providedIn: 'root'
})
export class InvestorInvestmentFacade {
  private investmentService = inject(InvestmentService);
  
  private listStateSubject = new BehaviorSubject<DataState<Investment[]>>(createInitialState());
  listState$: Observable<DataState<Investment[]>> = this.listStateSubject.asObservable();

  private mutateStateSubject = new BehaviorSubject<DataState<Investment>>(createInitialState());
  mutateState$: Observable<DataState<Investment>> = this.mutateStateSubject.asObservable();

  private detailStateSubject = new BehaviorSubject<DataState<Investment>>(createInitialState());
  detailState$: Observable<DataState<Investment>> = this.detailStateSubject.asObservable();

  loadInvestorPortfolio(): void {
    this.listStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.investmentService.getInvestorInvestments().subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.listStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.listStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to load portfolio' });
      }
    });
  }

  loadInvestmentById(id: number): void {
    this.detailStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.investmentService.getInvestmentById(id).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.detailStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
      } else {
        this.detailStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to load investment' });
      }
    });
  }

  createInvestment(data: InvestmentCreateDto): void {
    if (this.mutateStateSubject.value.loadingState === 'loading') return;
    this.mutateStateSubject.next({ data: null, loadingState: 'loading', error: null });
    
    this.investmentService.createInvestment(data).subscribe(envelope => {
      if (envelope.success && envelope.data) {
        this.mutateStateSubject.next({ data: envelope.data, loadingState: 'loaded', error: null });
        this.loadInvestorPortfolio(); // Refresh list
      } else {
        this.mutateStateSubject.next({ data: null, loadingState: 'error', error: envelope.error || 'Failed to create investment' });
      }
    });
  }

  clearMutateState(): void {
    this.mutateStateSubject.next(createInitialState());
  }

  clearDetailState(): void {
    this.detailStateSubject.next(createInitialState());
  }
}
