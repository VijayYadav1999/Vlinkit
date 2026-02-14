import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './shared/auth.guard';

import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { OrderOffersComponent } from './orders/order-offers/order-offers.component';
import { ActiveDeliveryComponent } from './delivery/active-delivery/active-delivery.component';
import { EarningsComponent } from './earnings/earnings.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'orders', component: OrderOffersComponent, canActivate: [AuthGuard] },
  { path: 'delivery', component: ActiveDeliveryComponent, canActivate: [AuthGuard] },
  { path: 'earnings', component: EarningsComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
