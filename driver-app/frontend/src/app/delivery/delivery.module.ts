import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActiveDeliveryComponent } from './active-delivery/active-delivery.component';

@NgModule({
  declarations: [ActiveDeliveryComponent],
  imports: [CommonModule, RouterModule],
})
export class DeliveryModule {}
