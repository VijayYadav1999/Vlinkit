import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CartItem {
  productId: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  quantity: number;
  maxQuantity: number;
  inStock: boolean;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

const TAX_RATE = 0.05;
const DELIVERY_FEE = 50;
const STORAGE_KEY = 'vlinkit_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<Cart>(this.emptyCart());
  private itemCountSubject = new BehaviorSubject<number>(0);

  cart$: Observable<Cart> = this.cartSubject.asObservable();
  itemCount$: Observable<number> = this.itemCountSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  getCart(): Cart {
    return this.cartSubject.value;
  }

  addToCart(product: {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    category: string;
    in_stock?: boolean;
  }): void {
    const existing = this.cartItems.find(
      (item) => item.productId === product.id
    );

    if (existing) {
      if (existing.quantity < existing.maxQuantity) {
        existing.quantity++;
      }
    } else {
      this.cartItems.push({
        productId: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
        category: product.category,
        quantity: 1,
        maxQuantity: 10,
        inStock: product.in_stock !== false,
      });
    }

    this.recalculate();
  }

  removeItem(productId: string): void {
    this.cartItems = this.cartItems.filter(
      (item) => item.productId !== productId
    );
    this.recalculate();
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const item = this.cartItems.find((i) => i.productId === productId);
    if (item) {
      item.quantity = Math.min(quantity, item.maxQuantity);
      this.recalculate();
    }
  }

  incrementQuantity(productId: string): void {
    const item = this.cartItems.find((i) => i.productId === productId);
    if (item && item.quantity < item.maxQuantity) {
      item.quantity++;
      this.recalculate();
    }
  }

  decrementQuantity(productId: string): void {
    const item = this.cartItems.find((i) => i.productId === productId);
    if (item) {
      if (item.quantity > 1) {
        item.quantity--;
        this.recalculate();
      } else {
        this.removeItem(productId);
      }
    }
  }

  clearCart(): void {
    this.cartItems = [];
    this.recalculate();
  }

  getItemQuantity(productId: string): number {
    const item = this.cartItems.find((i) => i.productId === productId);
    return item ? item.quantity : 0;
  }

  isInCart(productId: string): boolean {
    return this.cartItems.some((i) => i.productId === productId);
  }

  private recalculate(): void {
    const items = [...this.cartItems];
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const cart: Cart = {
      items,
      itemCount,
      subtotal,
      tax,
      deliveryFee,
      discount: 0,
      total: Math.round((subtotal + tax + deliveryFee) * 100) / 100,
    };

    this.cartSubject.next(cart);
    this.itemCountSubject.next(itemCount);
    this.saveToStorage();
  }

  private emptyCart(): Cart {
    return {
      items: [],
      itemCount: 0,
      subtotal: 0,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      total: 0,
    };
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cartItems));
    } catch (e) {
      // storage full or unavailable
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.cartItems = JSON.parse(stored);
        this.recalculate();
      }
    } catch (e) {
      this.cartItems = [];
    }
  }
}
