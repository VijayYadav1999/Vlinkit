import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-page">
      <div class="login-header">
        <h1>🚗 Vlinkit Driver</h1>
        <p>Deliver fast, earn more</p>
      </div>

      <div class="login-card card" *ngIf="!showRegister">
        <h2>Sign In</h2>
        <div class="form-group">
          <label>Email</label>
          <input type="email" [(ngModel)]="email" placeholder="driver@example.com" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" [(ngModel)]="password" placeholder="••••••••" />
        </div>
        <p class="error" *ngIf="error">{{ error }}</p>
        <button class="btn btn-primary btn-full" (click)="login()" [disabled]="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
        <p class="switch-link" (click)="showRegister = true">New driver? <strong>Register here</strong></p>
      </div>

      <div class="login-card card" *ngIf="showRegister">
        <h2>Register as Driver</h2>
        <div class="form-group">
          <label>First Name</label>
          <input type="text" [(ngModel)]="regFirstName" placeholder="John" />
        </div>
        <div class="form-group">
          <label>Last Name</label>
          <input type="text" [(ngModel)]="regLastName" placeholder="Doe" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" [(ngModel)]="regEmail" placeholder="driver@example.com" />
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input type="tel" [(ngModel)]="regPhone" placeholder="+91 9876543210" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" [(ngModel)]="regPassword" placeholder="••••••••" />
        </div>
        <div class="form-group">
          <label>Vehicle Type</label>
          <select [(ngModel)]="regVehicleType">
            <option value="bike">Bike</option>
            <option value="scooter">Scooter</option>
            <option value="car">Car</option>
          </select>
        </div>
        <div class="form-group">
          <label>Vehicle Plate Number</label>
          <input type="text" [(ngModel)]="regVehiclePlate" placeholder="KA-01-AB-1234" />
        </div>
        <p class="error" *ngIf="error">{{ error }}</p>
        <button class="btn btn-primary btn-full" (click)="register()" [disabled]="loading">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
        <p class="switch-link" (click)="showRegister = false">Already registered? <strong>Sign in</strong></p>
      </div>
    </div>
  `,
  styles: [`
    .login-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; background: linear-gradient(135deg, #1B5E20 0%, #4CAF50 100%); }
    .login-header { text-align: center; color: #fff; margin-bottom: 32px; }
    .login-header h1 { font-size: 28px; margin-bottom: 4px; }
    .login-header p { opacity: 0.85; font-size: 14px; }
    .login-card { width: 100%; max-width: 400px; }
    .login-card h2 { font-size: 20px; margin-bottom: 20px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 500; color: #555; margin-bottom: 4px; }
    .form-group input, .form-group select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; transition: border 0.2s; }
    .form-group input:focus, .form-group select:focus { border-color: #4CAF50; }
    .error { color: #D32F2F; font-size: 13px; margin-bottom: 12px; }
    .switch-link { text-align: center; margin-top: 16px; font-size: 13px; color: #666; cursor: pointer; }
    .switch-link strong { color: #1B5E20; }
  `],
})
export class LoginComponent {
  email = ''; password = '';
  regFirstName = ''; regLastName = ''; regEmail = ''; regPhone = ''; regPassword = '';
  regVehicleType = 'bike'; regVehiclePlate = '';
  showRegister = false;
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.loading = true; this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.router.navigate(['/']); this.loading = false; },
      error: (err) => { this.error = err.error?.message || 'Login failed'; this.loading = false; },
    });
  }

  register() {
    this.loading = true; this.error = '';
    this.auth.register({
      first_name: this.regFirstName, last_name: this.regLastName,
      email: this.regEmail, phone: this.regPhone,
      password: this.regPassword, vehicle_type: this.regVehicleType,
      vehicle_number: this.regVehiclePlate,
    }).subscribe({
      next: () => { this.router.navigate(['/']); this.loading = false; },
      error: (err) => { this.error = err.error?.message || 'Registration failed'; this.loading = false; },
    });
  }
}
