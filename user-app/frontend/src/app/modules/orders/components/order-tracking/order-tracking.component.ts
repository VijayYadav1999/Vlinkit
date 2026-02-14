import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

export interface OrderLocation {
  orderId: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed: number;
}

export interface Order {
  orderId: string;
  status: 'CONFIRMED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  deliveryAddress: string;
  estimatedDeliveryTime: Date;
  items: string[];
  totalAmount: number;
  paymentMethod: string;
  specialInstructions?: string;
}

export interface DeliveryStatus {
  status: string;
  timestamp: Date;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-order-tracking',
  templateUrl: './order-tracking.component.html',
  styleUrls: ['./order-tracking.component.css'],
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  // Order Data
  order: Order | null = null;
  orderLocation: OrderLocation | null = null;
  deliveryStatuses: DeliveryStatus[] = [];

  // Map Data
  userLocation: { lat: number; lon: number } = { lat: 12.9716, lon: 77.5946 }; // Bangalore
  mapCenter: { lat: number; lon: number };
  mapZoom: number = 14;
  markerRoute: { lat: number; lon: number }[] = [];

  // ETA Calculation
  estimatedTimeMinutes: number = 0;
  estimatedDeliveryTime: Date;
  distanceKm: number = 0;

  // States
  isLoading: boolean = false;
  error: string = '';
  trackingActive: boolean = false;
  showMap: boolean = true;
  showTimeline: boolean = true;

  // WebSocket
  webSocketConnected: boolean = false;
  reconnectAttempts: number = 0;
  maxReconnectAttempts: number = 5;

  // Driver Info
  driverPhoneVisible: boolean = false;
  driverPhone: string = '+91-XXXXXX9876';

  private destroy$ = new Subject<void>();
  private locationUpdateInterval: any;

  constructor() {
    this.mapCenter = { ...this.userLocation };
  }

  ngOnInit(): void {
    this.loadOrder();
    this.initializeWebSocket();
    this.startLocationTracking();
  }

  ngOnDestroy(): void {
    this.stopLocationTracking();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrder(): void {
    this.isLoading = true;
    this.error = '';

    // Mock order data - would fetch from service
    this.order = {
      orderId: 'ORD-2024-001234',
      status: 'IN_DELIVERY',
      deliveryAddress: '123 Main Street, Apt 4B, Bangalore 560001',
      estimatedDeliveryTime: new Date(Date.now() + 20 * 60000),
      items: [
        'Basmati Rice (2kg)',
        'Fresh Milk (1L)',
        'Chicken Breast (500g)',
      ],
      totalAmount: 667.5,
      paymentMethod: 'Credit Card',
      specialInstructions: 'Ring bell twice before handing over',
    };

    // Initialize delivery statuses
    this.initializeDeliveryStatuses();

    // Mock location data
    this.orderLocation = {
      orderId: 'ORD-2024-001234',
      driverId: 'DRV-2024-00567',
      driverName: 'Raj Kumar',
      driverRating: 4.8,
      latitude: 12.9352,
      longitude: 77.6245,
      timestamp: new Date(),
      speed: 25,
    };

    this.calculateETA();
    this.isLoading = false;
    this.trackingActive = true;
  }

  initializeDeliveryStatuses(): void {
    const now = new Date();
    const confirmedTime = new Date(now.getTime() - 45 * 60000);
    const assignedTime = new Date(now.getTime() - 30 * 60000);
    const pickedUpTime = new Date(now.getTime() - 15 * 60000);

    this.deliveryStatuses = [
      {
        status: 'CONFIRMED',
        timestamp: confirmedTime,
        description: 'Your order has been confirmed',
        icon: '✓',
      },
      {
        status: 'ASSIGNED',
        timestamp: assignedTime,
        description: 'Driver has been assigned',
        icon: '👤',
      },
      {
        status: 'PICKED_UP',
        timestamp: pickedUpTime,
        description: 'Items have been picked up from store',
        icon: '📦',
      },
      {
        status: 'IN_DELIVERY',
        timestamp: now,
        description: 'Driver is on the way to your location',
        icon: '🚗',
      },
    ];
  }

  initializeWebSocket(): void {
    // Mock WebSocket initialization
    console.log('Initializing WebSocket connection...');
    this.connectWebSocket();
  }

  connectWebSocket(): void {
    try {
      // Mock WebSocket connection
      this.webSocketConnected = true;
      this.reconnectAttempts = 0;
      console.log('WebSocket connected');

      // Subscribe to location updates
      this.subscribeToLocationUpdates();
    } catch (error) {
      this.handleWebSocketError();
    }
  }

  handleWebSocketError(): void {
    this.webSocketConnected = false;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;

      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connectWebSocket();
      }, delay);
    } else {
      this.error = 'Unable to connect to tracking service. Using fallback mode.';
    }
  }

  subscribeToLocationUpdates(): void {
    // Mock location update subscription
    // In real app, would subscribe to WebSocket events
    this.locationUpdateInterval = setInterval(() => {
      if (this.orderLocation) {
        // Simulate driver movement towards destination
        this.orderLocation.latitude += (Math.random() - 0.5) * 0.001;
        this.orderLocation.longitude += (Math.random() - 0.5) * 0.001;
        this.orderLocation.timestamp = new Date();
        this.orderLocation.speed = Math.random() * 40 + 10; // 10-50 km/h

        this.calculateETA();
        this.updateRouteMarker();
      }
    }, 5000);
  }

  startLocationTracking(): void {
    // Start tracking location updates
    if (!this.locationUpdateInterval) {
      this.subscribeToLocationUpdates();
    }
  }

  stopLocationTracking(): void {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
  }

  calculateETA(): void {
    if (!this.orderLocation) return;

    // Calculate distance using Haversine formula
    this.distanceKm = this.haversineDistance(
      this.userLocation.lat,
      this.userLocation.lon,
      this.orderLocation.latitude,
      this.orderLocation.longitude
    );

    // Estimate time based on distance and average speed
    const avgSpeed = 20; // km/h
    this.estimatedTimeMinutes = Math.ceil((this.distanceKm / avgSpeed) * 60);

    // Set estimated delivery time
    this.estimatedDeliveryTime = new Date(
      Date.now() + this.estimatedTimeMinutes * 60000
    );
  }

  haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  updateRouteMarker(): void {
    if (
      this.orderLocation &&
      this.markerRoute.length === 0 ||
      this.markerRoute[this.markerRoute.length - 1].lat !==
      this.orderLocation.latitude
    ) {
      this.markerRoute.push({
        lat: this.orderLocation.latitude,
        lon: this.orderLocation.longitude,
      });

      // Keep only last 20 positions for performance
      if (this.markerRoute.length > 20) {
        this.markerRoute.shift();
      }

      // Update map center to follow driver
      this.mapCenter = {
        lat: this.orderLocation.latitude,
        lon: this.orderLocation.longitude,
      };
    }
  }

  togglePhoneVisibility(): void {
    this.driverPhoneVisible = !this.driverPhoneVisible;
  }

  callDriver(): void {
    if (this.orderLocation?.driverId) {
      console.log(`Calling driver ${this.orderLocation.driverName}...`);
      // In real app, would initiate call or show calling protocol
    }
  }

  contactSupport(): void {
    console.log('Contacting support...');
    // Would open support chat or contact form
  }

  cancelOrder(): void {
    if (
      this.order?.status !== 'DELIVERED' &&
      this.order?.status !== 'CANCELLED'
    ) {
      if (confirm('Are you sure you want to cancel this order?')) {
        this.order.status = 'CANCELLED';
        this.trackingActive = false;
        this.stopLocationTracking();
        console.log('Order cancelled');
      }
    }
  }

  shareOrder(): void {
    const trackingLink = `https://vlinkit.com/track/${this.order?.orderId}`;
    if (navigator.share) {
      navigator.share({
        title: 'Track My Order',
        text: `Track my Vlinkit order: ${this.order?.orderId}`,
        url: trackingLink,
      });
    } else {
      console.log('Sharing not supported. Link:', trackingLink);
    }
  }

  getRemainingTime(): string {
    if (!this.estimatedDeliveryTime) return '';

    const now = new Date();
    const diff = this.estimatedDeliveryTime.getTime() - now.getTime();

    if (diff <= 0) return 'Arriving now';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      CONFIRMED: '✓',
      ASSIGNED: '👤',
      PICKED_UP: '📦',
      IN_DELIVERY: '🚗',
      DELIVERED: '✓✓',
      CANCELLED: '✗',
    };
    return icons[status] || '•';
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      CONFIRMED: '#28a745',
      ASSIGNED: '#or else #667eea',
      PICKED_UP: '#ffc107',
      IN_DELIVERY: '#17a2b8',
      DELIVERED: '#28a745',
      CANCELLED: '#dc3545',
    };
    return colors[status] || '#999';
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  isOrderDelivered(): boolean {
    return this.order?.status === 'DELIVERED';
  }

  canShowPhone(): boolean {
    return (
      this.orderLocation !== null &&
      (this.order?.status === 'ASSIGNED' ||
        this.order?.status === 'PICKED_UP' ||
        this.order?.status === 'IN_DELIVERY')
    );
  }

  toggleMapView(): void {
    this.showMap = !this.showMap;
  }

  toggleTimelineView(): void {
    this.showTimeline = !this.showTimeline;
  }
}
