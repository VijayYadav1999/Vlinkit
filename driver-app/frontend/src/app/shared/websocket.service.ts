import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private driverSocket: Socket | null = null;
  private orderOffers$ = new Subject<any>();
  private statusUpdates$ = new Subject<any>();

  constructor(private auth: AuthService) {}

  connect(): void {
    const token = this.auth.getToken();
    if (!token || this.driverSocket?.connected) return;

    this.driverSocket = io(`${environment.wsUrl}/driver`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    this.driverSocket.on('connect', () => {
      console.log('[WS] Driver connected');
    });

    this.driverSocket.on('order:new_offer', (data: any) => {
      this.orderOffers$.next(data);
    });

    this.driverSocket.on('order:status_update', (data: any) => {
      this.statusUpdates$.next(data);
    });

    this.driverSocket.on('disconnect', () => {
      console.log('[WS] Driver disconnected');
    });
  }

  disconnect(): void {
    this.driverSocket?.disconnect();
    this.driverSocket = null;
  }

  getOrderOffers(): Observable<any> {
    return this.orderOffers$.asObservable();
  }

  getStatusUpdates(): Observable<any> {
    return this.statusUpdates$.asObservable();
  }

  /** Send location update to server */
  sendLocationUpdate(latitude: number, longitude: number): void {
    this.driverSocket?.emit('location:update', { latitude, longitude });
  }

  /** Notify server that driver accepted a delivery */
  acceptDelivery(orderId: string): void {
    this.driverSocket?.emit('delivery:accept', orderId);
  }

  /** Send delivery status update */
  sendDeliveryStatus(orderId: string, status: string): void {
    this.driverSocket?.emit('delivery:status', { orderId, status });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
