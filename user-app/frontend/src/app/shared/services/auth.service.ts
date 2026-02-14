import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'USER' | 'DRIVER' | 'ADMIN';
  profilePicture?: string;
  createdAt?: Date;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupData extends AuthCredentials {
  firstName: string;
  lastName: string;
  phone: string;
  role: 'USER' | 'DRIVER';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface OAuthToken {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3001/api/auth';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  private authTokenSubject: BehaviorSubject<string | null>;
  public authToken$: Observable<string | null>;

  constructor(private http: HttpClient) {
    const storedUser = this.getStoredUser();
    const storedToken = this.getStoredToken();
    
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
    
    this.authTokenSubject = new BehaviorSubject<string | null>(storedToken);
    this.authToken$ = this.authTokenSubject.asObservable();
  }

  /**
   * Login with email and password
   */
  login(credentials: AuthCredentials): Observable<AuthResponse> {
    return this.http.post<any>(
      `${this.apiUrl}/login`,
      credentials
    ).pipe(
      tap(response => {
        const accessToken = response.accessToken || response.access_token;
        const refreshToken = response.refreshToken || response.refresh_token;
        const user = this.mapUser(response.user);
        this.setAuthTokens(accessToken, refreshToken);
        this.setCurrentUser(user);
        console.log('Login successful for user:', user.email);
      }),
      catchError(error => {
        console.error('Login failed:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Sign up new user
   */
  signup(userData: SignupData): Observable<AuthResponse> {
    // Validate signup data
    if (!this.validateEmail(userData.email)) {
      return throwError(() => new Error('Invalid email format'));
    }
    
    if (userData.password.length < 8) {
      return throwError(() => new Error('Password must be at least 8 characters'));
    }

    // Backend expects snake_case fields
    const payload = {
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
    };

    return this.http.post<any>(
      `${this.apiUrl}/register`,
      payload
    ).pipe(
      tap(response => {
        const accessToken = response.accessToken || response.access_token;
        const refreshToken = response.refreshToken || response.refresh_token;
        const user = this.mapUser(response.user);
        this.setAuthTokens(accessToken, refreshToken);
        this.setCurrentUser(user);
        console.log('Signup successful for user:', user.email);
      }),
      catchError(error => {
        console.error('Signup failed:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout current user
   */
  logout(): Observable<void> {
    return new Observable(observer => {
      try {
        this.clearAuthTokens();
        this.setCurrentUser(null);
        observer.next();
        observer.complete();
        console.log('Logout successful');
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Validate OAuth token from Google/Facebook
   */
  validateOAuth(provider: 'google' | 'facebook', token: string): Observable<AuthResponse> {
    if (!provider || !token) {
      return throwError(() => new Error('Invalid OAuth provider or token'));
    }

    return this.http.post<AuthResponse>(
      `${this.apiUrl}/oauth/validate`,
      { provider, token }
    ).pipe(
      tap(response => {
        this.setAuthTokens(response.accessToken, response.refreshToken);
        this.setCurrentUser(response.user);
        console.log(`OAuth login successful via ${provider}`);
      }),
      catchError(error => {
        console.error(`OAuth validation failed for ${provider}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh access token using refresh token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getStoredRefreshToken();
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(
      `${this.apiUrl}/refresh`,
      { refreshToken }
    ).pipe(
      tap(response => {
        this.setAuthTokens(response.accessToken, response.refreshToken);
        this.setCurrentUser(response.user);
        console.log('Token refresh successful');
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        this.clearAuthTokens();
        this.setCurrentUser(null);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.getValue();
  }

  /**
   * Get current user as observable
   */
  getCurrentUserObservable(): Observable<User | null> {
    return this.currentUser$;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    return !!token && !this.isTokenExpired(token);
  }

  /**
   * Get authorization header
   */
  getAuthorizationHeader(): HttpHeaders {
    const token = this.getStoredToken();
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  /**
   * Mock data for testing - users with credentials
   */
  private mockUsers: Map<string, { user: User; password: string }> = new Map([
    ['user@example.com', {
      user: {
        id: 'user-001',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '9876543210',
        role: 'USER',
        profilePicture: 'https://via.placeholder.com/150',
        createdAt: new Date('2024-01-01')
      },
      password: 'password123'
    }],
    ['driver@example.com', {
      user: {
        id: 'driver-001',
        email: 'driver@example.com',
        firstName: 'Raj',
        lastName: 'Kumar',
        phone: '9876543211',
        role: 'DRIVER',
        profilePicture: 'https://via.placeholder.com/150',
        createdAt: new Date('2024-01-01')
      },
      password: 'password123'
    }],
    ['admin@example.com', {
      user: {
        id: 'admin-001',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        phone: '9876543212',
        role: 'ADMIN',
        profilePicture: 'https://via.placeholder.com/150',
        createdAt: new Date('2024-01-01')
      },
      password: 'password123'
    }]
  ]);

  /**
   * Map backend user (snake_case) to frontend User (camelCase)
   */
  private mapUser(backendUser: any): User {
    if (!backendUser) return null as any;
    return {
      id: backendUser.id,
      email: backendUser.email,
      firstName: backendUser.firstName || backendUser.first_name || '',
      lastName: backendUser.lastName || backendUser.last_name || '',
      phone: backendUser.phone || '',
      role: backendUser.role || 'USER',
      profilePicture: backendUser.profilePicture || backendUser.profile_image_url,
      createdAt: backendUser.createdAt || backendUser.created_at,
    };
  }

  /**
   * Private helper: Validate email format
   */
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Private helper: Check if token is expired (mock implementation)
   */
  private isTokenExpired(token: string): boolean {
    try {
      // In real app, would decode JWT and check expiration
      // For mock, tokens never expire
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Private helper: Set authentication tokens in localStorage
   */
  private setAuthTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    this.authTokenSubject.next(accessToken);
  }

  /**
   * Private helper: Clear authentication tokens from localStorage
   */
  private clearAuthTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.authTokenSubject.next(null);
  }

  /**
   * Private helper: Get stored access token
   */
  private getStoredToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Private helper: Get stored refresh token
   */
  private getStoredRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Private helper: Set current user in BehaviorSubject and localStorage
   */
  private setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(user);
  }

  /**
   * Private helper: Get stored user from localStorage
   */
  private getStoredUser(): User | null {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Mock implementation for local testing (remove in production)
   */
  mockLogin(credentials: AuthCredentials): Observable<AuthResponse> {
    const mockUser = this.mockUsers.get(credentials.email);
    
    if (!mockUser || mockUser.password !== credentials.password) {
      return throwError(() => new Error('Invalid email or password'));
    }

    const response: AuthResponse = {
      accessToken: 'mock-access-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      user: mockUser.user
    };

    this.setAuthTokens(response.accessToken, response.refreshToken);
    this.setCurrentUser(response.user);

    return of(response);
  }

  /**
   * Mock implementation for testing OAuth
   */
  mockOAuthGoogle(token: string): Observable<AuthResponse> {
    const mockUser = this.mockUsers.get('user@example.com')!;
    
    const response: AuthResponse = {
      accessToken: 'mock-google-token-' + Date.now(),
      refreshToken: 'mock-google-refresh-' + Date.now(),
      user: mockUser.user
    };

    this.setAuthTokens(response.accessToken, response.refreshToken);
    this.setCurrentUser(response.user);

    return of(response);
  }

  /**
   * Get mock user credentials for testing
   */
  getMockCredentials(): { email: string; password: string }[] {
    return [
      { email: 'user@example.com', password: 'password123' },
      { email: 'driver@example.com', password: 'password123' },
      { email: 'admin@example.com', password: 'password123' }
    ];
  }
}
