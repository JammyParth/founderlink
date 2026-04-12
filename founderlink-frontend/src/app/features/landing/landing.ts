import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { StartupService } from '../../core/services/startup.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { StartupResponse, StartupStage } from '../../models';

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class LandingComponent implements OnInit {
  startups   = signal<StartupResponse[]>([]);
  loading    = signal(true);
  error      = signal('');
  stats      = signal({ founders: 350, investors: 200, cofounders: 120 });
  totalFunding = computed(() => this.startups().reduce((acc, s) => acc + (s.fundingGoal || 0), 0));

  constructor(
    private startupService: StartupService,
    private userService: UserService,
    public  authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStartups();
    this.loadStats();
  }

  loadStats(): void {
    this.userService.getPublicStats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => console.warn('Failed to load public stats from backend.')
    });
  }

  loadStartups(): void {
    this.loading.set(true);
    this.startupService.getPaged(0, 9).subscribe({
      next:  env => { this.startups.set(env.data?.content ?? []); this.loading.set(false); },
      error: ()  => { this.loading.set(false); }
    });
  }

  get filteredStartups(): StartupResponse[] {
    return this.startups();
  }

  openDetail(s: StartupResponse): void {
    this.router.navigate(['/startup', s.id]);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  stageLabel(stage: StartupStage): string {
    const map: Record<string, string> = {
      IDEA: 'Idea', MVP: 'MVP', EARLY_TRACTION: 'Early Traction', SCALING: 'Scaling'
    };
    return map[stage] ?? stage;
  }

  stageClass(stage: StartupStage): string {
    return stage === 'IDEA'           ? 'stage-idea'
         : stage === 'MVP'            ? 'stage-mvp'
         : stage === 'EARLY_TRACTION' ? 'stage-traction'
         : 'stage-scaling';
  }

  formatCurrency(n: number): string {
    if (!n) return '₹0';
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
    if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
    return `₹${n.toLocaleString('en-IN')}`;
  }
}
