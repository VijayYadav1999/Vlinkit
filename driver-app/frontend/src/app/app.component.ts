import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './shared/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-shell">
      <router-outlet></router-outlet>
      <nav class="bottom-nav" *ngIf="auth.isLoggedIn()">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
          <span class="material-icons">home</span>
          <span>Home</span>
        </a>
        <a routerLink="/orders" routerLinkActive="active" class="nav-item">
          <span class="material-icons">list_alt</span>
          <span>Orders</span>
        </a>
        <a routerLink="/delivery" routerLinkActive="active" class="nav-item">
          <span class="material-icons">delivery_dining</span>
          <span>Delivery</span>
        </a>
        <a routerLink="/earnings" routerLinkActive="active" class="nav-item">
          <span class="material-icons">account_balance_wallet</span>
          <span>Earnings</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .app-shell { min-height: 100vh; padding-bottom: 72px; }
    .bottom-nav {
      position: fixed; bottom: 0; left: 0; right: 0;
      display: flex; background: #fff; border-top: 1px solid #e0e0e0;
      padding: 8px 0; z-index: 100;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
    }
    .nav-item {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      gap: 2px; padding: 4px 0; font-size: 11px; color: #888;
      text-decoration: none; transition: color 0.2s;
    }
    .nav-item .material-icons { font-size: 22px; }
    .nav-item.active { color: #1B5E20; font-weight: 600; }
  `],
})
export class AppComponent {
  constructor(public auth: AuthService, private router: Router) {}
}
