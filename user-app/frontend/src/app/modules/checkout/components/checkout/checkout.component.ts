import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartService } from '../../../../shared/services/cart.service';
import { OrderService } from '../../../../shared/services/order.service';

export interface Address {
  id?: number;
  type: 'HOME' | 'WORK' | 'OTHER';
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  landmark?: string;
  isDefault: boolean;
}

export interface OrderSummary {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  itemCount: number;
  estimatedDeliveryDate: string;
}

export interface PaymentMethod {
  id: string;
  type: 'CREDIT_CARD' | 'DEBIT_CARD' | 'UPI' | 'WALLET' | 'NET_BANKING';
  name: string;
  isDefault: boolean;
  lastUsed?: Date;
}

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css'],
})
export class CheckoutComponent implements OnInit, OnDestroy {
  // Forms
  addressForm: FormGroup;
  paymentForm: FormGroup;
  schedulingForm: FormGroup;

  // Data
  addresses: Address[] = [];
  selectedAddress: Address | null = null;
  paymentMethods: PaymentMethod[] = [];
  selectedPaymentMethod: PaymentMethod | null = null;
  orderSummary: OrderSummary;
  deliveryTypes: { id: string; label: string; price: number }[] = [];
  selectedDeliveryType: string = 'STANDARD';

  // States
  isLoading: boolean = false;
  isProcessing: boolean = false;
  error: string = '';
  successMessage: string = '';
  currentStep: 1 | 2 | 3 = 1; // 1: Address, 2: Payment, 3: Review
  isEditing: boolean = false;

  // Scheduling
  minDeliveryDate: Date;
  maxDeliveryDate: Date;
  selectedDeliveryDate: Date;
  selectedDeliveryTime: string = '09:00-14:00';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router
  ) {
    this.initializeForms();
    this.initializeDeliveryTypes();
    this.initializeMinMaxDates();
  }

  ngOnInit(): void {
    this.loadAddresses();
    this.loadPaymentMethods();
    this.loadOrderSummary();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.addressForm = this.fb.group({
      type: ['HOME', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      street: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      state: ['', [Validators.required, Validators.minLength(2)]],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      landmark: [''],
    });

    this.paymentForm = this.fb.group({
      method: ['', Validators.required],
    });

    this.schedulingForm = this.fb.group({
      deliveryType: ['STANDARD', Validators.required],
      deliveryDate: ['', Validators.required],
      deliveryTime: ['09:00-14:00', Validators.required],
    });
  }

  private initializeDeliveryTypes(): void {
    this.deliveryTypes = [
      {
        id: 'STANDARD',
        label: 'Standard Delivery (1-2 days)',
        price: 50,
      },
      {
        id: 'EXPRESS',
        label: 'Express Delivery (Same day)',
        price: 100,
      },
      {
        id: 'SCHEDULED',
        label: 'Scheduled Delivery',
        price: 0,
      },
    ];
  }

  private initializeMinMaxDates(): void {
    this.minDeliveryDate = new Date();
    this.minDeliveryDate.setDate(this.minDeliveryDate.getDate() + 1);

    this.maxDeliveryDate = new Date();
    this.maxDeliveryDate.setDate(this.maxDeliveryDate.getDate() + 30);

    this.selectedDeliveryDate = new Date(this.minDeliveryDate);
  }

  loadAddresses(): void {
    this.isLoading = true;
    this.error = '';

    // Mock addresses - would fetch from service
    this.addresses = [
      {
        id: 1,
        type: 'HOME',
        name: 'Home',
        phone: '9876543210',
        street: '123 Main Street, Apartment 4B',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        landmark: 'Near Tech Park',
        isDefault: true,
      },
      {
        id: 2,
        type: 'WORK',
        name: 'Office',
        phone: '9876543220',
        street: '456 Business Avenue, Suite 200',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560034',
        landmark: 'Near IT Hub',
        isDefault: false,
      },
    ];

    this.selectedAddress = this.addresses.find((a) => a.isDefault) || this.addresses[0];
    this.isLoading = false;
  }

  loadPaymentMethods(): void {
    // Mock payment methods
    this.paymentMethods = [
      {
        id: 'card_1',
        type: 'CREDIT_CARD',
        name: '**** **** **** 4242',
        isDefault: true,
        lastUsed: new Date(),
      },
      {
        id: 'upi_1',
        type: 'UPI',
        name: 'user@upi',
        isDefault: false,
      },
      {
        id: 'wallet_1',
        type: 'WALLET',
        name: 'Wallet (₹5000)',
        isDefault: false,
      },
    ];

    this.selectedPaymentMethod = this.paymentMethods.find((p) => p.isDefault) || this.paymentMethods[0];
  }

  loadOrderSummary(): void {
    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cart => {
        if (!cart || !cart.items || cart.items.length === 0) {
          this.router.navigate(['/cart']);
          return;
        }
        this.orderSummary = {
          subtotal: cart.subtotal,
          tax: cart.tax,
          deliveryFee: cart.deliveryFee,
          discount: cart.discount,
          totalAmount: cart.total,
          itemCount: cart.itemCount,
          estimatedDeliveryDate: new Date(Date.now() + 86400000).toLocaleDateString('en-IN'),
        };
      });
  }

  selectAddress(address: Address): void {
    this.selectedAddress = address;
    this.error = '';
  }

  addNewAddress(): void {
    this.isEditing = true;
    this.addressForm.reset({
      type: 'HOME',
      phone: '',
      name: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      landmark: '',
    });
  }

  saveAddress(): void {
    if (!this.addressForm.valid) {
      this.error = 'Please fill all required fields correctly';
      return;
    }

    const newAddress: Address = {
      id: Date.now(),
      ...this.addressForm.value,
      isDefault: false,
    };

    this.addresses.push(newAddress);
    this.selectedAddress = newAddress;
    this.isEditing = false;
    this.addressForm.reset();
    this.error = '';
  }

  cancelAddressEdit(): void {
    this.isEditing = false;
    this.addressForm.reset();
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
    this.paymentForm.get('method').setValue(method.id);
    this.error = '';
  }

  selectDeliveryType(type: string): void {
    this.selectedDeliveryType = type;
    this.schedulingForm.get('deliveryType').setValue(type);

    // Update order summary based on delivery type
    const deliveryType = this.deliveryTypes.find((dt) => dt.id === type);
    if (deliveryType) {
      this.orderSummary.deliveryFee = deliveryType.price;
      this.updateOrderTotal();
    }
  }

  updateOrderTotal(): void {
    this.orderSummary.totalAmount =
      this.orderSummary.subtotal +
      this.orderSummary.tax +
      this.orderSummary.deliveryFee -
      this.orderSummary.discount;
  }

  setDeliveryDate(date: Date): void {
    if (date >= this.minDeliveryDate && date <= this.maxDeliveryDate) {
      this.selectedDeliveryDate = date;
      this.schedulingForm.get('deliveryDate').setValue(date.toISOString().split('T')[0]);
    }
  }

  setDeliveryTime(time: string): void {
    this.selectedDeliveryTime = time;
    this.schedulingForm.get('deliveryTime').setValue(time);
  }

  goToStep(step: 1 | 2 | 3): void {
    if (!this.validateCurrentStep()) {
      return;
    }
    this.currentStep = step;
  }

  nextStep(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    if (this.currentStep === 1) {
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      this.currentStep = 3;
    }

    this.error = '';
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep = (this.currentStep - 1) as 1 | 2 | 3;
    }
  }

  validateCurrentStep(): boolean {
    if (this.currentStep === 1) {
      return this.validateAddressSelection();
    } else if (this.currentStep === 2) {
      return this.validatePaymentSelection();
    }
    return true;
  }

  validateAddressSelection(): boolean {
    if (!this.selectedAddress) {
      this.error = 'Please select or add delivery address';
      return false;
    }

    if (!this.selectedAddress.phone || !/^\d{10}$/.test(this.selectedAddress.phone)) {
      this.error = 'Invalid phone number in selected address';
      return false;
    }

    return true;
  }

  validatePaymentSelection(): boolean {
    if (!this.selectedPaymentMethod) {
      this.error = 'Please select a payment method';
      return false;
    }

    return true;
  }

  validateOrderData(): boolean {
    if (!this.validateAddressSelection()) {
      return false;
    }

    if (!this.validatePaymentSelection()) {
      return false;
    }

    if (this.orderSummary.totalAmount <= 0) {
      this.error = 'Invalid order total';
      return false;
    }

    return true;
  }

  placeOrder(): void {
    if (!this.validateOrderData()) {
      return;
    }

    this.isProcessing = true;
    this.error = '';

    // Prepare order data
    const orderData = {
      delivery_address: {
        address_line_1: this.selectedAddress?.street || '',
        city: this.selectedAddress?.city || '',
        state: this.selectedAddress?.state || '',
        postal_code: this.selectedAddress?.zipCode || '',
        latitude: 28.6139, // Default coordinates for demo (Delhi)
        longitude: 77.2090,
      },
      special_instructions: this.addressForm.get('landmark')?.value,
    };

    // Call backend to create order
    this.orderService.createOrder(orderData).subscribe({
      next: (order) => {
        this.isProcessing = false;
        this.successMessage = `Order placed successfully! Order ID: ${order.order_number}`;
        
        // Confirm payment to trigger Kafka event for drivers
        this.orderService.confirmPayment(order._id || '', 'payment_demo_' + Date.now()).subscribe({
          next: () => {
            console.log('Payment confirmed, drivers will see this order');
            // Clear cart
            this.cartService.clearCart();
            // Redirect after 2 seconds
            setTimeout(() => {
              this.router.navigate(['/orders']);
            }, 2000);
          },
          error: (err) => {
            console.warn('Payment confirmation failed:', err);
            // Still redirect even if payment confirmation fails
            setTimeout(() => {
              this.router.navigate(['/orders']);
            }, 2000);
          }
        });
      },
      error: (err) => {
        this.isProcessing = false;
        this.error = err.error?.message || 'Failed to place order. Please try again.';
        console.error('Order error:', err);
      }
    });
  }

  proceedToPaymentGateway(): void {
    if (!this.validatePaymentSelection()) {
      return;
    }

    // Mock Stripe/Razorpay integration
    console.log('Processing payment with method:', this.selectedPaymentMethod.type);
    // In real app, would initiate payment gateway
    this.placeOrder();
  }

  applyPromoCode(code: string): void {
    // Mock promo code application
    const validCodes: { [key: string]: number } = {
      WELCOME10: 10,
      SAVE50: 50,
    };

    const discountValue = validCodes[code];
    if (discountValue) {
      this.orderSummary.discount = discountValue;
      this.updateOrderTotal();
      this.successMessage = `Promo code applied: ₹${discountValue} off!`;
    } else {
      this.error = 'Invalid promo code';
    }
  }

  getStepStatus(step: 1 | 2 | 3): 'active' | 'completed' | 'pending' {
    if (step === this.currentStep) {
      return 'active';
    } else if (step < this.currentStep) {
      return 'completed';
    }
    return 'pending';
  }

  getDeliveryTypeName(typeId: string): string {
    return this.deliveryTypes.find((dt) => dt.id === typeId)?.label || typeId;
  }

  formatDeliveryDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  isAddressFormValid(): boolean {
    return this.addressForm.valid;
  }

  canProceedToCheckout(): boolean {
    return this.selectedAddress !== null && this.selectedPaymentMethod !== null;
  }
}
