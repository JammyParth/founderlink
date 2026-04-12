import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StartupService } from '../../core/services/startup.service';
import { InvestmentService } from '../../core/services/investment.service';
import { StartupResponse, StartupStage } from '../../models';

@Component({
  selector: 'app-startups',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './startups.html',
  styleUrl: './startups.css'
})
export class StartupsComponent implements OnInit {
  allStartups     = signal<StartupResponse[]>([]);
  private rawStartups = signal<StartupResponse[]>([]);
  loading         = signal(true);
  errorMsg        = signal('');

  // Pagination state
  currentPage   = signal(0);
  totalPages    = signal(0);
  totalElements = signal(0);
  readonly pageSize = 9;

  // Filters
  searchQuery      = '';
  selectedStage    = '';
  selectedIndustry = '';
  minFunding       = '';
  maxFunding       = '';
  availableIndustries = signal<string[]>([]);

  // Invest modal
  investModal   = signal<StartupResponse | null>(null);
  investAmount  = 0;
  investing     = signal(false);
  investError   = signal('');
  investSuccess = signal('');

  readonly stages: StartupStage[] = ['IDEA', 'MVP', 'EARLY_TRACTION', 'SCALING'];
  readonly stageLabels: Record<StartupStage, string> = {
    IDEA: 'Idea', MVP: 'MVP', EARLY_TRACTION: 'Early Traction', SCALING: 'Scaling'
  };

  constructor(
    public authService: AuthService,
    private startupService: StartupService,
    private investmentService: InvestmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPage(0);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.errorMsg.set('');

    const hasServerFilters = !!(this.selectedStage || this.selectedIndustry || this.minFunding || this.maxFunding);
    const obs = hasServerFilters
      ? this.startupService.searchPaged(
          {
            stage:      this.selectedStage    || undefined,
            industry:   this.selectedIndustry || undefined,
            minFunding: this.minFunding ? Number(this.minFunding) : undefined,
            maxFunding: this.maxFunding ? Number(this.maxFunding) : undefined,
          },
          page,
          this.pageSize
        )
      : this.startupService.getPaged(page, this.pageSize);

    obs.subscribe({
      next: env => {
        const paged = env.data;
        if (paged) {
          this.rawStartups.set(paged.content);
          this.currentPage.set(paged.page);
          this.totalPages.set(paged.totalPages);
          this.totalElements.set(paged.totalElements);
          // Accumulate known industries across navigated pages
          const existing = new Set(this.availableIndustries());
          paged.content.forEach(s => existing.add(s.industry));
          this.availableIndustries.set([...existing].sort());
        }
        this.applyNameFilter();
        this.loading.set(false);
      },
      error: env => { this.errorMsg.set(env.error ?? 'Failed to load startups.'); this.loading.set(false); }
    });
  }

  /** Called when server-side filters change — resets to page 0 */
  applyFilters(): void {
    this.loadPage(0);
  }

  /** Client-side name filter on current page's data */
  applyNameFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.allStartups.set(this.rawStartups());
    } else {
      this.allStartups.set(
        this.rawStartups().filter(s =>
          s.name.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q) ||
          (s.industry ?? '').toLowerCase().includes(q)
        )
      );
    }
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStage = '';
    this.selectedIndustry = '';
    this.minFunding = '';
    this.maxFunding = '';
    this.loadPage(0);
  }

  // ── Pagination ────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.loadPage(page);
  }

  nextPage(): void { this.goToPage(this.currentPage() + 1); }
  prevPage(): void { this.goToPage(this.currentPage() - 1); }

  get pageNumbers(): number[] {
    const total   = this.totalPages();
    const current = this.currentPage();
    const delta   = 2;
    const range: number[] = [];
    for (let i = Math.max(0, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  get hasFilters(): boolean {
    return !!(this.searchQuery || this.selectedStage || this.selectedIndustry || this.minFunding || this.maxFunding);
  }


  // ── Invest Modal ──────────────────────────────────────────────
  openInvestModal(startup: StartupResponse): void {
    this.investModal.set(startup);
    this.investAmount = 0;
    this.investError.set('');
    this.investSuccess.set('');
  }

  closeInvestModal(): void {
    this.investModal.set(null);
    this.investAmount = 0;
    this.investError.set('');
    this.investSuccess.set('');
  }

  submitInvestment(): void {
    const startup = this.investModal();
    if (!startup) return;
    if (!this.investAmount || this.investAmount < 1000) {
      this.investError.set('Minimum investment is ₹1,000.');
      return;
    }

    this.investing.set(true);
    this.investError.set('');

    this.investmentService.create({ startupId: startup.id, amount: this.investAmount }).subscribe({
      next: () => {
        this.investing.set(false);
        this.investSuccess.set('Investment submitted successfully! Awaiting founder approval.');
        setTimeout(() => this.closeInvestModal(), 2500);
      },
      error: env => {
        this.investing.set(false);
        this.investError.set(env.error ?? 'Failed to submit investment.');
      }
    });
  }

  messageFounder(founderId: number): void {
    this.router.navigate(['/dashboard/messages'], { queryParams: { user: founderId } });
  }

  // ── Helpers ───────────────────────────────────────────────────
  private roleIs(r: string): boolean {
    const s = this.authService.role() ?? '';
    return s === r || s === `ROLE_${r}`;
  }
  get isInvestor(): boolean { return this.roleIs('INVESTOR'); }
  get isFounder():  boolean { return this.roleIs('FOUNDER'); }

  stageLabel(stage: string): string {
    return this.stageLabels[stage as StartupStage] ?? stage;
  }

  stageClass(stage: string): string {
    return stage === 'IDEA'           ? 'badge-gray'
         : stage === 'MVP'            ? 'badge-info'
         : stage === 'EARLY_TRACTION' ? 'badge-warning'
         : 'badge-success';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }
}
