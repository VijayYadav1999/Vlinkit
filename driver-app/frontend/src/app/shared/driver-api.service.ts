import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class DriverApiService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Profile ───
  getProfile(): Observable<any> {
    return this.http.get(`${this.api}/drivers/profile`);
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.api}/drivers/profile`, data);
  }

  toggleAvailability(isAvailable: boolean, lat?: number, lng?: number): Observable<any> {
    return this.http.put(`${this.api}/drivers/availability`, {
      isAvailable, latitude: lat, longitude: lng,
    });
  }

  // ─── Orders / Offers ───
  getPendingOffers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/orders/offers`);
  }

  acceptOrder(orderId: string): Observable<any> {
    return this.http.post(`${this.api}/orders/offers/${orderId}/accept`, {});
  }

  rejectOrder(orderId: string): Observable<any> {
    return this.http.post(`${this.api}/orders/offers/${orderId}/reject`, {});
  }

  getActiveDelivery(): Observable<any> {
    return this.http.get(`${this.api}/orders/active`);
  }

  updateDeliveryStatus(status: string): Observable<any> {
    return this.http.put(`${this.api}/orders/active/status`, { status });
  }

  // ─── Location ───
  updateLocation(latitude: number, longitude: number): Observable<any> {
    return this.http.post(`${this.api}/location`, { latitude, longitude });
  }

  // ─── Earnings ───
  getEarnings(period: string = 'today'): Observable<any> {
    return this.http.get(`${this.api}/drivers/earnings`, { params: { period } });
  }
}
