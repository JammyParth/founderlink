import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FounderStartupFacade } from '../founder-startup.facade';
import { StartupDetailFacade } from '../startup-detail.facade';
import { StartupStage } from '../../../shared/models/startup.model';
import { take } from 'rxjs';

@Component({
  selector: 'app-startup-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-3xl mx-auto py-8">
      <div class="mb-6 flex items-center gap-4">
        <a routerLink="/my-startups" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
          &larr; Back to My Startups
        </a>
      </div>

      <div class="bg-white rounded-lg shadow-md border border-gray-200 p-6 md:p-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">
          {{ isEditMode ? 'Edit Startup' : 'Create New Startup' }}
        </h1>

        <ng-container *ngIf="facade.mutateState$ | async as mutateState">
          
          <div *ngIf="mutateState.loadingState === 'error'" class="bg-red-50 p-4 rounded-md border border-red-200 text-red-700 mb-6">
            {{ mutateState.error }}
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="space-y-6">
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Startup Name</label>
                  <input type="text" formControlName="name" 
                        class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        [class.border-red-500]="form.get('name')?.invalid && form.get('name')?.touched">
                  <p *ngIf="form.get('name')?.invalid && form.get('name')?.touched" class="mt-1 text-xs text-red-500">Name is required</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">Industry</label>
                  <input type="text" formControlName="industry" 
                        class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        [class.border-red-500]="form.get('industry')?.invalid && form.get('industry')?.touched">
                  <p *ngIf="form.get('industry')?.invalid && form.get('industry')?.touched" class="mt-1 text-xs text-red-500">Industry is required</p>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">One-line Pitch (Description)</label>
                <input type="text" formControlName="description" 
                      class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      [class.border-red-500]="form.get('description')?.invalid && form.get('description')?.touched">
                <p *ngIf="form.get('description')?.invalid && form.get('description')?.touched" class="mt-1 text-xs text-red-500">Description is required</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">The Problem</label>
                <textarea formControlName="problemStatement" rows="4"
                          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          [class.border-red-500]="form.get('problemStatement')?.invalid && form.get('problemStatement')?.touched"></textarea>
                <p *ngIf="form.get('problemStatement')?.invalid && form.get('problemStatement')?.touched" class="mt-1 text-xs text-red-500">Problem statement is required</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">The Solution</label>
                <textarea formControlName="solution" rows="4"
                          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          [class.border-red-500]="form.get('solution')?.invalid && form.get('solution')?.touched"></textarea>
                <p *ngIf="form.get('solution')?.invalid && form.get('solution')?.touched" class="mt-1 text-xs text-red-500">Solution is required</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Funding Goal ($)</label>
                  <input type="number" formControlName="fundingGoal" min="1"
                        class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        [class.border-red-500]="form.get('fundingGoal')?.invalid && form.get('fundingGoal')?.touched">
                  <p *ngIf="form.get('fundingGoal')?.invalid && form.get('fundingGoal')?.touched" class="mt-1 text-xs text-red-500">Valid funding goal required</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700">Current Stage</label>
                  <select formControlName="stage" 
                          class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          [class.border-red-500]="form.get('stage')?.invalid && form.get('stage')?.touched">
                    <option value="" disabled>Select stage</option>
                    <option *ngFor="let stage of stages" [value]="stage">{{ stage }}</option>
                  </select>
                  <p *ngIf="form.get('stage')?.invalid && form.get('stage')?.touched" class="mt-1 text-xs text-red-500">Stage is required</p>
                </div>
              </div>

            </div>

            <div class="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-3">
              <a routerLink="/my-startups" class="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Cancel
              </a>
              <button type="submit" 
                      [disabled]="form.invalid || mutateState.loadingState === 'loading'"
                      class="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                {{ mutateState.loadingState === 'loading' ? 'Saving...' : 'Save Startup' }}
              </button>
            </div>
          </form>

        </ng-container>
      </div>
    </div>
  `
})
export class StartupFormPageComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  facade = inject(FounderStartupFacade);
  private detailFacade = inject(StartupDetailFacade);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = false;
  editId: number | null = null;
  stages = Object.values(StartupStage);

  form = this.fb.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    industry: ['', Validators.required],
    problemStatement: ['', Validators.required],
    solution: ['', Validators.required],
    fundingGoal: [0, [Validators.required, Validators.min(1)]],
    stage: ['', Validators.required]
  });

  ngOnInit() {
    this.editId = Number(this.route.snapshot.paramMap.get('id'));
    
    if (this.editId) {
      this.isEditMode = true;
      // Pre-fill form
      this.detailFacade.loadById(this.editId);
      this.detailFacade.state$.pipe(take(2)).subscribe(state => {
        if (state.loadingState === 'loaded' && state.data) {
          this.form.patchValue({
            name: state.data.name,
            description: state.data.description,
            industry: state.data.industry,
            problemStatement: state.data.problemStatement,
            solution: state.data.solution,
            fundingGoal: state.data.fundingGoal,
            stage: state.data.stage
          });
        }
      });
    }

    // Listen to success state to navigate away
    this.facade.mutateState$.subscribe(state => {
      if (state.loadingState === 'loaded' && state.data) {
        this.router.navigate(['/my-startups']);
      }
    });
  }

  ngOnDestroy() {
    this.facade.clearMutateState();
  }

  onSubmit() {
    if (this.form.invalid) return;

    const payload = this.form.getRawValue() as any;
    
    if (this.isEditMode && this.editId) {
      this.facade.update(this.editId, payload);
    } else {
      this.facade.create(payload);
    }
  }
}
