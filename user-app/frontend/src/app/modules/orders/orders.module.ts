import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderTrackingComponent } from './components/order-tracking/order-tracking.component';

@NgModule({
  declarations: [OrderTrackingComponent],
  imports: [CommonModule, RouterModule],
  exports: [OrderTrackingComponent],
})
export class OrdersModule {}
