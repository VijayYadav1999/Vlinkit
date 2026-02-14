import { Component, OnInit } from '@angular/core';
import { DriverApiService } from '../../shared/driver-api.service';
import { WebSocketService } from '../../shared/websocket.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-offers',
  template: `
    <div class="container offers-page">
      <h2>📦 Order Offers</h2>
      <p class="subtitle" *ngIf="offers.length === 0">No pending orders right now. Stay online to receive offers.</p>

      <div class="card offer-card" *ngFor="let offer of offers">
        <div class="offer-header">
          <span class="badge badge-warning">{{ offer.estimatedDistance?.toFixed(1) }} km away</span>
          <span class="offer-timer">⏱ Expires soon</span>
        </div>
        <div class="offer-body">
          <div class="offer-detail">
            <span class="material-icons">store</span>
            <div>
              <strong>Pickup</strong>
              <p>{{ offer.pickupAddress?.address }}</p>
            </div>
          </div>
          <div class="offer-detail">
            <span class="material-icons">home</span>
            <div>
              <strong>Drop-off</strong>
              <p>{{ offer.deliveryAddress?.address }}</p>
            </div>
          </div>
          <div class="offer-items">
            <span>{{ offer.items?.length || 0 }} items · ₹{{ offer.totalAmount }}</span>
          </div>
        </div>
        <div class="offer-footer">
          <div class="earn-box">
            <span>You earn</span>
            <strong>₹{{ offer.deliveryFee }}</strong>
          </div>
          <div class="offer-actions">
            <button class="btn btn-danger" (click)="reject(offer.orderId)">Decline</button>
            <button class="btn btn-primary" (click)="accept(offer.orderId)">Accept</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .offers-page { padding-top: 20px; }
    .offers-page h2 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { color: #888; font-size: 13px; margin-bottom: 16px; }
    .offer-card { border-left: 4px solid #FF6F00; margin-bottom: 12px; }
    .offer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .offer-timer { font-size: 12px; color: #D32F2F; }
    .offer-detail { display: flex; gap: 10px; margin-bottom: 10px; }
    .offer-detail .material-icons { color: #1B5E20; margin-top: 2px; }
    .offer-detail strong { font-size: 12px; color: #888; }
    .offer-detail p { font-size: 14px; margin-top: 2px; }
    .offer-items { font-size: 13px; color: #555; padding: 8px 0; border-top: 1px solid #eee; }
    .offer-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #eee; }
    .earn-box { text-align: left; }
    .earn-box span { font-size: 11px; color: #888; display: block; }
    .earn-box strong { font-size: 20px; color: #1B5E20; }
    .offer-actions { display: flex; gap: 8px; }
    .offer-actions .btn { padding: 10px 16px; font-size: 13px; }
  `],
})
export class OrderOffersComponent implements OnInit {
  offers: any[] = [];

  constructor(
    private api: DriverApiService,
    private ws: WebSocketService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadOffers();
    this.ws.getOrderOffers().subscribe(() => this.loadOffers());
  }

  loadOffers() {
    this.api.getPendingOffers().subscribe((offers) => (this.offers = offers));
  }

  accept(orderId: string) {
    this.api.acceptOrder(orderId).subscribe(() => {
      this.ws.acceptDelivery(orderId);
      this.router.navigate(['/delivery']);
    });
  }

  reject(orderId: string) {
    this.api.rejectOrder(orderId).subscribe(() => {
      this.offers = this.offers.filter((o) => o.orderId !== orderId);
    });
  }
}
