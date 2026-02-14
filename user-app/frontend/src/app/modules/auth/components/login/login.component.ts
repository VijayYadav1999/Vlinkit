import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../shared/services/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'vlinkit-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  signupForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showSignupPassword = false;
  error: string | null = null;
  isSignupMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeSignupForm();
  }

  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      remember_me: [false],
    });
  }

  private initializeSignupForm(): void {
    this.signupForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  toggleMode(): void {
    this.isSignupMode = !this.isSignupMode;
    this.error = null;
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.error = 'Please fill in all required fields correctly';
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.login({ email, password }).toPromise();
      this.notificationService.showSuccess('Login successful!');
      await this.router.navigate(['/products']);
    } catch (err: any) {
      this.error = err.error?.message || 'Login failed. Please try again.';
      this.notificationService.showError(this.error!);
    } finally {
      this.isLoading = false;
    }
  }

  async onSignup(): Promise<void> {
    if (this.signupForm.invalid) {
      this.error = 'Please fill in all required fields correctly';
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const data = this.signupForm.value;
      await this.authService.signup({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: 'USER',
      }).toPromise();
      this.notificationService.showSuccess('Account created successfully!');
      await this.router.navigate(['/products']);
    } catch (err: any) {
      this.error = err.error?.message || err.message || 'Registration failed. Please try again.';
      this.notificationService.showError(this.error!);
    } finally {
      this.isLoading = false;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleSignupPasswordVisibility(): void {
    this.showSignupPassword = !this.showSignupPassword;
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  getEmailError(): string {
    const control = this.emailControl;
    if (control?.hasError('required')) return 'Email is required';
    if (control?.hasError('email')) return 'Please enter a valid email';
    return '';
  }

  getPasswordError(): string {
    const control = this.passwordControl;
    if (control?.hasError('required')) return 'Password is required';
    if (control?.hasError('minlength')) return 'Password must be at least 8 characters';
    return '';
  }
}
