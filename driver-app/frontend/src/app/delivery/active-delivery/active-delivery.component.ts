import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { DriverApiService } from '../../shared/driver-api.service';
import { WebSocketService } from '../../shared/websocket.service';
import { LocationService } from '../../shared/location.service';

@Component({
  selector: 'app-active-delivery',
  template: `
    <div class="container delivery-page">
      <div *ngIf="!delivery">
        <h2>No Active Delivery</h2>
        <p class="subtitle">Accept an order to start delivering</p>
        <button class="btn btn-primary btn-full" routerLink="/orders">View Orders</button>
      </div>

      <div *ngIf="delivery">
        <!-- Status Progress -->
        <div class="status-bar">
          <div class="step" *ngFor="let step of steps; let i = index"
               [class.active]="currentStepIndex >= i" [class.current]="currentStepIndex === i">
            <div class="step-dot"></div>
            <span>{{ step.label }}</span>
          </div>
        </div>

        <!-- Map placeholder -->
        <div class="card map-card">
          <div class="map-placeholder">
            <span class="material-icons">map</span>
            <p>Live Navigation</p>
            <p class="map-info">{{ delivery.pickupAddress?.address }} → {{ delivery.deliveryAddress?.address }}</p>
          </div>
        </div>

        <!-- Order Details -->
        <div class="card">
          <h3>Order Details</h3>
          <div class="order-info">
            <div class="info-row">
              <span class="material-icons">store</span>
              <div>
                <strong>Pickup</strong>
                <p>{{ delivery.pickupAddress?.address }}</p>
              </div>
            </div>
            <div class="info-row">
              <span class="material-icons">home</span>
              <div>
                <strong>Drop-off</strong>
                <p>{{ delivery.deliveryAddress?.address }}</p>
              </div>
            </div>
          </div>
          <div class="items-summary">
            <span>{{ delivery.items?.length || 0 }} items · ₹{{ delivery.totalAmount }}</span>
            <span class="earn">Earn: ₹{{ delivery.deliveryFee }}</span>
          </div>
        </div>

        <!-- Action Button -->
        <button
          class="btn btn-full action-btn"
          [ngClass]="actionButtonClass"
          (click)="nextStatus()"
          [disabled]="delivery.status === 'delivered'"
        >
          {{ actionButtonText }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .delivery-page { padding-top: 16px; }
    .subtitle { color: #888; font-size: 13px; margin: 8px 0 20px; }
    .status-bar { display: flex; justify-content: space-between; margin-bottom: 16px; padding: 0 8px; }
    .step { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
    .step-dot { width: 12px; height: 12px; border-radius: 50%; background: #ddd; transition: all 0.3s; }
    .step.active .step-dot { background: #4CAF50; }
    .step.current .step-dot { background: #FF6F00; box-shadow: 0 0 0 4px rgba(255,111,0,0.2); }
    .step span { font-size: 10px; color: #888; text-align: center; }
    .step.active span { color: #1B5E20; font-weight: 600; }
    .map-card { padding: 0; overflow: hidden; }
    .map-placeholder { height: 200px; background: linear-gradient(135deg, #E8F5E9, #C8E6C9); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .map-placeholder .material-icons { font-size: 48px; color: #1B5E20; }
    .map-placeholder p { font-size: 14px; color: #333; }
    .map-info { font-size: 11px; color: #666; margin-top: 4px; text-align: center; padding: 0 16px; }
    h3 { font-size: 16px; margin-bottom: 12px; }
    .info-row { display: flex; gap: 10px; margin-bottom: 10px; }
    .info-row .material-icons { color: #1B5E20; }
    .info-row strong { font-size: 12px; color: #888; }
    .info-row p { font-size: 14px; }
    .items-summary { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #eee; font-size: 13px; }
    .earn { color: #1B5E20; font-weight: 600; }
    .action-btn { margin-top: 16px; padding: 16px; font-size: 16px; border-radius: 14px; }
    .btn-pickup { background: #FF6F00; color: #fff; }
    .btn-transit { background: #1B5E20; color: #fff; }
    .btn-arrived { background: #0277BD; color: #fff; }
    .btn-delivered { background: #4CAF50; color: #fff; }
    .btn-done { background: #ccc; color: #666; cursor: default; }
  `],
})
export class ActiveDeliveryComponent implements OnInit, OnDestroy {
  delivery: any = null;
  steps = [
    { status: 'accepted', label: 'Accepted' },
    { status: 'picked_up', label: 'Picked Up' },
    { status: 'on_the_way', label: 'On the Way' },
    { status: 'arrived', label: 'Arrived' },
    { status: 'delivered', label: 'Delivered' },
  ];
  currentStepIndex = 0;
  private subs: Subscription[] = [];

  constructor(
    private api: DriverApiService,
    private ws: WebSocketService,
    private location: LocationService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadDelivery();
    // Send location every 10s during delivery
    this.subs.push(
      interval(10000).pipe(
        filter(() => !!this.delivery),
        switchMap(() => this.location.startTracking()),
        filter((loc) => loc !== null),
      ).subscribe((loc) => {
        if (loc) {
          this.ws.sendLocationUpdate(loc.latitude, loc.longitude);
          this.api.updateLocation(loc.latitude, loc.longitude).subscribe();
        }
      }),
    );
  }

  loadDelivery() {
    this.api.getActiveDelivery().subscribe((d) => {
      if (d.active === false) {
        this.delivery = null;
      } else {
        this.delivery = d;
        this.currentStepIndex = this.steps.findIndex((s) => s.status === d.status);
      }
    });
  }

  get actionButtonText(): string {
    if (!this.delivery) return '';
    switch (this.delivery.status) {
      case 'accepted': return '📦 Mark as Picked Up';
      case 'picked_up': return '🚗 Start Delivery';
      case 'on_the_way': return '📍 I have Arrived';
      case 'arrived': return '✅ Mark Delivered';
      case 'delivered': return '✅ Delivery Complete';
      default: return '';
    }
  }

  get actionButtonClass(): string {
    if (!this.delivery) return '';
    switch (this.delivery.status) {
      case 'accepted': return 'btn-pickup';
      case 'picked_up': return 'btn-transit';
      case 'on_the_way': return 'btn-arrived';
      case 'arrived': return 'btn-delivered';
      case 'delivered': return 'btn-done';
      default: return '';
    }
  }

  nextStatus() {
    if (!this.delivery) return;
    const transitions: Record<string, string> = {
      accepted: 'picked_up',
      picked_up: 'on_the_way',
      on_the_way: 'arrived',
      arrived: 'delivered',
    };
    const next = transitions[this.delivery.status];
    if (!next) return;

    this.api.updateDeliveryStatus(next).subscribe((updated) => {
      this.delivery = updated;
      this.currentStepIndex = this.steps.findIndex((s) => s.status === updated.status);
      this.ws.sendDeliveryStatus(updated.orderId, updated.status);

      if (updated.status === 'delivered') {
        setTimeout(() => this.router.navigate(['/']), 2000);
      }
    });
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
