import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';
import { AuthService, DriverProfile } from '../shared/auth.service';
import { DriverApiService } from '../shared/driver-api.service';
import { WebSocketService } from '../shared/websocket.service';
import { LocationService } from '../shared/location.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard container">
      <!-- Header -->
      <div class="dash-header">
        <div>
          <h2>Hello, {{ (profile?.name || 'Driver').split(' ')[0] }} 👋</h2>
          <p class="subtitle">{{ profile?.isAvailable ? 'You are online' : 'You are offline' }}</p>
        </div>
        <button class="btn btn-outline" (click)="logout()">
          <span class="material-icons">logout</span>
        </button>
      </div>

      <!-- Online/Offline Toggle -->
      <div class="card toggle-card" [class.online]="isOnline">
        <div class="toggle-content">
          <span class="material-icons status-icon">{{ isOnline ? 'wifi' : 'wifi_off' }}</span>
          <div>
            <strong>{{ isOnline ? 'Online' : 'Offline' }}</strong>
            <p>{{ isOnline ? 'Accepting orders' : 'Tap to go online' }}</p>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" [checked]="isOnline" (change)="toggleOnline()" />
          <span class="slider"></span>
        </label>
      </div>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="card stat-card">
          <span class="material-icons">star</span>
          <strong>{{ profile?.rating?.toFixed(1) || '0.0' }}</strong>
          <span>Rating</span>
        </div>
        <div class="card stat-card">
          <span class="material-icons">delivery_dining</span>
          <strong>{{ profile?.totalDeliveries || 0 }}</strong>
          <span>Deliveries</span>
        </div>
        <div class="card stat-card">
          <span class="material-icons">currency_rupee</span>
          <strong>₹{{ profile?.totalEarnings?.toFixed(0) || 0 }}</strong>
          <span>Total Earned</span>
        </div>
      </div>

      <!-- Pending Offers -->
      <div *ngIf="pendingOffers.length > 0" class="section">
        <h3>📦 New Order Offers ({{ pendingOffers.length }})</h3>
        <div class="card offer-card" *ngFor="let offer of pendingOffers">
          <div class="offer-top">
            <span class="badge badge-warning">{{ offer.estimatedDistance?.toFixed(1) }} km</span>
            <strong class="offer-fee">₹{{ offer.deliveryFee }}</strong>
          </div>
          <p class="offer-addr">📍 {{ offer.pickupAddress?.address }}</p>
          <p class="offer-addr">🏠 {{ offer.deliveryAddress?.address }}</p>
          <div class="offer-actions">
            <button class="btn btn-primary" (click)="acceptOffer(offer.orderId)">Accept</button>
            <button class="btn btn-outline" (click)="rejectOffer(offer.orderId)">Decline</button>
          </div>
        </div>
      </div>

      <!-- Active Delivery -->
      <div *ngIf="activeDelivery" class="section">
        <h3>🚴 Active Delivery</h3>
        <div class="card active-card" (click)="goToDelivery()">
          <div class="active-header">
            <span class="badge badge-success">{{ activeDelivery.status | uppercase }}</span>
            <strong>₹{{ activeDelivery.deliveryFee }}</strong>
          </div>
          <p>📍 {{ activeDelivery.pickupAddress?.address }}</p>
          <p>🏠 {{ activeDelivery.deliveryAddress?.address }}</p>
          <button class="btn btn-accent btn-full" style="margin-top:12px">View Details →</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dash-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; }
    .dash-header h2 { font-size: 22px; }
    .subtitle { font-size: 13px; color: #666; margin-top: 2px; }
    .toggle-card { display: flex; justify-content: space-between; align-items: center; }
    .toggle-card.online { border-left: 4px solid #4CAF50; }
    .toggle-content { display: flex; align-items: center; gap: 12px; }
    .toggle-content p { font-size: 12px; color: #888; margin-top: 2px; }
    .status-icon { font-size: 28px; color: #888; }
    .toggle-card.online .status-icon { color: #4CAF50; }
    .switch { position: relative; display: inline-block; width: 52px; height: 28px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #ccc; border-radius: 28px; transition: 0.3s; }
    .slider:before { content: ""; position: absolute; height: 22px; width: 22px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
    .switch input:checked + .slider { background: #4CAF50; }
    .switch input:checked + .slider:before { transform: translateX(24px); }
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
    .stat-card { text-align: center; padding: 16px 8px; }
    .stat-card .material-icons { font-size: 24px; color: #1B5E20; }
    .stat-card strong { display: block; font-size: 20px; margin: 4px 0; }
    .stat-card span:last-child { font-size: 11px; color: #888; }
    .section { margin-bottom: 16px; }
    .section h3 { font-size: 16px; margin-bottom: 10px; }
    .offer-card { border-left: 4px solid #FF6F00; }
    .offer-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .offer-fee { font-size: 18px; color: #1B5E20; }
    .offer-addr { font-size: 13px; color: #555; margin-bottom: 4px; }
    .offer-actions { display: flex; gap: 8px; margin-top: 12px; }
    .offer-actions .btn { flex: 1; padding: 10px; font-size: 14px; }
    .active-card { border-left: 4px solid #4CAF50; cursor: pointer; }
    .active-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {
  profile: DriverProfile | null = null;
  isOnline = false;
  pendingOffers: any[] = [];
  activeDelivery: any = null;
  private subs: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private api: DriverApiService,
    private ws: WebSocketService,
    private location: LocationService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.subs.push(
      this.auth.profile$.subscribe((p) => {
        this.profile = p;
        this.isOnline = p?.isAvailable ?? false;
      }),
    );

    // Connect WebSocket
    this.ws.connect();

    // Listen for new order offers via WebSocket
    this.subs.push(
      this.ws.getOrderOffers().subscribe(() => this.loadOffers()),
    );

    // Poll pending offers every 15s
    this.subs.push(
      interval(15000).pipe(
        filter(() => this.isOnline),
        switchMap(() => this.api.getPendingOffers()),
      ).subscribe((offers) => (this.pendingOffers = offers)),
    );

    this.loadOffers();
    this.loadActiveDelivery();
  }

  loadOffers() {
    this.api.getPendingOffers().subscribe((offers) => (this.pendingOffers = offers));
  }

  loadActiveDelivery() {
    this.api.getActiveDelivery().subscribe((d) => {
      this.activeDelivery = d.active === false ? null : d;
    });
  }

  async toggleOnline() {
    this.isOnline = !this.isOnline;
    let lat: number | undefined, lng: number | undefined;
    if (this.isOnline) {
      try {
        const pos = await this.location.getCurrentPosition();
        lat = pos.latitude; lng = pos.longitude;
      } catch { /* fallback: no location */ }
    }
    this.api.toggleAvailability(this.isOnline, lat, lng).subscribe();

    if (this.isOnline) {
      this.startLocationTracking();
    } else {
      this.location.stopTracking();
    }
  }

  private startLocationTracking() {
    this.subs.push(
      this.location.startTracking().pipe(
        filter((loc) => loc !== null),
      ).subscribe((loc) => {
        if (loc) {
          this.ws.sendLocationUpdate(loc.latitude, loc.longitude);
          this.api.updateLocation(loc.latitude, loc.longitude).subscribe();
        }
      }),
    );
  }

  acceptOffer(orderId: string) {
    this.api.acceptOrder(orderId).subscribe((delivery) => {
      this.activeDelivery = delivery;
      this.pendingOffers = this.pendingOffers.filter((o) => o.orderId !== orderId);
      this.ws.acceptDelivery(orderId);
      this.router.navigate(['/delivery']);
    });
  }

  rejectOffer(orderId: string) {
    this.api.rejectOrder(orderId).subscribe(() => {
      this.pendingOffers = this.pendingOffers.filter((o) => o.orderId !== orderId);
    });
  }

  goToDelivery() {
    this.router.navigate(['/delivery']);
  }

  logout() {
    this.ws.disconnect();
    this.location.stopTracking();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
    this.location.stopTracking();
  }
}
