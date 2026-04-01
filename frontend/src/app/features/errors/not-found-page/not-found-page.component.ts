import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div style="text-align: center; margin-top: 50px;">
      <h1 style="font-size: 3rem; color: #333;">404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <a routerLink="/" style="color: blue; text-decoration: underline;">Return Home</a>
    </div>
  `
})
export class NotFoundPageComponent {}
