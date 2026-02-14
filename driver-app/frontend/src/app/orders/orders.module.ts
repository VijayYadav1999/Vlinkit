import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderOffersComponent } from './order-offers/order-offers.component';

@NgModule({
  declarations: [OrderOffersComponent],
  imports: [CommonModule, RouterModule],
})
export class OrdersModule {}
