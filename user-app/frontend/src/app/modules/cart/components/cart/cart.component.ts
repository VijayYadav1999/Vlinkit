import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  CartService,
  CartItem,
  Cart,
} from '../../../../shared/services/cart.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  subtotal: number = 0;
  taxRate: number = 0.05;
  tax: number = 0;
  deliveryFee: number = 50;
  discountAmount: number = 0;
  totalAmount: number = 0;
  couponCode: string = '';
  isLoading: boolean = false;
  error: string = '';

  itemsCount: number = 0;
  estimatedDeliveryDays: number = 1;
  estimatedDeliveryDate: Date;

  appliedCoupon: string = '';
  validCoupons: { [key: string]: number } = {
    WELCOME10: 10,
    FIRST20: 20,
    SAVE50: 50,
    FLAT100: 100,
  };

  couponForm: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private router: Router
  ) {
    this.couponForm = this.fb.group({
      coupon: ['', Validators.required],
    });
    this.calculateDeliveryDate();
  }

  ngOnInit(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      this.cartItems = cart.items;
      this.itemsCount = cart.itemCount;
      this.subtotal = cart.subtotal;
      this.tax = cart.tax;
      this.deliveryFee = cart.deliveryFee;
      this.totalAmount =
        this.subtotal + this.tax + this.deliveryFee - this.discountAmount;
      if (this.totalAmount < 0) this.totalAmount = 0;
    });
    this.setupCouponListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupCouponListener(): void {
    this.couponForm
      .get('coupon')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value) {
          this.couponCode = value.toUpperCase();
        }
      });
  }

  removeItem(productId: string): void {
    this.cartService.removeItem(productId);

    if (this.cartItems.length === 0) {
      this.appliedCoupon = '';
      this.couponForm.reset();
    }
  }

  updateQuantity(productId: string, newQuantity: number): void {
    this.cartService.updateQuantity(productId, newQuantity);
  }

  incrementQuantity(productId: string): void {
    this.cartService.incrementQuantity(productId);
  }

  decrementQuantity(productId: string): void {
    this.cartService.decrementQuantity(productId);
  }

  applyCoupon(): void {
    if (!this.couponCode) {
      this.error = 'Please enter a coupon code';
      return;
    }

    const discountValue = this.validCoupons[this.couponCode];

    if (!discountValue) {
      this.error = 'Invalid coupon code';
      return;
    }

    if (
      this.couponCode.includes('FLAT') ||
      this.couponCode.includes('SAVE')
    ) {
      this.discountAmount = discountValue;
    } else {
      this.discountAmount = (this.subtotal * discountValue) / 100;
    }

    this.appliedCoupon = this.couponCode;
    this.error = '';
    this.totalAmount =
      this.subtotal + this.tax + this.deliveryFee - this.discountAmount;
    if (this.totalAmount < 0) this.totalAmount = 0;
  }

  removeCoupon(): void {
    this.appliedCoupon = '';
    this.discountAmount = 0;
    this.couponForm.reset();
    this.error = '';
    this.totalAmount = this.subtotal + this.tax + this.deliveryFee;
  }

  calculateDeliveryDate(): void {
    this.estimatedDeliveryDate = new Date();
    this.estimatedDeliveryDate.setDate(
      this.estimatedDeliveryDate.getDate() + this.estimatedDeliveryDays
    );
  }

  clearCart(): void {
    if (confirm('Are you sure you want to clear the entire cart?')) {
      this.cartService.clearCart();
      this.appliedCoupon = '';
      this.discountAmount = 0;
      this.couponForm.reset();
      this.error = '';
    }
  }

  proceedToCheckout(): void {
    if (this.cartItems.length === 0) {
      this.error = 'Your cart is empty. Add items before checkout.';
      return;
    }

    const outOfStockItem = this.cartItems.find((item) => !item.inStock);
    if (outOfStockItem) {
      this.error = `${outOfStockItem.name} is out of stock`;
      return;
    }

    this.router.navigate(['/checkout']);
  }

  continueShopping(): void {
    this.router.navigate(['/products']);
  }

  getDeliveryDateString(): string {
    return this.estimatedDeliveryDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getItemSubtotal(item: CartItem): number {
    return item.price * item.quantity;
  }
}
