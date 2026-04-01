import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Reset your password</h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a PIN to reset your password.
          </p>
        </div>

        <div *ngIf="error" class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>

        <div *ngIf="successMessage" class="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <p class="text-sm text-green-700">{{ successMessage }}</p>
        </div>

        <form *ngIf="!successMessage" class="mt-8 space-y-6" [formGroup]="forgotForm" (ngSubmit)="onSubmit()">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
            <input id="email" type="email" formControlName="email" 
                   class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                   placeholder="Enter your email">
          </div>

          <div>
            <button type="submit" [disabled]="forgotForm.invalid || isLoading"
                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
              <span *ngIf="isLoading">Sending...</span>
              <span *ngIf="!isLoading">Send Reset PIN</span>
            </button>
          </div>
        </form>

        <div class="text-center mt-4">
          <p class="text-sm text-gray-600">
            Remember your password? 
            <a routerLink="/auth/login" class="font-medium text-blue-600 hover:text-blue-500">Sign in</a>
          </p>
          <p class="text-sm text-gray-600 mt-2" *ngIf="successMessage">
            Have a PIN? 
            <a routerLink="/auth/reset-password" [queryParams]="{email: forgotForm.value.email}" class="font-medium text-blue-600 hover:text-blue-500">Enter it here</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = false;
  error: string | null = null;
  successMessage: string | null = null;

  onSubmit() {
    if (this.forgotForm.invalid) return;

    this.isLoading = true;
    this.error = null;
    this.successMessage = null;

    this.authService.forgotPassword(this.forgotForm.value.email!).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message || 'Password reset PIN has been sent to your email.';
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Failed to send reset PIN. Please check your email.';
      }
    });
  }
}
