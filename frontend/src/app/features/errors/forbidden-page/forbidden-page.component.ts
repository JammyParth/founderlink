import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div style="text-align: center; margin-top: 50px;">
      <h1 style="font-size: 3rem; color: #d32f2f;">403</h1>
      <h2>Access Denied</h2>
      <p>You do not have permission to view this page.</p>
      <a routerLink="/" style="color: blue; text-decoration: underline;">Return Home</a>
    </div>
  `
})
export class ForbiddenPageComponent {}
