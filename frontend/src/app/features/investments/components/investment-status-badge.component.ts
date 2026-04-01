import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvestmentStatus } from '../../../shared/models/investment.model';

@Component({
  selector: 'app-investment-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" [ngClass]="getBadgeClasses()">
      {{ status }}
    </span>
  `
})
export class InvestmentStatusBadgeComponent {
  @Input({ required: true }) status!: InvestmentStatus;

  getBadgeClasses(): string {
    switch (this.status) {
      case InvestmentStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case InvestmentStatus.APPROVED:
        return 'bg-blue-100 text-blue-800';
      case InvestmentStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      case InvestmentStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case InvestmentStatus.STARTUP_CLOSED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
