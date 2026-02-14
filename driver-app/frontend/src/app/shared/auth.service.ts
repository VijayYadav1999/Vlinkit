import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '@env/environment';

export interface DriverProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
  isAvailable: boolean;
  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'driver_token';
  private profileSubject = new BehaviorSubject<DriverProfile | null>(null);
  profile$ = this.profileSubject.asObservable();

  constructor(private http: HttpClient) {
    if (this.isLoggedIn()) {
      this.loadProfile();
    }
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem(this.tokenKey, res.access_token);
        localStorage.setItem('driver_refresh_token', res.refresh_token);
        this.loadProfile();
      }),
    );
  }

  register(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap((res) => {
        localStorage.setItem(this.tokenKey, res.access_token);
        localStorage.setItem('driver_refresh_token', res.refresh_token);
        this.loadProfile();
      }),
    );
  }

  loadProfile(): void {
    this.http.get<DriverProfile>(`${environment.apiUrl}/drivers/profile`).subscribe({
      next: (profile) => this.profileSubject.next(profile),
      error: () => this.logout(),
    });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('driver_refresh_token');
    this.profileSubject.next(null);
  }

  getProfile(): DriverProfile | null {
    return this.profileSubject.value;
  }
}
