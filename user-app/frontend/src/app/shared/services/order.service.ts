import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateOrderDto {
  delivery_address: {
    address_line_1: string;
    city: string;
    state: string;
    postal_code: string;
    latitude: number;
    longitude: number;
  };
  items?: { productId: string; name: string; price: number; quantity: number; image_url?: string }[];
  special_instructions?: string;
}

export interface Order {
  _id?: string;
  order_number: string;
  user_id: string;
  status: string;
  items: any[];
  total_amount: number;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private http: HttpClient) {}

  createOrder(orderData: CreateOrderDto): Observable<Order> {
    return this.http.post<Order>(`${environment.orderServiceUrl}/orders`, orderData);
  }

  confirmPayment(orderId: string, paymentIntentId: string): Observable<any> {
    return this.http.post(`${environment.orderServiceUrl}/payments/confirm`, {
      order_id: orderId,
      payment_intent_id: paymentIntentId
    });
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${environment.orderServiceUrl}/orders`);
  }

  getOrderById(id: string): Observable<Order> {
    return this.http.get<Order>(`${environment.orderServiceUrl}/orders/${id}`);
  }
}
