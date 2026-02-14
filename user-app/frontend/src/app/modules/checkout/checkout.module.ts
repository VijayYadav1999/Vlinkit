import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CheckoutComponent } from './components/checkout/checkout.component';

@NgModule({
  declarations: [CheckoutComponent],
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  exports: [CheckoutComponent],
})
export class CheckoutModule {}
