import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
        </div>
        
        <div *ngIf="error" class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div class="flex">
            <div class="ml-3">
              <p class="text-sm text-red-700">{{ error }}</p>
            </div>
          </div>
        </div>

        <form class="mt-8 space-y-6" [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="rounded-md shadow-sm -space-y-px">
            <div class="mb-4">
              <label for="email-address" class="sr-only">Email address</label>
              <input id="email-address" type="email" formControlName="email" 
                     class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                     [class.border-red-500]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                     placeholder="Email address">
              <p *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="text-xs text-red-500 mt-1">Please enter a valid email address.</p>
            </div>
            <div>
              <label for="password" class="sr-only">Password</label>
              <input id="password" type="password" formControlName="password" 
                     class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" 
                     [class.border-red-500]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                     placeholder="Password">
              <p *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="text-xs text-red-500 mt-1">Password is required.</p>
            </div>
          </div>

          <div class="flex items-center justify-between mt-4">
            <div class="text-sm">
              <a routerLink="/auth/forgot-password" class="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button type="submit" [disabled]="loginForm.invalid || isLoading"
                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
              <span *ngIf="isLoading">Signing in...</span>
              <span *ngIf="!isLoading">Sign in</span>
            </button>
          </div>
        </form>
        
        <div class="text-center mt-4">
          <p class="text-sm text-gray-600">
            Don't have an account? 
            <a routerLink="/auth/register" class="font-medium text-blue-600 hover:text-blue-500">Register here</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  isLoading = false;
  error: string | null = null;

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.error = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        // The returnUrl could be read from route query params here, defaulting to '/'
        this.router.navigate(['/']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.error = 'Invalid email or password';
        } else {
          this.error = err.error?.message || 'An error occurred during login';
        }
      }
    });
  }
}
