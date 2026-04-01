import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../shared/models/auth.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
        </div>

        <div *ngIf="error" class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>

        <form class="mt-8 space-y-6" [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="rounded-md shadow-sm space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700">Full Name</label>
              <input id="name" type="text" formControlName="name" 
                     class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                     [class.border-red-500]="registerForm.get('name')?.invalid && registerForm.get('name')?.touched"
                     placeholder="John Doe">
              <p *ngIf="registerForm.get('name')?.invalid && registerForm.get('name')?.touched" class="text-xs text-red-500 mt-1">Full name is required.</p>
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
              <input id="email" type="email" formControlName="email" 
                     class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                     [class.border-red-500]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
                     placeholder="john@example.com">
              <p *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="text-xs text-red-500 mt-1">Please enter a valid email address.</p>
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
              <input id="password" type="password" formControlName="password" 
                     class="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                     [class.border-red-500]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched"
                     placeholder="Minimum 8 characters">
              <p *ngIf="registerForm.get('password')?.errors?.['required'] && registerForm.get('password')?.touched" class="text-xs text-red-500 mt-1">Password is required.</p>
              <p *ngIf="registerForm.get('password')?.errors?.['minlength'] && registerForm.get('password')?.touched" class="text-xs text-red-500 mt-1">Password must be at least 8 characters.</p>
            </div>

            <div>
              <label for="role" class="block text-sm font-medium text-gray-700">I am a...</label>
              <select id="role" formControlName="role" 
                      class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      [class.border-red-500]="registerForm.get('role')?.invalid && registerForm.get('role')?.touched">
                <option value="" disabled>Select a role</option>
                <option [value]="UserRole.FOUNDER">Founder</option>
                <option [value]="UserRole.INVESTOR">Investor</option>
                <option [value]="UserRole.COFOUNDER">Co-Founder</option>
              </select>
              <p *ngIf="registerForm.get('role')?.invalid && registerForm.get('role')?.touched" class="text-xs text-red-500 mt-1">Please select a role.</p>
            </div>
          </div>

          <div>
            <button type="submit" [disabled]="registerForm.invalid || isLoading"
                    class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
              <span *ngIf="isLoading">Registering...</span>
              <span *ngIf="!isLoading">Register</span>
            </button>
          </div>
        </form>

        <div class="text-center mt-4">
          <p class="text-sm text-gray-600">
            Already have an account? 
            <a routerLink="/auth/login" class="font-medium text-blue-600 hover:text-blue-500">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class RegisterPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  UserRole = UserRole; // Expose to template

  registerForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['', Validators.required]
  });

  isLoading = false;
  error: string | null = null;

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.error = null;

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        // Auto login after registration could be done, or redirect to login
        this.router.navigate(['/auth/login'], { queryParams: { registered: 'true' } });
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        if (err.status === 409) {
          this.error = 'Email is already registered';
        } else {
          this.error = err.error?.message || 'An error occurred during registration';
        }
      }
    });
  }
}
