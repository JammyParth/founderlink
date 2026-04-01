import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../shared/models/auth.model';

export const investmentRoutes: Routes = [
  {
    path: '', // mapped from /investments in app.routes
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.INVESTOR] },
    loadComponent: () => import('./investor-portfolio-page/investor-portfolio-page.component').then(m => m.InvestorPortfolioPageComponent)
  },
  {
    path: ':id',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.INVESTOR] },
    loadComponent: () => import('./investment-detail-page/investment-detail-page.component').then(m => m.InvestmentDetailPageComponent)
  }
];
