import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CheckoutComponent } from './checkout.component';

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CheckoutComponent],
      imports: [ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /* Initialization Tests */
  describe('Component Initialization', () => {
    it('should initialize forms on construction', () => {
      expect(component.addressForm).toBeTruthy();
      expect(component.paymentForm).toBeTruthy();
      expect(component.schedulingForm).toBeTruthy();
    });

    it('should load addresses on init', () => {
      expect(component.addresses).toBeTruthy();
      expect(component.addresses.length).toBeGreaterThan(0);
    });

    it('should load payment methods on init', () => {
      expect(component.paymentMethods).toBeTruthy();
      expect(component.paymentMethods.length).toBeGreaterThan(0);
    });

    it('should set initial step to 1', () => {
      expect(component.currentStep).toBe(1);
    });

    it('should select default address', () => {
      expect(component.selectedAddress).toBeTruthy();
    });

    it('should select default payment method', () => {
      expect(component.selectedPaymentMethod).toBeTruthy();
    });

    it('should initialize delivery types', () => {
      expect(component.deliveryTypes.length).toBeGreaterThan(0);
    });
  });

  /* Address Selection Tests */
  describe('Address Selection', () => {
    it('should select address when clicked', () => {
      const address = component.addresses[0];
      component.selectAddress(address);

      expect(component.selectedAddress).toBe(address);
    });

    it('should clear error when address is selected', () => {
      component.error = 'Some error';
      const address = component.addresses[0];

      component.selectAddress(address);

      expect(component.error).toBe('');
    });

    it('should validate address selection', () => {
      component.selectedAddress = component.addresses[0];

      const isValid = component.validateAddressSelection();

      expect(isValid).toBeTruthy();
    });

    it('should reject null address', () => {
      component.selectedAddress = null;

      const isValid = component.validateAddressSelection();

      expect(isValid).toBeFalsy();
      expect(component.error).toBeTruthy();
    });

    it('should reject invalid phone number', () => {
      component.selectedAddress = { ...component.addresses[0], phone: '123' };

      const isValid = component.validateAddressSelection();

      expect(isValid).toBeFalsy();
    });
  });

  /* Add New Address Tests */
  describe('Add New Address', () => {
    it('should reset form when adding new address', () => {
      component.addressForm.get('name').setValue('Test Name');
      component.addressForm.get('phone').setValue('9876543210');

      component.addNewAddress();

      expect(component.isEditing).toBeTruthy();
      expect(component.addressForm.get('name').value).toBe('');
    });

    it('should save valid address', () => {
      const initialCount = component.addresses.length;

      component.addressForm.patchValue({
        type: 'HOME',
        name: 'New Home',
        phone: '9876543210',
        street: 'New Street, Apt 5',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001',
        landmark: 'Near Park',
      });

      component.saveAddress();

      expect(component.addresses.length).toBe(initialCount + 1);
      expect(component.isEditing).toBeFalsy();
    });

    it('should reject invalid address form', () => {
      component.addressForm.patchValue({
        name: '', // Empty name
      });

      component.saveAddress();

      expect(component.error).toBeTruthy();
    });

    it('should cancel address edit', () => {
      component.addNewAddress();
      expect(component.isEditing).toBeTruthy();

      component.cancelAddressEdit();

      expect(component.isEditing).toBeFalsy();
    });
  });

  /* Payment Method Tests */
  describe('Payment Method Selection', () => {
    it('should select payment method when clicked', () => {
      const method = component.paymentMethods[0];
      component.selectPaymentMethod(method);

      expect(component.selectedPaymentMethod).toBe(method);
    });

    it('should update payment form when method is selected', () => {
      const method = component.paymentMethods[0];
      component.selectPaymentMethod(method);

      expect(component.paymentForm.get('method').value).toBe(method.id);
    });

    it('should validate payment selection', () => {
      component.selectedPaymentMethod = component.paymentMethods[0];

      const isValid = component.validatePaymentSelection();

      expect(isValid).toBeTruthy();
    });

    it('should reject null payment method', () => {
      component.selectedPaymentMethod = null;

      const isValid = component.validatePaymentSelection();

      expect(isValid).toBeFalsy();
    });
  });

  /* Delivery Type Tests */
  describe('Delivery Type Selection', () => {
    it('should select standard delivery', () => {
      component.selectDeliveryType('STANDARD');

      expect(component.selectedDeliveryType).toBe('STANDARD');
    });

    it('should select express delivery', () => {
      component.selectDeliveryType('EXPRESS');

      expect(component.selectedDeliveryType).toBe('EXPRESS');
    });

    it('should select scheduled delivery', () => {
      component.selectDeliveryType('SCHEDULED');

      expect(component.selectedDeliveryType).toBe('SCHEDULED');
    });

    it('should update delivery fee when delivery type changes', () => {
      const initialFee = component.orderSummary.deliveryFee;

      component.selectDeliveryType('EXPRESS');

      expect(component.orderSummary.deliveryFee).not.toBe(initialFee);
    });

    it('should update order total when delivery type changes', () => {
      const initialTotal = component.orderSummary.totalAmount;

      component.selectDeliveryType('EXPRESS');

      expect(component.orderSummary.totalAmount).not.toBe(initialTotal);
    });
  });

  /* Delivery Date/Time Tests */
  describe('Scheduled Delivery', () => {
    it('should set delivery date within valid range', () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 5);

      component.setDeliveryDate(validDate);

      expect(component.selectedDeliveryDate).toEqual(validDate);
    });

    it('should not set delivery date before minimum', () => {
      const pastDate = new Date();
      const beforeSetDate = component.selectedDeliveryDate;

      component.setDeliveryDate(pastDate);

      expect(component.selectedDeliveryDate).toEqual(beforeSetDate);
    });

    it('should not set delivery date after maximum', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 100);
      const beforeSetDate = component.selectedDeliveryDate;

      component.setDeliveryDate(futureDate);

      expect(component.selectedDeliveryDate).toEqual(beforeSetDate);
    });

    it('should set delivery time', () => {
      component.setDeliveryTime('14:00-18:00');

      expect(component.selectedDeliveryTime).toBe('14:00-18:00');
    });
  });

  /* Step Navigation Tests */
  describe('Step Navigation', () => {
    it('should start on step 1', () => {
      expect(component.currentStep).toBe(1);
    });

    it('should go to next step', () => {
      component.selectedAddress = component.addresses[0];
      component.nextStep();

      expect(component.currentStep).toBe(2);
    });

    it('should go to previous step', () => {
      component.currentStep = 2;
      component.previousStep();

      expect(component.currentStep).toBe(1);
    });

    it('should not go below step 1', () => {
      component.currentStep = 1;
      component.previousStep();

      expect(component.currentStep).toBe(1);
    });

    it('should validate step before moving forward', () => {
      component.currentStep = 1;
      component.selectedAddress = null;

      component.nextStep();

      expect(component.currentStep).toBe(1);
      expect(component.error).toBeTruthy();
    });

    it('should go to specific step', () => {
      component.goToStep(3);

      // Should only go to step 3 if steps 1 and 2 are validated
      // In current implementation, would need validation
    });

    it('should get correct step status', () => {
      component.currentStep = 2;

      expect(component.getStepStatus(1)).toBe('completed');
      expect(component.getStepStatus(2)).toBe('active');
      expect(component.getStepStatus(3)).toBe('pending');
    });
  });

  /* Order Validation Tests */
  describe('Order Validation', () => {
    it('should validate complete order data', () => {
      component.selectedAddress = component.addresses[0];
      component.selectedPaymentMethod = component.paymentMethods[0];
      component.orderSummary.totalAmount = 500;

      const isValid = component.validateOrderData();

      expect(isValid).toBeTruthy();
    });

    it('should reject order without address', () => {
      component.selectedAddress = null;
      component.selectedPaymentMethod = component.paymentMethods[0];

      const isValid = component.validateOrderData();

      expect(isValid).toBeFalsy();
    });

    it('should reject order without payment method', () => {
      component.selectedAddress = component.addresses[0];
      component.selectedPaymentMethod = null;

      const isValid = component.validateOrderData();

      expect(isValid).toBeFalsy();
    });

    it('should reject order with zero or negative total', () => {
      component.selectedAddress = component.addresses[0];
      component.selectedPaymentMethod = component.paymentMethods[0];
      component.orderSummary.totalAmount = -100;

      const isValid = component.validateOrderData();

      expect(isValid).toBeFalsy();
    });
  });

  /* Place Order Tests */
  describe('Place Order', () => {
    it('should place order with valid data', (done) => {
      component.selectedAddress = component.addresses[0];
      component.selectedPaymentMethod = component.paymentMethods[0];
      component.orderSummary.totalAmount = 500;

      component.placeOrder();

      setTimeout(() => {
        expect(component.successMessage).toBeTruthy();
        expect(component.isProcessing).toBeFalsy();
        done();
      }, 2100);
    });

    it('should set processing state while placing order', () => {
      component.selectedAddress = component.addresses[0];
      component.selectedPaymentMethod = component.paymentMethods[0];

      component.placeOrder();

      expect(component.isProcessing).toBeTruthy();
    });

    it('should not place order without validation', () => {
      component.selectedAddress = null;
      component.selectedPaymentMethod = null;

      component.placeOrder();

      expect(component.error).toBeTruthy();
    });
  });

  /* Promo Code Tests */
  describe('Promo Code Application', () => {
    it('should apply valid promo code', () => {
      component.orderSummary.subtotal = 1000;
      component.orderSummary.discount = 0;

      component.applyPromoCode('WELCOME10');

      expect(component.orderSummary.discount).toBeGreaterThan(0);
      expect(component.successMessage).toBeTruthy();
    });

    it('should reject invalid promo code', () => {
      component.applyPromoCode('INVALID123');

      expect(component.error).toContain('Invalid');
    });

    it('should update order total when promo is applied', () => {
      const initialTotal = component.orderSummary.totalAmount;

      component.applyPromoCode('SAVE50');

      expect(component.orderSummary.totalAmount).toBeLessThan(initialTotal);
    });
  });

  /* Utility Method Tests */
  describe('Utility Methods', () => {
    it('should get delivery type name', () => {
      const name = component.getDeliveryTypeName('STANDARD');

      expect(name).toContain('Standard');
    });

    it('should format delivery date correctly', () => {
      const date = new Date('2024-12-25');
      const formatted = component.formatDeliveryDate(date);

      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should check if address form is valid', () => {
      component.addressForm.patchValue({
        type: 'HOME',
        name: 'Test',
        phone: '9876543210',
        street: 'Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '560001',
      });

      expect(component.isAddressFormValid()).toBeTruthy();
    });

    it('should check if can proceed to checkout', () => {
      component.selectedAddress = component.addresses[0];
      component.selectedPaymentMethod = component.paymentMethods[0];

      expect(component.canProceedToCheckout()).toBeTruthy();
    });

    it('should not proceed if address is missing', () => {
      component.selectedAddress = null;
      component.selectedPaymentMethod = component.paymentMethods[0];

      expect(component.canProceedToCheckout()).toBeFalsy();
    });

    it('should not proceed if payment method is missing', () => {
      component.selectedAddress = component.addresses[0];
      component.selectedPaymentMethod = null;

      expect(component.canProceedToCheckout()).toBeFalsy();
    });
  });

  /* Order Total Calculation Tests */
  describe('Order Total Calculation', () => {
    it('should update order total correctly', () => {
      component.orderSummary.subtotal = 1000;
      component.orderSummary.tax = 50;
      component.orderSummary.deliveryFee = 100;
      component.orderSummary.discount = 50;

      component.updateOrderTotal();

      expect(component.orderSummary.totalAmount).toBe(1100);
    });

    it('should calculate total with different delivery fees', () => {
      component.orderSummary.subtotal = 500;
      component.orderSummary.tax = 25;
      component.orderSummary.deliveryFee = 50;
      component.orderSummary.discount = 0;

      const totalWithBasic = component.orderSummary.totalAmount;

      component.orderSummary.deliveryFee = 100;
      component.updateOrderTotal();

      expect(component.orderSummary.totalAmount).toBeGreaterThan(
        totalWithBasic
      );
    });
  });

  /* Edge Cases */
  describe('Edge Cases', () => {
    it('should handle empty addresses list gracefully', () => {
      component.addresses = [];

      expect(() => component.selectAddress(null)).not.toThrow();
    });

    it('should handle empty payment methods gracefully', () => {
      component.paymentMethods = [];

      expect(() => component.selectPaymentMethod(null)).not.toThrow();
    });

    it('should handle very large order amounts', () => {
      component.orderSummary.subtotal = 999999;
      component.orderSummary.tax = 49999.95;
      component.orderSummary.deliveryFee = 100;

      component.updateOrderTotal();

      expect(component.orderSummary.totalAmount).toBeGreaterThan(0);
    });

    it('should handle addresses with special characters', () => {
      component.addressForm.patchValue({
        street: "Apt #5, O'Brien Building, Street-X",
      });

      expect(component.addressForm.get('street').valid).toBeTruthy();
    });
  });

  /* Integration Tests */
  describe('Integration Tests', () => {
    it('should complete full checkout flow', (done) => {
      // Step 1: Select address
      component.selectAddress(component.addresses[0]);
      expect(component.selectedAddress).toBeTruthy();

      // Step 2: Move to payment step
      component.nextStep();
      expect(component.currentStep).toBe(2);

      // Step 3: Select payment
      component.selectPaymentMethod(component.paymentMethods[0]);
      expect(component.selectedPaymentMethod).toBeTruthy();

      // Step 4: Move to review
      component.nextStep();
      expect(component.currentStep).toBe(3);

      // Step 5: Place order
      component.placeOrder();

      setTimeout(() => {
        expect(component.successMessage).toBeTruthy();
        done();
      }, 2100);
    });

    it('should handle address change after payment selection', () => {
      component.currentStep = 2;
      const firstAddress = component.addresses[0];
      const secondAddress = component.addresses[1];

      component.selectAddress(firstAddress);
      expect(component.selectedAddress).toBe(firstAddress);

      component.selectAddress(secondAddress);
      expect(component.selectedAddress).toBe(secondAddress);
    });

    it('should apply promo code and update totals', () => {
      const initialTotal = component.orderSummary.totalAmount;

      component.applyPromoCode('WELCOME10');

      const newTotal = component.orderSummary.totalAmount;

      expect(newTotal).toBeLessThan(initialTotal);
    });
  });

  /* Memory Management */
  describe('Memory Management', () => {
    it('should unsubscribe on component destroy', () => {
      const spy = spyOn(component['destroy$'], 'next');

      component.ngOnDestroy();

      expect(spy).toHaveBeenCalled();
    });
  });
});
