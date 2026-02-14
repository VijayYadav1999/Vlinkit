import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/components/login/login.component';
import { ProductListComponent } from './modules/products/components/product-list/product-list.component';
import { CartComponent } from './modules/cart/components/cart/cart.component';
import { CheckoutComponent } from './modules/checkout/components/checkout/checkout.component';
import { OrderTrackingComponent } from './modules/orders/components/order-tracking/order-tracking.component';

const routes: Routes = [
  { path: '', redirectTo: '/products', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', redirectTo: '/login', pathMatch: 'full' },
  { path: 'products', component: ProductListComponent },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'orders/track/:orderId', component: OrderTrackingComponent },
  { path: 'orders/track', component: OrderTrackingComponent },
  { path: '**', redirectTo: '/products' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
