import { Component, OnInit } from '@angular/core';
import { DriverApiService } from '../shared/driver-api.service';

@Component({
  selector: 'app-earnings',
  template: `
    <div class="container earnings-page">
      <h2>💰 Earnings</h2>

      <!-- Period Tabs -->
      <div class="tabs">
        <button *ngFor="let p of periods" class="tab"
                [class.active]="selectedPeriod === p.value"
                (click)="selectPeriod(p.value)">
          {{ p.label }}
        </button>
      </div>

      <!-- Summary -->
      <div class="card summary-card">
        <div class="summary-main">
          <span class="label">Total Earnings</span>
          <strong class="amount">₹{{ earnings?.total?.toFixed(2) || '0.00' }}</strong>
        </div>
        <div class="summary-row">
          <div class="stat">
            <span>Deliveries</span>
            <strong>{{ earnings?.deliveryCount || 0 }}</strong>
          </div>
          <div class="stat">
            <span>Tips</span>
            <strong>₹{{ earnings?.tips?.toFixed(2) || '0.00' }}</strong>
          </div>
          <div class="stat">
            <span>Bonuses</span>
            <strong>₹{{ earnings?.bonuses?.toFixed(2) || '0.00' }}</strong>
          </div>
        </div>
      </div>

      <!-- Transaction List -->
      <h3>Recent Transactions</h3>
      <div *ngIf="earnings?.transactions?.length === 0" class="empty">
        No transactions for this period
      </div>
      <div class="card txn-card" *ngFor="let txn of earnings?.transactions || []">
        <div class="txn-row">
          <div class="txn-info">
            <span class="material-icons txn-icon"
                  [ngClass]="txn.type === 'delivery_fee' ? 'icon-green' : 'icon-amber'">
              {{ txn.type === 'delivery_fee' ? 'delivery_dining' : txn.type === 'tip' ? 'volunteer_activism' : 'stars' }}
            </span>
            <div>
              <strong>{{ txn.type | titlecase }}</strong>
              <p>{{ txn.createdAt | date:'short' }}</p>
            </div>
          </div>
          <strong class="txn-amount">+₹{{ txn.amount?.toFixed(2) }}</strong>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .earnings-page { padding-top: 20px; }
    .earnings-page h2 { font-size: 20px; margin-bottom: 12px; }
    .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
    .tab { padding: 8px 16px; border-radius: 20px; border: 1px solid #ddd; background: #fff; font-size: 13px; cursor: pointer; transition: all 0.2s; }
    .tab.active { background: #1B5E20; color: #fff; border-color: #1B5E20; }
    .summary-card { text-align: center; }
    .summary-main { margin-bottom: 16px; }
    .summary-main .label { font-size: 13px; color: #888; }
    .summary-main .amount { display: block; font-size: 32px; color: #1B5E20; margin-top: 4px; }
    .summary-row { display: flex; justify-content: space-around; padding-top: 12px; border-top: 1px solid #eee; }
    .stat { text-align: center; }
    .stat span { font-size: 12px; color: #888; }
    .stat strong { display: block; font-size: 16px; margin-top: 2px; }
    h3 { font-size: 16px; margin: 16px 0 10px; }
    .empty { color: #888; font-size: 13px; text-align: center; padding: 20px; }
    .txn-card { padding: 14px 16px; }
    .txn-row { display: flex; justify-content: space-between; align-items: center; }
    .txn-info { display: flex; gap: 10px; align-items: center; }
    .txn-icon { font-size: 24px; }
    .icon-green { color: #4CAF50; }
    .icon-amber { color: #FF6F00; }
    .txn-info strong { font-size: 14px; }
    .txn-info p { font-size: 11px; color: #888; margin-top: 2px; }
    .txn-amount { font-size: 16px; color: #1B5E20; }
  `],
})
export class EarningsComponent implements OnInit {
  periods = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
  ];
  selectedPeriod = 'today';
  earnings: any = null;

  constructor(private api: DriverApiService) {}

  ngOnInit() {
    this.loadEarnings();
  }

  selectPeriod(period: string) {
    this.selectedPeriod = period;
    this.loadEarnings();
  }

  loadEarnings() {
    this.api.getEarnings(this.selectedPeriod).subscribe((data) => {
      this.earnings = data;
    });
  }
}
