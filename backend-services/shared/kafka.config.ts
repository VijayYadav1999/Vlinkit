/**
 * Vlinkit Kafka Configuration
 *
 * Shared Kafka topic definitions and configuration.
 * Used by: User Service, Order Service, Driver Service, WebSocket Server
 */

export const KAFKA_CONFIG = {
  clientId: 'vlinkit',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
};

/* ─── Topic Definitions ────────────────────────────────────── */
export const KAFKA_TOPICS = {
  // Order Events
  ORDER_CREATED: 'order.created',       // Order Service → Driver Service
  ORDER_ASSIGNED: 'order.assigned',     // Driver Service → Order Service, WebSocket
  ORDER_STATUS: 'order.status',         // Driver Service → WebSocket → User App
  ORDER_COMPLETED: 'order.completed',   // Driver Service → Order Service

  // Payment Events
  PAYMENT_COMPLETED: 'payment.completed', // Order Service → Driver Service
  PAYMENT_FAILED: 'payment.failed',       // Order Service → Error handling

  // Driver Events
  DRIVER_NOTIFICATION: 'driver.notification', // Driver Service → WebSocket → Driver App
  DRIVER_LOCATION: 'driver.location',         // Driver Service → WebSocket → User App
  DRIVER_UNAVAILABLE: 'driver.unavailable',   // Driver Service → Order Service

  // Notifications
  USER_NOTIFICATION: 'user.notification',   // Any service → Notification Service
};

/* ─── Consumer Groups ──────────────────────────────────────── */
export const CONSUMER_GROUPS = {
  ORDER_SERVICE: 'order-service-group',
  DRIVER_SERVICE: 'driver-service-group',
  WEBSOCKET_BRIDGE: 'websocket-bridge-group',
  NOTIFICATION_SERVICE: 'notification-service-group',
};

/* ─── Event Payloads (TypeScript interfaces) ───────────────── */
export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; name: string; quantity: number; price: number }>;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: { address: string; latitude: number; longitude: number };
  pickupAddress: { address: string; latitude: number; longitude: number };
  createdAt: string;
}

export interface OrderAssignedEvent {
  orderId: string;
  driverId: string;
  assignedAt: string;
}

export interface OrderStatusEvent {
  orderId: string;
  driverId: string;
  status: 'accepted' | 'picked_up' | 'on_the_way' | 'arrived' | 'delivered';
  timestamp: string;
}

export interface PaymentCompletedEvent {
  orderId: string;
  paymentId: string;
  amount: number;
  method: string;
  completedAt: string;
}

export interface DriverLocationEvent {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface DriverNotificationEvent {
  driverId: string;
  type: 'new_order_offer' | 'order_cancelled' | 'bonus_earned';
  orderId?: string;
  estimatedDistance?: number;
  deliveryFee?: number;
  message?: string;
}
