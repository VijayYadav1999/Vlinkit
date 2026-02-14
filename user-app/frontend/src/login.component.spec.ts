// User App - Login Component with Tests (TDD)
// File: user-app/frontend/src/app/modules/auth/components/login/login.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
  selector: 'vlinkit-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  error: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      remember_me: [false],
    });
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
      await this.authService.login(email, password).toPromise();

      this.notificationService.showSuccess('Login successful!');
      await this.router.navigate(['/products']);
    } catch (err: any) {
      this.error = err.error?.message || 'Login failed. Please try again.';
      this.notificationService.showError(this.error);
    } finally {
      this.isLoading = false;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  getEmailError(): string {
    const control = this.emailControl;
    if (control?.hasError('required')) {
      return 'Email is required';
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email';
    }
    return '';
  }

  getPasswordError(): string {
    const control = this.passwordControl;
    if (control?.hasError('required')) {
      return 'Password is required';
    }
    if (control?.hasError('minlength')) {
      return 'Password must be at least 8 characters';
    }
    return '';
  }
}

// File: user-app/frontend/src/app/modules/auth/components/login/login.component.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../../../shared/services/notification.service';

describe('LoginComponent (TDD)', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'showSuccess',
      'showError',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    notificationService = TestBed.inject(
      NotificationService,
    ) as jasmine.SpyObj<NotificationService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Test Suite: Form Initialization
  describe('Form Initialization', () => {
    it('should create login form with email and password fields', () => {
      expect(component.loginForm.get('email')).toBeDefined();
      expect(component.loginForm.get('password')).toBeDefined();
      expect(component.loginForm.get('remember_me')).toBeDefined();
    });

    it('should initialize form with empty values', () => {
      expect(component.loginForm.get('email').value).toBe('');
      expect(component.loginForm.get('password').value).toBe('');
      expect(component.loginForm.get('remember_me').value).toBe(false);
    });

    it('should mark form as invalid initially', () => {
      expect(component.loginForm.valid).toBeFalsy();
    });
  });

  // Test Suite: Form Validation
  describe('Form Validation', () => {
    it('should require email field', () => {
      const emailControl = component.loginForm.get('email');
      emailControl.setValue('');
      expect(emailControl.hasError('required')).toBeTruthy();
    });

    it('should validate email format', () => {
      const emailControl = component.loginForm.get('email');
      emailControl.setValue('invalid-email');
      expect(emailControl.hasError('email')).toBeTruthy();

      emailControl.setValue('valid@example.com');
      expect(emailControl.hasError('email')).toBeFalsy();
    });

    it('should require password field', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl.setValue('');
      expect(passwordControl.hasError('required')).toBeTruthy();
    });

    it('should enforce minimum password length of 8 characters', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl.setValue('short');
      expect(passwordControl.hasError('minlength')).toBeTruthy();

      passwordControl.setValue('validpassword123');
      expect(passwordControl.hasError('minlength')).toBeFalsy();
    });

    it('should mark form as valid with correct inputs', () => {
      component.loginForm.patchValue({
        email: 'user@example.com',
        password: 'ValidPassword123',
      });
      expect(component.loginForm.valid).toBeTruthy();
    });
  });

  // Test Suite: Login Submission
  describe('Login Submission', () => {
    beforeEach(() => {
      authService.login.and.returnValue(of({}));
      router.navigate.and.returnValue(Promise.resolve(true));
    });

    it('should not submit if form is invalid', async () => {
      component.loginForm.patchValue({
        email: 'invalid',
        password: '',
      });

      await component.onSubmit();

      expect(authService.login).not.toHaveBeenCalled();
      expect(component.error).toBeDefined();
    });

    it('should call authService.login with correct credentials', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'Password123',
      };

      component.loginForm.patchValue(credentials);
      await component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith(
        credentials.email,
        credentials.password,
      );
    });

    it('should set isLoading to true during login', async () => {
      authService.login.and.returnValue(of({}));

      component.loginForm.patchValue({
        email: 'user@example.com',
        password: 'Password123',
      });

      const submitPromise = component.onSubmit();
      expect(component.isLoading).toBeTruthy();

      await submitPromise;
      expect(component.isLoading).toBeFalsy();
    });

    it('should navigate to products page on successful login', async () => {
      component.loginForm.patchValue({
        email: 'user@example.com',
        password: 'Password123',
      });

      await component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/products']);
    });

    it('should show success notification on successful login', async () => {
      component.loginForm.patchValue({
        email: 'user@example.com',
        password: 'Password123',
      });

      await component.onSubmit();

      expect(notificationService.showSuccess).toHaveBeenCalledWith(
        'Login successful!',
      );
    });

    it('should handle login error and display error message', async () => {
      const errorMessage = 'Invalid credentials';
      authService.login.and.returnValue(
        throwError({ error: { message: errorMessage } }),
      );

      component.loginForm.patchValue({
        email: 'user@example.com',
        password: 'WrongPassword',
      });

      await component.onSubmit();

      expect(component.error).toBe(errorMessage);
      expect(notificationService.showError).toHaveBeenCalledWith(errorMessage);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should set isLoading to false after error', async () => {
      authService.login.and.returnValue(
        throwError({ error: { message: 'Error' } }),
      );

      component.loginForm.patchValue({
        email: 'user@example.com',
        password: 'Password123',
      });

      await component.onSubmit();

      expect(component.isLoading).toBeFalsy();
    });
  });

  // Test Suite: Password Visibility
  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBeFalsy();

      component.togglePasswordVisibility();
      expect(component.showPassword).toBeTruthy();

      component.togglePasswordVisibility();
      expect(component.showPassword).toBeFalsy();
    });
  });

  // Test Suite: Error Handling
  describe('Error Handling', () => {
    it('should display email validation error', () => {
      const emailControl = component.loginForm.get('email');
      emailControl.setValue('');
      emailControl.markAsTouched();

      const error = component.getEmailError();
      expect(error).toBe('Email is required');
    });

    it('should display email format error', () => {
      const emailControl = component.loginForm.get('email');
      emailControl.setValue('invalid-email');
      emailControl.markAsTouched();

      const error = component.getEmailError();
      expect(error).toBe('Please enter a valid email');
    });

    it('should display password validation error', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl.setValue('');
      passwordControl.markAsTouched();

      const error = component.getPasswordError();
      expect(error).toBe('Password is required');
    });

    it('should display password length error', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl.setValue('short');
      passwordControl.markAsTouched();

      const error = component.getPasswordError();
      expect(error).toBe('Password must be at least 8 characters');
    });
  });
});
