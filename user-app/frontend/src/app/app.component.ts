import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './shared/services/auth.service';
import { NotificationService, Notification } from './shared/services/notification.service';
import { CartService } from './shared/services/cart.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Vlinkit';

  cartItemCount$: Observable<number>;

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService,
    private cartService: CartService,
    private router: Router
  ) {
    this.cartItemCount$ = this.cartService.itemCount$;
  }

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  dismissNotification(id: string) {
    this.notificationService.dismiss(id);
  }
}
