import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InvestmentService } from '../../../core/services/investment.service';
import { StartupService } from '../../../core/services/startup.service';
import { InvestmentResponse, InvestmentStatus } from '../../../models';

@Component({
  selector: 'app-portfolio',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './portfolio.html',
  styleUrl: './portfolio.css'
})
export class PortfolioComponent implements OnInit {
  private allInvestments = signal<InvestmentResponse[]>([]);
  loading     = signal(true);
  errorMsg    = signal('');
  filterStatus = '';
  startupNames = signal<Map<number, string>>(new Map());
  founderIds   = signal<Map<number, number>>(new Map());

  // Client-side pagination
  currentPage   = signal(0);
  readonly pageSize = 10;

  constructor(
    public authService: AuthService,
    private investmentService: InvestmentService,
    private startupService: StartupService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.investmentService.getMyPortfolio().subscribe({
      next: env => { this.allInvestments.set(env.data ?? []); this.loading.set(false); },
      error: env => { this.errorMsg.set(env.error ?? 'Failed to load portfolio.'); this.loading.set(false); }
    });

    this.startupService.getAll().subscribe({
      next: env => {
        const nameMap = new Map<number, string>();
        const idMap   = new Map<number, number>();
        env.data?.forEach(s => {
          nameMap.set(s.id, s.name);
          idMap.set(s.id, s.founderId);
        });
        this.startupNames.set(nameMap);
        this.founderIds.set(idMap);
      }
    });
  }

  messageFounder(startupId: number): void {
    const founderId = this.founderIds().get(startupId);
    if (founderId) {
      this.router.navigate(['/dashboard/messages'], { queryParams: { user: founderId } });
    }
  }

  // Stats are always computed from ALL investments (accurate totals)
  get totalInvested(): number   { return this.allInvestments().reduce((s, i) => s + i.amount, 0); }
  get completedAmount(): number { return this.allInvestments().filter(i => i.status === 'COMPLETED').reduce((s, i) => s + i.amount, 0); }
  get pendingAmount(): number   { return this.allInvestments().filter(i => i.status === 'PENDING').reduce((s, i) => s + i.amount, 0); }
  get approvedAmount(): number  { return this.allInvestments().filter(i => i.status === 'APPROVED').reduce((s, i) => s + i.amount, 0); }

  // Filtered set (all pages)
  get filtered(): InvestmentResponse[] {
    return this.allInvestments().filter(i => !this.filterStatus || i.status === this.filterStatus);
  }

  // Paged slice of the filtered set
  get pagedInvestments(): InvestmentResponse[] {
    const start = this.currentPage() * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get totalPages(): number { return Math.ceil(this.filtered.length / this.pageSize); }

  get pageNumbers(): number[] {
    const total   = this.totalPages;
    const current = this.currentPage();
    const delta   = 2;
    const range: number[] = [];
    for (let i = Math.max(0, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  onFilterChange(): void {
    this.currentPage.set(0);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) return;
    this.currentPage.set(page);
  }

  nextPage(): void { this.goToPage(this.currentPage() + 1); }
  prevPage(): void { this.goToPage(this.currentPage() - 1); }

  statusLabel(status: InvestmentStatus): string {
    const labels: Record<InvestmentStatus, string> = {
      PENDING: 'Pending Review', APPROVED: 'Approved', REJECTED: 'Rejected',
      COMPLETED: 'Completed', PAYMENT_FAILED: 'Payment Failed', STARTUP_CLOSED: 'Startup Closed'
    };
    return labels[status] ?? status;
  }

  statusClass(status: string): string {
    return status === 'APPROVED'       ? 'badge-success'
         : status === 'PENDING'        ? 'badge-warning'
         : status === 'COMPLETED'      ? 'badge-info'
         : status === 'STARTUP_CLOSED' ? 'badge-gray'
         : 'badge-danger';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }
}
