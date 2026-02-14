import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CartComponent } from './cart.component';

describe('CartComponent', () => {
  let component: CartComponent;
  let fixture: ComponentFixture<CartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CartComponent],
      imports: [ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /* Initialization Tests */
  describe('Component Initialization', () => {
    it('should load cart items on init', () => {
      expect(component.cartItems).toBeTruthy();
      expect(component.cartItems.length).toBeGreaterThan(0);
    });

    it('should initialize coupon form with coupon control', () => {
      expect(component.couponForm.get('coupon')).toBeTruthy();
    });

    it('should set default tax rate to 5%', () => {
      expect(component.taxRate).toBe(0.05);
    });

    it('should set default delivery fee to 50', () => {
      expect(component.deliveryFee).toBe(50);
    });

    it('should calculate delivery date correctly', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(component.estimatedDeliveryDate.getDate()).toBe(tomorrow.getDate());
    });
  });

  /* Add Item Tests */
  describe('Add Item to Cart', () => {
    it('should increment quantity if item already exists', () => {
      const initialItem = { ...component.cartItems[0] };
      const initialQuantity = initialItem.quantity;

      component.addItem(initialItem);

      const updatedItem = component.cartItems.find(
        (ci) => ci.productId === initialItem.productId
      );
      expect(updatedItem.quantity).toBe(initialQuantity + 1);
    });

    it('should add new item to cart', () => {
      const newItem = {
        productId: 999,
        name: 'New Product',
        description: 'Test',
        price: 100,
        image_url: 'test.jpg',
        category: 'Test',
        quantity: 1,
        maxQuantity: 5,
        inStock: true,
      };

      const initialLength = component.cartItems.length;
      component.addItem(newItem);

      expect(component.cartItems.length).toBe(initialLength + 1);
    });

    it('should not exceed maximum quantity when adding item', () => {
      const item = component.cartItems[0];
      item.maxQuantity = 2;
      item.quantity = 2;

      component.addItem(item);

      expect(item.quantity).toBe(2);
    });

    it('should set error when maximum quantity reached', () => {
      const item = component.cartItems[0];
      item.maxQuantity = 1;
      item.quantity = 1;

      component.addItem(item);

      expect(component.error).toContain('Max quantity reached');
    });

    it('should update items count when adding item', () => {
      const initialCount = component.itemsCount;
      const newItem = {
        productId: 999,
        name: 'New Product',
        description: 'Test',
        price: 100,
        image_url: 'test.jpg',
        category: 'Test',
        quantity: 1,
        maxQuantity: 5,
        inStock: true,
      };

      component.addItem(newItem);

      expect(component.itemsCount).toBe(initialCount + 1);
    });
  });

  /* Remove Item Tests */
  describe('Remove Item from Cart', () => {
    it('should remove item from cart', () => {
      const itemToRemove = component.cartItems[0];
      const initialLength = component.cartItems.length;

      component.removeItem(itemToRemove.productId);

      expect(component.cartItems.length).toBe(initialLength - 1);
    });

    it('should update items count when removing item', () => {
      const itemToRemove = component.cartItems[0];
      component.removeItem(itemToRemove.productId);

      expect(component.itemsCount).toBeLessThan(4);
    });

    it('should clear coupon when cart becomes empty', () => {
      component.cartItems = [component.cartItems[0]];
      component.appliedCoupon = 'WELCOME10';

      component.removeItem(component.cartItems[0].productId);

      expect(component.appliedCoupon).toBe('');
    });

    it('should handle removing non-existent item', () => {
      const initialLength = component.cartItems.length;
      component.removeItem(99999);

      expect(component.cartItems.length).toBe(initialLength);
    });
  });

  /* Update Quantity Tests */
  describe('Update Quantity', () => {
    it('should update item quantity', () => {
      const item = component.cartItems[0];
      component.updateQuantity(item.productId, 5);

      expect(item.quantity).toBe(5);
    });

    it('should remove item if quantity becomes 0', () => {
      const item = component.cartItems[0];
      const initialLength = component.cartItems.length;

      component.updateQuantity(item.productId, 0);

      expect(component.cartItems.length).toBe(initialLength - 1);
    });

    it('should not exceed maximum quantity', () => {
      const item = component.cartItems[0];
      item.maxQuantity = 5;

      component.updateQuantity(item.productId, 10);

      expect(component.error).toContain('Cannot exceed maximum quantity');
    });

    it('should set error for negative quantity', () => {
      const item = component.cartItems[0];
      component.updateQuantity(item.productId, -5);

      expect(component.cartItems).not.toContain(item);
    });

    it('should update items count after quantity change', () => {
      const item = component.cartItems[0];
      const oldQuantity = item.quantity;

      component.updateQuantity(item.productId, oldQuantity + 3);

      expect(component.itemsCount).toBe(
        component.cartItems.reduce((sum, ci) => sum + ci.quantity, 0)
      );
    });
  });

  /* Increment/Decrement Tests */
  describe('Increment/Decrement Quantity', () => {
    it('should increment quantity by 1', () => {
      const item = component.cartItems[0];
      const initialQuantity = item.quantity;

      component.incrementQuantity(item.productId);

      expect(item.quantity).toBe(initialQuantity + 1);
    });

    it('should decrement quantity by 1', () => {
      const item = component.cartItems[0];
      item.quantity = 5;
      const initialQuantity = item.quantity;

      component.decrementQuantity(item.productId);

      expect(item.quantity).toBe(initialQuantity - 1);
    });

    it('should not increment beyond max quantity', () => {
      const item = component.cartItems[0];
      item.maxQuantity = 2;
      item.quantity = 2;

      component.incrementQuantity(item.productId);

      expect(item.quantity).toBe(2);
    });

    it('should not decrement below 1', () => {
      const item = component.cartItems[0];
      item.quantity = 1;

      component.decrementQuantity(item.productId);

      expect(item.quantity).toBe(1);
    });
  });

  /* Coupon Tests */
  describe('Coupon Application', () => {
    it('should apply valid percentage coupon', () => {
      component.couponCode = 'WELCOME10';
      component.subtotal = 1000;

      component.applyCoupon();

      expect(component.discountAmount).toBe(100); // 10% of 1000
      expect(component.appliedCoupon).toBe('WELCOME10');
    });

    it('should apply valid flat discount coupon', () => {
      component.couponCode = 'SAVE50';
      component.subtotal = 1000;

      component.applyCoupon();

      expect(component.discountAmount).toBe(50);
      expect(component.appliedCoupon).toBe('SAVE50');
    });

    it('should set error for invalid coupon code', () => {
      component.couponCode = 'INVALID123';

      component.applyCoupon();

      expect(component.error).toContain('Invalid coupon code');
      expect(component.appliedCoupon).toBe('');
    });

    it('should require coupon code before applying', () => {
      component.couponCode = '';

      component.applyCoupon();

      expect(component.error).toContain('Please enter a coupon code');
    });

    it('should remove coupon when removeCoupon is called', () => {
      component.appliedCoupon = 'WELCOME10';
      component.discountAmount = 100;

      component.removeCoupon();

      expect(component.appliedCoupon).toBe('');
      expect(component.discountAmount).toBe(0);
    });

    it('should validate coupon code correctly', () => {
      expect(component.isCouponValid('WELCOME10')).toBeTruthy();
      expect(component.isCouponValid('INVALID')).toBeFalsy();
    });
  });

  /* Total Calculation Tests */
  describe('Calculate Totals', () => {
    it('should calculate subtotal correctly', () => {
      component.cartItems = [
        {
          productId: 1,
          name: 'Item 1',
          description: 'Test',
          price: 100,
          image_url: 'test.jpg',
          category: 'Test',
          quantity: 2,
          maxQuantity: 5,
          inStock: true,
        },
        {
          productId: 2,
          name: 'Item 2',
          description: 'Test',
          price: 50,
          image_url: 'test.jpg',
          category: 'Test',
          quantity: 3,
          maxQuantity: 5,
          inStock: true,
        },
      ];

      component.calculateTotals();

      expect(component.subtotal).toBe(350); // (100*2) + (50*3)
    });

    it('should calculate tax correctly', () => {
      component.subtotal = 1000;
      component.taxRate = 0.05;

      component.calculateTotals();

      expect(component.tax).toBe(50);
    });

    it('should include delivery fee in total', () => {
      component.subtotal = 1000;
      component.tax = 50;
      component.deliveryFee = 50;
      component.discountAmount = 0;

      component.calculateTotals();

      expect(component.totalAmount).toBe(1100);
    });

    it('should subtract discount from total', () => {
      component.subtotal = 1000;
      component.tax = 50;
      component.deliveryFee = 50;
      component.discountAmount = 100;

      component.calculateTotals();

      expect(component.totalAmount).toBe(1000);
    });

    it('should not allow negative total amount', () => {
      component.subtotal = 100;
      component.tax = 5;
      component.deliveryFee = 10;
      component.discountAmount = 200;

      component.calculateTotals();

      expect(component.totalAmount).toBeGreaterThanOrEqual(0);
    });
  });

  /* Clear Cart Tests */
  describe('Clear Cart', () => {
    it('should clear all cart items when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);

      component.clearCart();

      expect(component.cartItems.length).toBe(0);
    });

    it('should not clear cart if not confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      const initialLength = component.cartItems.length;

      component.clearCart();

      expect(component.cartItems.length).toBe(initialLength);
    });

    it('should remove applied coupon when clearing cart', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.appliedCoupon = 'WELCOME10';

      component.clearCart();

      expect(component.appliedCoupon).toBe('');
    });

    it('should reset items count when clearing', () => {
      spyOn(window, 'confirm').and.returnValue(true);

      component.clearCart();

      expect(component.itemsCount).toBe(0);
    });
  });

  /* Proceed to Checkout Tests */
  describe('Proceed to Checkout', () => {
    it('should allow checkout when cart has items', () => {
      component.cartItems = [
        {
          productId: 1,
          name: 'Item 1',
          description: 'Test',
          price: 100,
          image_url: 'test.jpg',
          category: 'Test',
          quantity: 1,
          maxQuantity: 5,
          inStock: true,
        },
      ];

      component.proceedToCheckout();

      expect(component.error).toBe('');
    });

    it('should set error when cart is empty', () => {
      component.cartItems = [];

      component.proceedToCheckout();

      expect(component.error).toContain('cart is empty');
    });

    it('should set error when item is out of stock', () => {
      component.cartItems = [
        {
          productId: 1,
          name: 'Item 1',
          description: 'Test',
          price: 100,
          image_url: 'test.jpg',
          category: 'Test',
          quantity: 1,
          maxQuantity: 5,
          inStock: false,
        },
      ];

      component.proceedToCheckout();

      expect(component.error).toContain('out of stock');
    });
  });

  /* Validate Order Data Tests */
  describe('Validate Order Data', () => {
    it('should validate order data successfully', () => {
      component.cartItems = [
        {
          productId: 1,
          name: 'Item 1',
          description: 'Test',
          price: 100,
          image_url: 'test.jpg',
          category: 'Test',
          quantity: 1,
          maxQuantity: 5,
          inStock: true,
        },
      ];
      component.totalAmount = 100;

      expect(component.validateOrderData()).toBeTruthy();
    });

    it('should reject empty cart', () => {
      component.cartItems = [];

      expect(component.validateOrderData()).toBeFalsy();
    });

    it('should reject invalid total amount', () => {
      component.cartItems = [
        {
          productId: 1,
          name: 'Item 1',
          description: 'Test',
          price: 100,
          image_url: 'test.jpg',
          category: 'Test',
          quantity: 1,
          maxQuantity: 5,
          inStock: true,
        },
      ];
      component.totalAmount = -10;

      expect(component.validateOrderData()).toBeFalsy();
    });

    it('should reject invalid item quantity', () => {
      component.cartItems = [
        {
          productId: 1,
          name: 'Item 1',
          description: 'Test',
          price: 100,
          image_url: 'test.jpg',
          category: 'Test',
          quantity: 0,
          maxQuantity: 5,
          inStock: true,
        },
      ];
      component.totalAmount = 100;

      expect(component.validateOrderData()).toBeFalsy();
    });
  });

  /* Utility Method Tests */
  describe('Utility Methods', () => {
    it('should calculate item subtotal correctly', () => {
      const item = {
        productId: 1,
        name: 'Item',
        description: 'Test',
        price: 100,
        image_url: 'test.jpg',
        category: 'Test',
        quantity: 3,
        maxQuantity: 5,
        inStock: true,
      };

      const subtotal = component.getItemSubtotal(item);

      expect(subtotal).toBe(300);
    });

    it('should format delivery date correctly', () => {
      component.estimatedDeliveryDate = new Date('2024-12-25');

      const formatted = component.getDeliveryDateString();

      expect(formatted).toBeTruthy();
      expect(formatted).toContain('December');
    });
  });

  /* Edge Cases */
  describe('Edge Cases', () => {
    it('should handle empty product name', () => {
      component.cartItems = [
        {
          productId: 1,
          name: '',
          description: 'Test',
          price: 100,
          image_url: 'test.jpg',
          category: 'Test',
          quantity: 1,
          maxQuantity: 5,
          inStock: true,
        },
      ];

      component.calculateTotals();

      expect(component.subtotal).toBe(100);
    });

    it('should handle very large quantities', () => {
      component.cartItems = [
        {
          productId: 1,
          name: 'Item',
          description: 'Test',
          price: 100,
          image_url: 'test.jpg',
          category: 'Test',
          quantity: 999999,
          maxQuantity: 1000000,
          inStock: true,
        },
      ];

      component.calculateTotals();

      expect(component.subtotal).toBe(99999900);
    });

    it('should handle zero price items', () => {
      component.cartItems = [
        {
          productId: 1,
          name: 'Free Item',
          description: 'Test',
          price: 0,
          image_url: 'test.jpg',
          category: 'Test',
          quantity: 5,
          maxQuantity: 10,
          inStock: true,
        },
      ];

      component.calculateTotals();

      expect(component.subtotal).toBe(0);
    });
  });

  /* Integration Tests */
  describe('Integration Tests', () => {
    it('should complete full cart workflow', () => {
      // Load cart
      component.loadCartItems();
      expect(component.cartItems.length).toBeGreaterThan(0);

      // Add item
      component.addItem(component.cartItems[0]);

      // Apply coupon
      component.couponCode = 'WELCOME10';
      component.applyCoupon();

      // Validate order
      const isValid = component.validateOrderData();

      expect(isValid).toBeTruthy();
    });

    it('should maintain totals after coupon removal', () => {
      component.calculateTotals();
      const totalWithCoupon = component.totalAmount;

      component.appliedCoupon = 'WELCOME10';
      component.discountAmount = 100;
      component.calculateTotals();
      const totalAfterCoupon = component.totalAmount;

      expect(totalAfterCoupon).toBeLessThan(totalWithCoupon);

      component.removeCoupon();
      component.calculateTotals();

      expect(component.totalAmount).toBeGreaterThan(totalAfterCoupon);
    });

    it('should handle quantity changes and totals update', () => {
      const item = component.cartItems[0];
      const initialPrice = component.getItemSubtotal(item);

      component.updateQuantity(item.productId, item.quantity + 2);
      const newPrice = component.getItemSubtotal(item);

      expect(newPrice).toBeGreaterThan(initialPrice);
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
